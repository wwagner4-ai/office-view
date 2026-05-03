import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import mam from "mammoth";
import axios from "axios";
import * as ax from "axios";
import FormData from "form-data";
import * as hlp from "./helper";
import * as stat from "./statistics";

const actionWrapper = (fn: (...args: any[]) => Promise<any>) => {
  const handleError = (error: any) => {
    if (error instanceof Error) {
      console.error(error.stack);
    } else {
      console.error("ERROR", error);
    }
  };

  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
};

const program = new Command();

program
  .name("vo")
  .description("CLI for fetching random trivia questions")
  .version("1.0.0");

program
  .description("Process all files in the test-data directory")
  .action(actionWrapper(processFiles));

program.parse();

async function processFiles() {
  const ts = hlp.getTimestamp();
  const id = hlp.getId();
  const homeDir = os.homedir();
  const outPath = path.join(
    homeDir,
    "tmp",
    "office-view",
    "out",
    `${ts}-${id}`,
  );
  fs.mkdirSync(outPath, { recursive: true });
  //console.log(`Create out dir ${outPath}`);

  const directoryPath = path.join(process.cwd(), "test-data");
  if (!fs.existsSync(directoryPath)) {
    console.error(`Error: Directory '${directoryPath}' does not exist.`);
    return;
  }

  const files = fs.readdirSync(directoryPath);

  if (files.length === 0) {
    console.log("The directory is empty.");
  } else {
    let results: Array<hlp.Result> = [];
    for (const file of files) {
      const rs = await processFile(directoryPath, file, outPath, ts);
      results.push(...rs);
    }
    stat.printStatistics(results);
  }
}

async function processFile(
  dir: string,
  fileName: string,
  outDir: string,
  ts: string,
): Promise<Array<hlp.Result>> {
  const file = path.join(dir, fileName);
  const buf = await readFile(file);
  let results: Array<hlp.Result> = [];
  results.push(await createHtmlMammoth(fileName, buf, outDir, ts));
  await hlp.sleep(500);
  results.push(await createPdfGotenberg(fileName, buf, outDir, ts));
  await hlp.sleep(500);
  return results;
}

async function createHtmlMammoth(
  fileName: string,
  document: Buffer,
  outDir: string,
  ts: string,
): Promise<hlp.Result> {
  try {
    const rtResult: hlp.RuntimeResult<any> = await hlp.measureRuntime(
      mam.convertToHtml,
      { buffer: document },
    );
    const name = path.parse(fileName).name;
    const id = hlp.getId();
    const outFile = path.join(outDir, `mammoth-${name}.html`);
    writeFile(outFile, rtResult.result.value);
    console.log(`mammoth   SUCCESS ${outFile}`);
    return {
      file_name: fileName,
      method: "mammoth",
      ok: true,
      time_ms: rtResult.duration,
      outFile: outFile,
    } as hlp.Result;
  } catch (error) {
    console.error(`mammoth   ERROR   ${fileName}'. ${error}`.slice(0, 100));
    return {
      file_name: fileName,
      method: "mammoth",
      ok: false,
      message: `${error}`,
    } as hlp.Result;
  }
}

async function createPdfGotenberg(
  fileName: string,
  docBuffer: Buffer,
  outDir: string,
  ts: string,
): Promise<hlp.Result> {
  const gotenbergUrl = "http://localhost:3000/forms/libreoffice/convert";

  const form = new FormData();

  // WICHTIG: Der dritte Parameter { filename: '...' } ist entscheidend,
  // damit LibreOffice die Dateiendung erkennt!
  form.append("files", docBuffer, { filename: fileName });
  try {
    const rtResult: hlp.RuntimeResult<ax.AxiosResponse> =
      await hlp.measureRuntime(axios.post, gotenbergUrl, form, {
        headers: { ...form.getHeaders() },
        responseType: "arraybuffer",
      });

    const name = path.parse(fileName).name;
    const id = hlp.getId();
    const outputPdfPath = path.join(outDir, `gotenberg-${name}.pdf`);
    await writeFile(outputPdfPath, rtResult.result.data);
    console.log(`gotenberg SUCCESS ${outputPdfPath}`);
    return {
      file_name: fileName,
      method: "gotenberg",
      ok: true,
      time_ms: rtResult.duration,
      outFile: outputPdfPath,
    } as hlp.Result;
  } catch (error) {
    let message = "undefined";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = `${error}`;
    }
    console.error(`gotenberg ERROR ${fileName}`, message);
    return {
      file_name: fileName,
      method: "gotenberg",
      ok: false,
      message: message,
    } as hlp.Result;
  }
}

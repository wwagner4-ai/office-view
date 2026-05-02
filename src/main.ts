import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import mammoth from "mammoth";
import axios from "axios";
import FormData from "form-data";
import * as hlp from "./helper";

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
  const homeDir = os.homedir();
  const outPath = path.join(homeDir, "tmp", "office-view", "out");
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
    for (const file of files) {
      await processFile(directoryPath, file, outPath, ts);
    }
  }
}

async function processFile(
  dir: string,
  fileName: string,
  outDir: string,
  ts: string,
) {
  const file = path.join(dir, fileName);
  const buf = await readFile(file);
  await createHtmlMammoth(fileName, buf, outDir, ts);
  await createPdfGotenberg(fileName, buf, outDir, ts);
}

async function createHtmlMammoth(
  fileName: string,
  document: Buffer,
  outDir: string,
  ts: string,
) {
  let content = "";
  let label = "";
  try {
    const mamResult = await mammoth.convertToHtml({ buffer: document });
    const name = path.parse(fileName).name;
    const id = hlp.getId();
    const outFile = path.join(
      outDir,
      `${name}-${ts}-mammoth-${id}${label}.html`,
    );
    writeFile(outFile, mamResult.value);
    console.log(`mammoth SUCCESS ${outFile}`);
  } catch (error) {
    console.error(`mammoth ERROR ${fileName}'. ${error}`);
  }
}

async function createPdfGotenberg(
  fileName: string,
  docBuffer: Buffer,
  outDir: string,
  ts: string,
) {
  const gotenbergUrl = "http://localhost:3000/forms/libreoffice/convert";

  const form = new FormData();

  // WICHTIG: Der dritte Parameter { filename: '...' } ist entscheidend,
  // damit LibreOffice die Dateiendung erkennt!
  form.append("files", docBuffer, { filename: fileName });
  try {
    const response = await axios.post(gotenbergUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      responseType: "arraybuffer",
    });
    const name = path.parse(fileName).name;
    const id = hlp.getId();
    const outputPdfPath = path.join(
      outDir,
      `${name}-${ts}-gotenberg-${id}.pdf`,
    );
    await writeFile(outputPdfPath, response.data);
    console.log(`gotenberg SUCCESS ${outputPdfPath}`);
  } catch (error) {
    let message = "undefined";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = `${error}`;
    }

    console.error(`gotenberg ERROR ${fileName}`, message);
  }
}

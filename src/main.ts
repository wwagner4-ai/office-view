import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import mammoth from "mammoth";
import { randomBytes } from "node:crypto";

const handleError = (error: any) => {
  if (error instanceof Error) {
    console.error(error.stack);
  } else {
    console.error("ERROR", error);
  }
};

const actionWrapper = (fn: (...args: any[]) => Promise<any>) => {
  return async (...args: any[]) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
};

function getTimestamp(): string {
  const now = new Date();

  const parts = {
    yy: now.getFullYear().toString().slice(-2),
    mm: (now.getMonth() + 1).toString().padStart(2, "0"),
    dd: now.getDate().toString().padStart(2, "0"),
    hh: now.getHours().toString().padStart(2, "0"),
    min: now.getMinutes().toString().padStart(2, "0"),
    ss: now.getSeconds().toString().padStart(2, "0"),
  };
  return `${parts.yy}${parts.mm}${parts.dd}${parts.hh}${parts.min}${parts.ss}`;
}

const program = new Command();

program
  .name("vo")
  .description("CLI for fetching random trivia questions")
  .version("1.0.0");

program
  .command("fetch")
  .description("Fetch a random trivia question")
  .action(actionWrapper(fetchTrivia));

program
  .command("process-files")
  .description("Process all files in the test-data directory")
  .action(actionWrapper(processFiles));

program.parse();

async function processFiles() {
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
      await processFile(directoryPath, file, outPath);
    }
  }
}

async function processFile(dir: string, fileName: string, outDir: string) {
  const file = path.join(dir, fileName);
  const buf = await readFile(file);
  await createHtmlMammoth(path.parse(fileName).name, buf, outDir);
}

async function createHtmlMammoth(
  name: string,
  document: Buffer,
  outDir: string,
) {
  let content = "";
  try {
    const mamResult = await mammoth.convertToHtml({ buffer: document });
    content = mamResult.value;
  } catch (error) {
    content = `<html><body><h1>Cannot create html for '${name}'. ${error}</h1></body></html>`;
  }
  const ts = getTimestamp();
  const id = Math.random().toString(36).substring(2, 10);
  const outFile = path.join(outDir, `${name}-${ts}-${id}.html`);
  writeFile(outFile, content);
  console.log(`Wrote to: ${outFile}`);
}

async function fetchTrivia() {
  const response = await fetch("https://opentdb.com/api.php?amount=1");
  const data = await response.json();
  const question = data.results[0];

  console.log(`Category: ${question.category}`);
  console.log(`Type: ${question.type}`);
  console.log(`Difficulty: ${question.difficulty}`);
  console.log(`Question: ${question.question}`);

  if (question.type === "multiple") {
    console.log(
      `Options: ${question.incorrect_answers.concat(question.correct_answer).join(", ")}`,
    );
  }

  console.log(`Answer: ${question.correct_answer}`);
}

import { Command } from "commander";
import * as fs from "node:fs"
import * as path from "node:path";

// Eine zentrale Funktion für alle Fehlermeldungen
const handleError = (error: any) => {
  console.error("❌ [CLI-Error]:", error.message || error);
  process.exit(1); // Beendet das Programm sauber mit einem Fehlercode
};

// Der Wrapper
const actionWrapper = (fn: (...args: any[]) => Promise<any>) => {
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
  .command("fetch")
  .description("Fetch a random trivia question")
  .action(actionWrapper(fetchTrivia));


program
  .command("list-files")
  .description("List all files in the test-data directory")
  .action(actionWrapper(listFiles));

program.parse();

async function listFiles() {
      // Prüfen, ob der Ordner existiert
      const directoryPath = path.join(process.cwd(), "test-data");
      if (!fs.existsSync(directoryPath)) {
        console.error(`Error: Directory '${directoryPath}' does not exist.`);
        return;
      }

      const files = fs.readdirSync(directoryPath);

      if (files.length === 0) {
        console.log("The directory is empty.");
      } else {
        console.log("Files in 'test-data':");
        files.forEach((file) => console.log(` - ${file}`));
      }
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

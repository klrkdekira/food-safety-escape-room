import fs from "node:fs";
import path from "node:path";
import { QuizSchema } from "../src/schema/quiz.ts";

function validateFile(filePath: string): boolean {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  let jsonContent: unknown;
  try {
    const raw = fs.readFileSync(absolutePath, "utf-8");
    jsonContent = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ JSON parse error in ${filePath}:`, err);
    return false;
  }

  const result = QuizSchema.safeParse(jsonContent);
  if (!result.success) {
    console.error(`❌ Validation failed for ${filePath}:`);
    for (const issue of result.error.issues) {
      const pathStr = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      console.error(`  - [${pathStr}]: ${issue.message}`);
    }
    return false;
  }

  console.log(`✅ Success! ${filePath} is valid.`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  let targetFiles: string[] = args;

  if (targetFiles.length === 0) {
    const dir = path.resolve("public/quizzes");
    if (fs.existsSync(dir)) {
      targetFiles = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json") && f !== "index.json")
        .map((f) => path.join("public/quizzes", f));
    }
  }

  let allValid = true;
  for (const file of targetFiles) {
    const valid = validateFile(file);
    if (!valid) {
      allValid = false;
    }
  }

  if (!allValid) {
    process.exit(1);
  }
}

main();

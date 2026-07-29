import fs from "node:fs";
import path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BaseQuizSchema } from "../src/schema/quiz.ts";

function main() {
  const jsonSchema = zodToJsonSchema(BaseQuizSchema, {
    target: "jsonSchema7",
    $refStrategy: "none",
  });

  const targetPath = path.resolve("schema.json");
  fs.writeFileSync(targetPath, JSON.stringify(jsonSchema, null, 2) + "\n");
  console.log(`✅ Generated schema.json at ${targetPath}`);
}

main();

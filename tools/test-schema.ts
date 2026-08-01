import fs from "node:fs";
import path from "node:path";
import { QuizSchema } from "../src/schema/quiz.ts";

function fixture(): Record<string, any> {
  const file = path.resolve("public/quizzes/food-kitchen.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, any>;
}

function expectInvalid(label: string, mutate: (quiz: Record<string, any>) => void): void {
  const quiz = fixture();
  mutate(quiz);
  if (QuizSchema.safeParse(quiz).success) {
    throw new Error(`${label}: expected validation to fail`);
  }
}

function expectValid(label: string, mutate?: (quiz: Record<string, any>) => void): void {
  const quiz = fixture();
  mutate?.(quiz);
  if (!QuizSchema.safeParse(quiz).success) {
    throw new Error(`${label}: expected validation to pass`);
  }
}

expectValid("current food-kitchen fixture");
expectInvalid("non-contiguous rooms", (quiz) => {
  quiz.roomData["5"] = quiz.roomData["4"];
  quiz.roomCodes["5"] = quiz.roomCodes["4"];
});
expectInvalid("missing room code", (quiz) => {
  delete quiz.roomCodes["4"];
});
expectInvalid("negative hint limit", (quiz) => {
  quiz.state.maxHints = -1;
});
expectInvalid("unattributed HTTPS artwork", (quiz) => {
  quiz.roomData["1"].imageUrl = "https://example.test/artwork.png";
});
expectInvalid("duplicate option key", (quiz) => {
  quiz.puzzleData["2"].options[1].key = quiz.puzzleData["2"].options[0].key;
});
expectInvalid("incomplete match answer", (quiz) => {
  const match = Object.values(quiz.puzzleData).find(
    (puzzle: any) => puzzle.type === "match",
  ) as any;
  match.correct = {};
});

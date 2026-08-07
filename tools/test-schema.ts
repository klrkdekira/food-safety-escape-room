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
expectInvalid("insecure HTTP artwork", (quiz) => {
  quiz.roomData["1"].imageUrl = "http://example.test/artwork.png";
  quiz.roomData["1"].imageAttribution = "Example artwork";
});
expectValid("attributed HTTPS artwork", (quiz) => {
  quiz.roomData["1"].imageUrl = "https://example.test/artwork.png";
  quiz.roomData["1"].imageAttribution = "Example artwork";
});
expectValid("site-local artwork without attribution", (quiz) => {
  quiz.roomData["1"].imageUrl = "/images/artwork.png";
});
expectInvalid("unattributed HTTPS background music", (quiz) => {
  quiz.config.musicUrl = "https://example.test/track.mp3";
  delete quiz.config.musicAttribution;
});
expectInvalid("insecure HTTP background music", (quiz) => {
  quiz.config.musicUrl = "http://example.test/track.mp3";
  quiz.config.musicAttribution = "Example track";
});
expectInvalid("music volume out of range", (quiz) => {
  quiz.config.musicVolume = 1.5;
});
expectValid("attributed HTTPS background music", (quiz) => {
  quiz.config.musicUrl = "https://example.test/track.mp3";
  quiz.config.musicAttribution = "Example track";
});
expectValid("site-local background music without attribution", (quiz) => {
  quiz.config.musicUrl = "/audio/track.mp3";
  delete quiz.config.musicAttribution;
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

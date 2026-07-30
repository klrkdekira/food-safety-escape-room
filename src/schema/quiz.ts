import { z } from "zod";

// Option item schemas
export const OptionItemSchema = z.object({
  key: z.string(),
  text: z.string(),
});

export const DragItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const MatchItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

// Common fields across all puzzle types
const BasePuzzleSchema = z.object({
  room: z.number().int(),
  points: z.number().int(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  title: z.string(),
  question: z.string(),
});

// Individual Puzzle Schemas
export const McqPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("mcq"),
  options: z.array(OptionItemSchema),
  correct: z.string(),
});

export const MultiselectPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("multiselect"),
  options: z.array(OptionItemSchema),
  correct: z.array(z.string()),
});

export const OrderPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("order"),
  items: z.array(DragItemSchema),
  correctOrder: z.array(z.string()),
});

export const MatchPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("match"),
  leftItems: z.array(MatchItemSchema),
  rightItems: z.array(MatchItemSchema),
  correct: z.record(z.string(), z.string()),
});

// Discriminated union of puzzle types
export const PuzzleSchema = z.discriminatedUnion("type", [
  McqPuzzleSchema,
  MultiselectPuzzleSchema,
  OrderPuzzleSchema,
  MatchPuzzleSchema,
]);

export type Puzzle = z.infer<typeof PuzzleSchema>;

export const ThemeSchema = z.enum(["cyberpunk", "sugary", "laboratory", "retro"]).optional();
export type VisualTheme = z.infer<typeof ThemeSchema>;

export const RankThresholdsSchema = z
  .array(z.object({ min: z.number(), rank: z.string().min(1) }))
  .min(1)
  .optional();

// Config Schema
export const ConfigSchema = z.object({
  pageTitle: z.string(),
  titleLogo: z.string(),
  titleSub: z.string(),
  theme: ThemeSchema,
  wrongPenalty: z.number().int().default(0).optional(),
  rankMode: z.enum(["absolute", "percent"]).default("absolute").optional(),
  roomLabel: z.string().default("Room").optional(),
  // Victory rank bands. Highest `min` first; the engine takes the first match
  // and falls back to "E". Omit to use the engine defaults.
  absoluteRanks: RankThresholdsSchema,
  percentRanks: RankThresholdsSchema,
  minimapTitle: z.string(),
  minimapRooms: z.array(z.string()),
  missionBriefingTitle: z.string(),
  missionBriefingText: z.string(),
  finalEscapeTerminalTitle: z.string().optional(),
  finalEscapeTerminalText: z.string().optional(),
  finalCode: z.string().optional(),
  victoryTitle: z.string().optional(),
  victorySubtitle: z.string().optional(),
  victoryText: z.string().optional(),
  version: z.string().optional(),
});

// Room Data Schema
export const RoomDataSchema = z.object({
  number: z.string(),
  title: z.string(),
  subtitle: z.string(),
  svg: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAttribution: z.string().optional(),
  narrative: z.string(),
  codeHint: z.string().optional(),
});

/**
 * Bump when a change to this schema is not backward compatible. The validator
 * rejects anything newer than it understands, so an old checkout fails loudly
 * on a new quiz file instead of silently dropping fields.
 */
export const CURRENT_SCHEMA_VERSION = 1;

// Complete Base Quiz Schema
export const BaseQuizSchema = z.object({
  schemaVersion: z.number().int().positive().max(CURRENT_SCHEMA_VERSION).optional(),
  config: ConfigSchema,
  state: z.record(z.string(), z.unknown()),
  puzzleData: z.record(z.string(), PuzzleSchema),
  roomCodes: z.record(z.string(), z.string()),
  roomData: z.record(z.string(), RoomDataSchema),
});

// Complete Quiz Schema with Referential Integrity Checks
export const QuizSchema = BaseQuizSchema.superRefine((data, ctx) => {
  // 1. Check finalCode: must be A-Z only
  if (data.config.finalCode && !/^[A-Z]+$/.test(data.config.finalCode)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `finalCode "${data.config.finalCode}" must contain uppercase letters A-Z only`,
      path: ["config", "finalCode"],
    });
  }

  // 2. Check roomCodes: must be A-Z only
  for (const [roomKey, code] of Object.entries(data.roomCodes)) {
    if (!/^[A-Z]+$/.test(code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `roomCode for room ${roomKey} ("${code}") must contain uppercase letters A-Z only`,
        path: ["roomCodes", roomKey],
      });
    }
  }

  // Count puzzles per room to detect empty rooms
  const puzzlesPerRoom = new Map<string, number>();
  for (const roomKey of Object.keys(data.roomData)) {
    puzzlesPerRoom.set(roomKey, 0);
  }

  // 3. Referential integrity checks for puzzles
  for (const [puzzleId, puzzle] of Object.entries(data.puzzleData)) {
    const roomKey = String(puzzle.room);

    // Check puzzle.room exists in roomData and roomCodes
    if (!data.roomData[roomKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Puzzle ${puzzleId} references room ${puzzle.room}, which does not exist in roomData`,
        path: ["puzzleData", puzzleId, "room"],
      });
    }
    if (!data.roomCodes[roomKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Puzzle ${puzzleId} references room ${puzzle.room}, which does not exist in roomCodes`,
        path: ["puzzleData", puzzleId, "room"],
      });
    }

    puzzlesPerRoom.set(roomKey, (puzzlesPerRoom.get(roomKey) ?? 0) + 1);

    // Specific puzzle type validations
    if (puzzle.type === "mcq") {
      const optionKeys = new Set(puzzle.options.map((o) => o.key));
      if (!optionKeys.has(puzzle.correct)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MCQ Puzzle ${puzzleId} correct key "${puzzle.correct}" does not exist in options keys: [${Array.from(optionKeys).join(", ")}]`,
          path: ["puzzleData", puzzleId, "correct"],
        });
      }
    } else if (puzzle.type === "multiselect") {
      const optionKeys = new Set(puzzle.options.map((o) => o.key));
      for (let i = 0; i < puzzle.correct.length; i++) {
        const key = puzzle.correct[i];
        if (!optionKeys.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Multiselect Puzzle ${puzzleId} correct key "${key}" at index ${i} does not exist in options keys: [${Array.from(optionKeys).join(", ")}]`,
            path: ["puzzleData", puzzleId, "correct", i],
          });
        }
      }
    } else if (puzzle.type === "match") {
      const leftIds = new Set(puzzle.leftItems.map((item) => item.id));
      const rightIds = new Set(puzzle.rightItems.map((item) => item.id));

      for (const [lId, rId] of Object.entries(puzzle.correct)) {
        if (!leftIds.has(lId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Match Puzzle ${puzzleId} correct left key "${lId}" does not exist in leftItems ids: [${Array.from(leftIds).join(", ")}]`,
            path: ["puzzleData", puzzleId, "correct", lId],
          });
        }
        if (!rightIds.has(rId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Match Puzzle ${puzzleId} correct right value "${rId}" for left key "${lId}" does not exist in rightItems ids: [${Array.from(rightIds).join(", ")}]`,
            path: ["puzzleData", puzzleId, "correct", lId],
          });
        }
      }
    } else if (puzzle.type === "order") {
      const itemIds = puzzle.items.map((item) => item.id);
      const itemIdSet = new Set(itemIds);
      const correctSet = new Set(puzzle.correctOrder);

      const isPermutation =
        puzzle.correctOrder.length === itemIds.length &&
        itemIds.every((id) => correctSet.has(id)) &&
        puzzle.correctOrder.every((id) => itemIdSet.has(id));

      if (!isPermutation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Order Puzzle ${puzzleId} correctOrder [${puzzle.correctOrder.join(", ")}] is not a valid permutation of items ids [${itemIds.join(", ")}]`,
          path: ["puzzleData", puzzleId, "correctOrder"],
        });
      }
    }
  }

  // 4. Check for empty rooms
  for (const [roomKey, count] of puzzlesPerRoom.entries()) {
    if (count === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Room ${roomKey} in roomData has 0 puzzles assigned to it (unreachable code entry)`,
        path: ["roomData", roomKey],
      });
    }
  }
});

export type QuizData = z.infer<typeof QuizSchema>;

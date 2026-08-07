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

// Bloom's Taxonomy cognitive level a puzzle targets, used to gauge which
// levels a student is strong or weak at once the quiz is scored.
export const BloomLevelSchema = z.enum(["remember", "understand", "apply", "analyse", "evaluate"]);
export type BloomLevel = z.infer<typeof BloomLevelSchema>;

/** Bloom levels, lowest to highest cognitive demand, with a display label for each. */
export const BLOOM_LEVELS: { level: BloomLevel; label: string }[] = [
  { level: "remember", label: "Remember" },
  { level: "understand", label: "Understand" },
  { level: "apply", label: "Apply" },
  { level: "analyse", label: "Analyse" },
  { level: "evaluate", label: "Evaluate" },
];

// Common fields across all puzzle types
const BasePuzzleSchema = z.object({
  room: z.number().int(),
  points: z.number().int().positive(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  title: z.string(),
  question: z.string(),
  bloomLevel: BloomLevelSchema,
});

// Individual Puzzle Schemas
export const McqPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("mcq"),
  options: z.array(OptionItemSchema).min(2),
  correct: z.string(),
});

export const MultiselectPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("multiselect"),
  options: z.array(OptionItemSchema).min(2),
  correct: z.array(z.string()).min(1),
});

export const OrderPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("order"),
  items: z.array(DragItemSchema).min(2),
  correctOrder: z.array(z.string()).min(2),
});

export const MatchPuzzleSchema = BasePuzzleSchema.extend({
  type: z.literal("match"),
  leftItems: z.array(MatchItemSchema).min(1),
  rightItems: z.array(MatchItemSchema).min(2),
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
  minimapRooms: z.array(z.string()).min(1),
  missionBriefingTitle: z.string(),
  missionBriefingText: z.string(),
  finalEscapeTerminalTitle: z.string().optional(),
  finalEscapeTerminalText: z.string().optional(),
  finalCode: z.string().optional(),
  victoryTitle: z.string().optional(),
  victorySubtitle: z.string().optional(),
  victoryText: z.string().optional(),
  version: z.string().optional(),
  // Looping background music for the whole playthrough. Same site-local-or-HTTPS
  // rule as room artwork; see the imageUrl precedent below.
  musicUrl: z
    .string()
    .refine((value) => value.startsWith("/") || value.startsWith("https://"), {
      message: "musicUrl must be a site-local path or an HTTPS URL",
    })
    .optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  musicAttribution: z.string().optional(),
});

// Room Data Schema
export const RoomDataSchema = z.object({
  number: z.string(),
  title: z.string(),
  subtitle: z.string(),
  svg: z.string().optional(),
  imageUrl: z
    .string()
    .refine((value) => value.startsWith("/") || value.startsWith("https://"), {
      message: "imageUrl must be a site-local path or an HTTPS URL",
    })
    .optional(),
  imageAttribution: z.string().optional(),
  narrative: z.string(),
  codeHint: z.string().optional(),
});

/**
 * Bump when a change to this schema is not backward compatible. The validator
 * rejects anything newer than it understands, so an old checkout fails loudly
 * on a new quiz file instead of silently dropping fields.
 */
export const CURRENT_SCHEMA_VERSION = 2;

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

  // The player addresses rooms as contiguous numbers from 1 through N.
  const roomKeys = Object.keys(data.roomData);
  const codeKeys = Object.keys(data.roomCodes);
  for (let index = 0; index < roomKeys.length; index++) {
    const expected = String(index + 1);
    if (!data.roomData[expected]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomData keys must be contiguous positive integers starting at 1",
        path: ["roomData"],
      });
      break;
    }
  }
  for (const roomKey of roomKeys) {
    if (!data.roomCodes[roomKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomData and roomCodes must have identical room keys",
        path: ["roomCodes", roomKey],
      });
    }
  }
  for (const roomKey of codeKeys) {
    if (!data.roomData[roomKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "roomData and roomCodes must have identical room keys",
        path: ["roomCodes", roomKey],
      });
    }
  }
  for (const [roomKey, room] of Object.entries(data.roomData)) {
    if (room.imageUrl?.startsWith("https://") && !room.imageAttribution?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTTPS artwork requires imageAttribution",
        path: ["roomData", roomKey, "imageAttribution"],
      });
    }
  }

  if (data.config.musicUrl?.startsWith("https://") && !data.config.musicAttribution?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "HTTPS background music requires musicAttribution",
      path: ["config", "musicAttribution"],
    });
  }

  if (data.config.minimapRooms.length !== roomKeys.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minimapRooms must contain one label for every room",
      path: ["config", "minimapRooms"],
    });
  }

  const maxHints = data.state.maxHints;
  if (maxHints !== undefined && (!Number.isInteger(maxHints) || (maxHints as number) < 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "state.maxHints must be a non-negative integer",
      path: ["state", "maxHints"],
    });
  }

  // Count puzzles per room to detect empty rooms
  const puzzlesPerRoom = new Map<string, number>();
  for (const roomKey of Object.keys(data.roomData)) {
    puzzlesPerRoom.set(roomKey, 0);
  }

  // 3. Referential integrity checks for puzzles
  for (const puzzleId of Object.keys(data.puzzleData)) {
    if (
      !(
        Number.isInteger(Number(puzzleId)) &&
        Number(puzzleId) > 0 &&
        String(Number(puzzleId)) === puzzleId
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "puzzle ids must be positive integer strings",
        path: ["puzzleData", puzzleId],
      });
    }
  }

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
      if (optionKeys.size !== puzzle.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MCQ option keys must be unique",
          path: ["puzzleData", puzzleId, "options"],
        });
      }
      if (!optionKeys.has(puzzle.correct)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MCQ Puzzle ${puzzleId} correct key "${puzzle.correct}" does not exist in options keys: [${Array.from(optionKeys).join(", ")}]`,
          path: ["puzzleData", puzzleId, "correct"],
        });
      }
    } else if (puzzle.type === "multiselect") {
      const optionKeys = new Set(puzzle.options.map((o) => o.key));
      if (optionKeys.size !== puzzle.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiselect option keys must be unique",
          path: ["puzzleData", puzzleId, "options"],
        });
      }
      if (new Set(puzzle.correct).size !== puzzle.correct.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiselect correct keys must be unique",
          path: ["puzzleData", puzzleId, "correct"],
        });
      }
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
      if (leftIds.size !== puzzle.leftItems.length || rightIds.size !== puzzle.rightItems.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Match item ids must be unique",
          path: ["puzzleData", puzzleId],
        });
      }
      for (const leftId of leftIds) {
        if (!(leftId in puzzle.correct)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Match correct must include every left item",
            path: ["puzzleData", puzzleId, "correct"],
          });
          break;
        }
      }

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
      if (itemIdSet.size !== itemIds.length || correctSet.size !== puzzle.correctOrder.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Order item ids and correctOrder ids must be unique",
          path: ["puzzleData", puzzleId, "items"],
        });
      }

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

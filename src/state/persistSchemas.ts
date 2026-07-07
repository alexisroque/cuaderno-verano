import * as z from 'zod'

/**
 * Lightweight zod schemas mirroring `ProfileProgress` and the persisted
 * settings shape (`src/types/progress.ts`, `src/state/settingsStore.ts`).
 * Used only to validate data loaded from IndexedDB before it enters a
 * zustand store: a corrupted or stale blob must never crash hydration, so
 * callers should use `safeParse` and fall back to in-memory defaults on
 * failure (see `hydrateProgress` / `hydrateSettings`).
 */

const AttemptSchema = z.object({
  dateISO: z.string(),
  cardType: z.string(),
  subskill: z.string(),
  correct: z.boolean(),
  hintsUsed: z.number(),
  ms: z.number(),
  difficulty: z.number(),
})

const GemStateSchema = z.object({
  skillId: z.string(),
  level: z.number(),
  progress: z.number(),
})

const StreakSchema = z.object({
  count: z.number(),
  lastDayISO: z.string(),
  graceUsed: z.number(),
})

const PlacedStickerSchema = z.object({
  stickerId: z.string(),
  x: z.number(),
  y: z.number(),
  chapterId: z.string(),
})

const DiaryEntrySchema = z.object({
  dateISO: z.string(),
  promptId: z.string(),
  text: z.string(),
})

export const ProfileProgressSchema = z.object({
  attempts: z.array(AttemptSchema),
  gems: z.record(z.string(), GemStateSchema),
  streak: StreakSchema,
  stickers: z.array(PlacedStickerSchema),
  passportStamps: z.array(z.string()),
  diaryEntries: z.array(DiaryEntrySchema),
  coins: z.number(),
  consumedContent: z.record(z.string(), z.array(z.string())),
  unlockedTreasures: z.array(z.string()),
  // Optional so blobs persisted before this field existed still validate; the
  // store normalizes a missing value to {} on hydration.
  completedCards: z.record(z.string(), z.array(z.string())).default({}),
})

const SubskillAdjustmentSchema = z.object({
  difficultyOffset: z.number(),
  boostUntil: z.string().nullable(),
})

const ChildSettingsSchema = z.object({
  missionSize: z.number(),
  challengeFrequency: z.number(),
  moduleToggles: z.record(z.string(), z.boolean()),
  subskillAdjustments: z.record(z.string(), SubskillAdjustmentSchema),
  weeklyFocus: z.array(z.string()),
})

const VoicePrefsSchema = z.object({
  es: z.string().optional(),
  ca: z.string().optional(),
  en: z.string().optional(),
})

export const PersistedSettingsSchema = z.object({
  pin: z.string().nullable(),
  children: z.object({
    aira: ChildSettingsSchema,
    leo: ChildSettingsSchema,
  }),
  // Optional so blobs persisted before this field existed still validate; the
  // store normalizes a missing value to null on hydration.
  lastExport: z.string().nullable().default(null),
  // Optional so blobs persisted before this field existed still validate; the
  // store normalizes a missing value to {} on hydration.
  voicePrefs: VoicePrefsSchema.default({}),
  // Optional so blobs persisted before this field existed still validate; the
  // store normalizes a missing value to false (silent-by-default) on hydration.
  leoAutoNarration: z.boolean().default(false),
})

import type { ProfileId } from '../state/profileStore'

export type { ProfileId }

export type AiraSkillId =
  | 'calculo'
  | 'problemas'
  | 'ortografia'
  | 'escritura'
  | 'lectura'
  | 'english'
  | 'geografia'
  | 'mundo'

export type LeoSkillId = 'trazos' | 'numeros' | 'english' | 'logica'

export type SkillId = AiraSkillId | LeoSkillId

/** Subskill identifiers, as free-form strings (kept ergonomic, not branded). */
export type SubskillId = string

/**
 * Gem level (Ámbar) at/above which a skill's challenge subskills unlock.
 * Single source of truth: scheduler.ts, surprises.ts, and dayComposerCards.ts
 * all import this instead of keeping their own copy.
 */
export const CHALLENGE_GATE_LEVEL = 2

/** A single learnable subskill within a skill. */
export interface SubskillDef {
  id: SubskillId
  skill: SkillId
  /** Inclusive difficulty bounds on a 1-5 scale. */
  difficultyRange: [number, number]
  /** Marks subskills reserved for kids who are ahead of grade level. */
  challenge?: boolean
  /** Marks subskills that should be sampled less often than their peers. */
  lowWeight?: boolean
}

interface SkillDef {
  id: SkillId
  subskills: Record<SubskillId, SubskillDef>
}

interface ProfileCatalog<Skills extends string> {
  skills: Record<Skills, SkillDef>
}

function subskill(
  id: SubskillId,
  skill: SkillId,
  difficultyRange: [number, number],
  flags: { challenge?: boolean; lowWeight?: boolean } = {},
): SubskillDef {
  return { id, skill, difficultyRange, ...flags }
}

function skill(id: SkillId, subskills: SubskillDef[]): SkillDef {
  return {
    id,
    subskills: Object.fromEntries(subskills.map((s) => [s.id, s])),
  }
}

/** Full skills/subskills catalog for both child profiles. */
export const CATALOG: {
  aira: ProfileCatalog<AiraSkillId>
  leo: ProfileCatalog<LeoSkillId>
} = {
  aira: {
    skills: {
      calculo: skill('calculo', [
        subskill('tablas', 'calculo', [1, 4]),
        subskill('mult-1cifra', 'calculo', [1, 4]),
        subskill('mult-2cifras', 'calculo', [2, 5]),
        subskill('div-resto', 'calculo', [2, 5]),
        subskill('mental', 'calculo', [1, 5]),
        subskill('estimacion', 'calculo', [2, 5]),
        subskill('cajitas', 'calculo', [1, 4]),
        subskill('romanos', 'calculo', [1, 3], { lowWeight: true }),
        subskill('fracciones', 'calculo', [3, 5], { challenge: true }),
        subskill('decimales-dinero', 'calculo', [3, 5], { challenge: true }),
        subskill('hechos-derivados-dec', 'calculo', [3, 5], { challenge: true }),
        subskill('cuadrados', 'calculo', [3, 5], { challenge: true }),
      ]),
      problemas: skill('problemas', [
        subskill('1-paso', 'problemas', [1, 4]),
        subskill('2-pasos', 'problemas', [2, 5]),
        subskill('dato-trampa', 'problemas', [2, 5]),
        subskill('dinero', 'problemas', [1, 4]),
        subskill('tiempo', 'problemas', [1, 4]),
        subskill('medida', 'problemas', [1, 4]),
        subskill('patrones-crecimiento', 'problemas', [2, 5]),
        subskill('proporcionalidad', 'problemas', [3, 5], { challenge: true }),
      ]),
      ortografia: skill('ortografia', [
        subskill('accents-ca', 'ortografia', [1, 5]),
        subskill('b-v', 'ortografia', [1, 5]),
        subskill('essa-sorda', 'ortografia', [1, 5]),
        subskill('apostrof', 'ortografia', [1, 5]),
        subskill('maj', 'ortografia', [1, 5]),
        subskill('puntuacio', 'ortografia', [1, 5]),
      ]),
      escritura: skill('escritura', [subskill('diario', 'escritura', [1, 5])]),
      lectura: skill('lectura', [
        subskill('comprension', 'lectura', [1, 5]),
        subskill('reflexion', 'lectura', [1, 5]),
      ]),
      english: skill('english', [
        subskill('reading', 'english', [1, 5]),
        subskill('vocab', 'english', [1, 5]),
      ]),
      geografia: skill('geografia', [
        subskill('capitales', 'geografia', [1, 5]),
        subskill('banderas', 'geografia', [1, 5]),
        subskill('donde-esta', 'geografia', [1, 5]),
      ]),
      mundo: skill('mundo', [
        subskill('espacio', 'mundo', [1, 5]),
        subskill('como-funciona', 'mundo', [1, 5]),
      ]),
    },
  },
  leo: {
    skills: {
      trazos: skill('trazos', [
        subskill('letras', 'trazos', [1, 3]),
        subskill('numeros-trazo', 'trazos', [1, 3]),
        subskill('espejo', 'trazos', [1, 3]),
      ]),
      numeros: skill('numeros', [
        subskill('contar-6', 'numeros', [1, 3]),
        subskill('descomponer-4-6', 'numeros', [1, 3]),
        subskill('comparar', 'numeros', [1, 3]),
        subskill('contar-20', 'numeros', [2, 4], { challenge: true }),
        subskill('descomponer-7-9', 'numeros', [2, 4], { challenge: true }),
        subskill('dobles', 'numeros', [2, 4], { challenge: true }),
        subskill('mas-menos-1-2', 'numeros', [2, 4], { challenge: true }),
        subskill('simbolos', 'numeros', [2, 4], { challenge: true }),
        subskill('estimar', 'numeros', [2, 4], { challenge: true }),
      ]),
      english: skill('english', [
        subskill('animales', 'english', [1, 3]),
        subskill('colores', 'english', [1, 3]),
        subskill('comida', 'english', [1, 3]),
        subskill('huerto', 'english', [1, 3]),
      ]),
      logica: skill('logica', [
        subskill('patrones', 'logica', [1, 3]),
        subskill('formas', 'logica', [1, 3]),
        subskill('simetria', 'logica', [1, 3]),
        subskill('clasificar', 'logica', [1, 3]),
        subskill('posiciones', 'logica', [1, 3]),
      ]),
    },
  },
}

interface SkillMeta {
  name: string
  emoji: string
}

/** Spanish display name + emoji for each skill, keyed by profile. */
export const SKILL_META: {
  aira: Record<AiraSkillId, SkillMeta>
  leo: Record<LeoSkillId, SkillMeta>
} = {
  aira: {
    calculo: { name: 'Cálculo', emoji: '🔢' },
    problemas: { name: 'Problemas', emoji: '🧩' },
    ortografia: { name: 'Ortografía', emoji: '✏️' },
    escritura: { name: 'Escritura', emoji: '📔' },
    lectura: { name: 'Lectura', emoji: '📖' },
    english: { name: 'English', emoji: '🗣️' },
    geografia: { name: 'Geografía', emoji: '🌍' },
    mundo: { name: 'Mundo', emoji: '🪐' },
  },
  leo: {
    trazos: { name: 'Trazos', emoji: '✍️' },
    numeros: { name: 'Números', emoji: '🔢' },
    english: { name: 'English', emoji: '🗣️' },
    logica: { name: 'Lógica', emoji: '🧩' },
  },
}

/**
 * Human-readable Spanish label for a subskill id, for the parent panel
 * (adult register, clear labels). Ids not listed fall back to the raw id in
 * `subskillLabel`, so a new subskill still renders — just less prettily.
 */
export const SUBSKILL_LABELS: Record<SubskillId, string> = {
  // calculo
  tablas: 'Tablas de multiplicar',
  'mult-1cifra': 'Multiplicación · 1 cifra',
  'mult-2cifras': 'Multiplicación · 2 cifras',
  'div-resto': 'División con resto',
  mental: 'Cálculo mental',
  estimacion: 'Estimación',
  cajitas: 'Cajitas multiplicativas',
  romanos: 'Números romanos',
  fracciones: 'Fracciones',
  'decimales-dinero': 'Decimales con dinero',
  'hechos-derivados-dec': 'Hechos derivados (decimales)',
  cuadrados: 'Números cuadrados',
  // problemas
  '1-paso': 'Problemas de 1 paso',
  '2-pasos': 'Problemas de 2 pasos',
  'dato-trampa': 'Detectar dato-trampa',
  dinero: 'Problemas de dinero',
  tiempo: 'Problemas de tiempo',
  medida: 'Problemas de medida',
  'patrones-crecimiento': 'Patrones de crecimiento',
  proporcionalidad: 'Proporcionalidad',
  // ortografia
  'accents-ca': 'Acentos (catalán)',
  'b-v': 'B / V',
  'essa-sorda': 'S sorda / sonora',
  apostrof: 'Apóstrofo',
  maj: 'Mayúsculas',
  puntuacio: 'Puntuación',
  // escritura / lectura
  diario: 'Diario',
  comprension: 'Comprensión lectora',
  reflexion: 'Reflexionar y valorar',
  // english (aira)
  reading: 'Reading',
  vocab: 'Vocabulary',
  // geografia
  capitales: 'Capitales',
  banderas: 'Banderas',
  'donde-esta': '¿Dónde está?',
  // mundo
  espacio: 'El espacio',
  'como-funciona': 'Cómo funciona',
  // leo · trazos
  letras: 'Trazo de letras',
  'numeros-trazo': 'Trazo de números',
  espejo: 'Inversiones en espejo',
  // leo · numeros
  'contar-6': 'Contar hasta 6',
  'descomponer-4-6': 'Descomponer 4-6',
  comparar: 'Comparar cantidades',
  'contar-20': 'Contar hasta 20',
  'descomponer-7-9': 'Descomponer 7-9',
  dobles: 'Dobles',
  'mas-menos-1-2': 'Más / menos 1-2',
  simbolos: 'Símbolos + − =',
  estimar: 'Estimar',
  // leo · english
  animales: 'Animals',
  colores: 'Colours',
  comida: 'Food',
  huerto: 'Garden',
  // leo · logica
  patrones: 'Patrones',
  formas: 'Formas',
  simetria: 'Simetría',
  clasificar: 'Clasificar',
  posiciones: 'Posiciones',
}

/** Friendly label for a subskill id, falling back to the raw id. */
export function subskillLabel(id: SubskillId): string {
  return SUBSKILL_LABELS[id] ?? id
}

/** Finds the skill id that owns `subskillId` for `profile`, or undefined if not found. */
export function skillOfSubskill(profile: ProfileId, subskillId: SubskillId): SkillId | undefined {
  const skills = CATALOG[profile].skills as Record<string, SkillDef>
  for (const [skillId, def] of Object.entries(skills)) {
    if (subskillId in def.subskills) {
      return skillId as SkillId
    }
  }
  return undefined
}

/** Returns all subskill defs belonging to `skillId` for `profile`, or [] if the skill doesn't exist for that profile. */
export function subskillsForSkill(profile: ProfileId, skillId: SkillId): SubskillDef[] {
  const skills = CATALOG[profile].skills as Record<string, SkillDef>
  const def = skills[skillId]
  return def ? Object.values(def.subskills) : []
}

/** All skill ids in `profile`'s catalog, in declaration order. */
export function allSkillIds(profile: ProfileId): SkillId[] {
  return Object.keys(CATALOG[profile].skills) as SkillId[]
}

/**
 * Whether a skill is enabled given a parent's `moduleToggles`. Convention:
 * an absent key means enabled (default-on), an explicit `false` disables it.
 * This is the single source of truth for the "Módulos activos" toggles so
 * the Settings UI, day composition, and free training all agree.
 */
export function isSkillEnabled(toggles: Record<string, boolean>, skillId: SkillId): boolean {
  return toggles[skillId] !== false
}

/**
 * The subset of `profile`'s skills that are enabled per `toggles`. If a parent
 * disabled EVERY skill, we fall back to the full catalog: an empty day is
 * worse than honoring a probably-accidental "turn everything off", so the
 * toggles are ignored in that degenerate case (callers rely on this to always
 * get a non-empty skill set).
 */
export function enabledSkillIds(profile: ProfileId, toggles: Record<string, boolean>): SkillId[] {
  const all = allSkillIds(profile)
  const enabled = all.filter((id) => isSkillEnabled(toggles, id))
  return enabled.length > 0 ? enabled : all
}

import { describe, expect, it } from 'vitest'
import {
  CATALOG,
  SKILL_META,
  skillOfSubskill,
  subskillsForSkill,
  ORTOGRAFIA_RULE_IDS,
  ruleLang,
  isOrtografiaRule,
  subskillLabel,
} from './skills'
import { AIRA_PROBLEMA_SKILLS, LEO_SKILL_BY_SLOT } from './dayComposerCards'
import type { ProfileId } from '../state/profileStore'

const PROFILES: ProfileId[] = ['aira', 'leo']

describe('catalog shape', () => {
  it('gives Aira exactly 8 skills and Leo exactly 4', () => {
    expect(Object.keys(CATALOG.aira.skills)).toHaveLength(8)
    expect(Object.keys(CATALOG.leo.skills)).toHaveLength(4)
  })

  it('has the exact Aira skill ids', () => {
    expect(new Set(Object.keys(CATALOG.aira.skills))).toEqual(
      new Set(['calculo', 'problemas', 'ortografia', 'escritura', 'lectura', 'english', 'geografia', 'mundo']),
    )
  })

  it('has the exact Leo skill ids', () => {
    expect(new Set(Object.keys(CATALOG.leo.skills))).toEqual(
      new Set(['trazos', 'numeros', 'english', 'logica']),
    )
  })

  it('every subskill belongs to exactly one skill, with no duplicate subskill ids across skills, per profile', () => {
    for (const profile of PROFILES) {
      const seen = new Map<string, string>()
      for (const [skillId, skill] of Object.entries(CATALOG[profile].skills)) {
        for (const subskillId of Object.keys(skill.subskills)) {
          expect(seen.has(subskillId)).toBe(false)
          seen.set(subskillId, skillId)
        }
      }
    }
  })

  it('every subskill declares a difficultyRange of [min, max] on a 1-5 scale', () => {
    for (const profile of PROFILES) {
      for (const skill of Object.values(CATALOG[profile].skills)) {
        for (const def of Object.values(skill.subskills)) {
          const [min, max] = def.difficultyRange
          expect(min).toBeGreaterThanOrEqual(1)
          expect(max).toBeLessThanOrEqual(5)
          expect(min).toBeLessThanOrEqual(max)
        }
      }
    }
  })
})

describe('Aira catalog contents', () => {
  it('calculo has the expected subskills including romanos with lowWeight', () => {
    const calculo = CATALOG.aira.skills.calculo
    expect(new Set(Object.keys(calculo.subskills))).toEqual(
      new Set([
        'tablas',
        'mult-1cifra',
        'mult-2cifras',
        'div-resto',
        'mental',
        'estimacion',
        'cajitas',
        'romanos',
        'fracciones',
        'decimales-dinero',
        'hechos-derivados-dec',
        'cuadrados',
      ]),
    )
    expect(calculo.subskills['romanos'].lowWeight).toBe(true)
  })

  it('marks the four calculo challenge subskills', () => {
    const calculo = CATALOG.aira.skills.calculo
    for (const id of ['fracciones', 'decimales-dinero', 'hechos-derivados-dec', 'cuadrados']) {
      expect(calculo.subskills[id].challenge).toBe(true)
    }
    expect(calculo.subskills['tablas'].challenge).toBeFalsy()
  })

  it('problemas has the expected subskills including proporcionalidad as challenge', () => {
    const problemas = CATALOG.aira.skills.problemas
    expect(new Set(Object.keys(problemas.subskills))).toEqual(
      new Set(['1-paso', '2-pasos', 'dato-trampa', 'dinero', 'tiempo', 'medida', 'patrones-crecimiento', 'proporcionalidad']),
    )
    expect(problemas.subskills['proporcionalidad'].challenge).toBe(true)
  })

  it('ortografia, escritura, lectura, english, geografia, mundo have the expected subskills', () => {
    expect(new Set(Object.keys(CATALOG.aira.skills.ortografia.subskills))).toEqual(
      new Set([
        'ca-accents',
        'ca-b-v',
        'ca-essa',
        'ca-ela-geminada',
        'ca-apostrof',
        'ca-h-muda',
        'ca-g-j',
        'ca-r-rr',
        'ca-majuscules',
        'es-b-v',
        'es-h',
        'es-g-j',
        'es-ll-y',
        'es-tildes',
        'es-mayusculas',
      ]),
    )
    expect(new Set(Object.keys(CATALOG.aira.skills.escritura.subskills))).toEqual(new Set(['diario']))
    expect(new Set(Object.keys(CATALOG.aira.skills.lectura.subskills))).toEqual(
      new Set(['comprension', 'reflexion']),
    )
    expect(new Set(Object.keys(CATALOG.aira.skills.english.subskills))).toEqual(new Set(['reading', 'vocab']))
    expect(new Set(Object.keys(CATALOG.aira.skills.geografia.subskills))).toEqual(
      new Set(['capitales', 'banderas', 'donde-esta']),
    )
    expect(new Set(Object.keys(CATALOG.aira.skills.mundo.subskills))).toEqual(
      new Set(['espacio', 'como-funciona']),
    )
  })
})

describe('Leo catalog contents', () => {
  it('trazos has the expected subskills', () => {
    expect(new Set(Object.keys(CATALOG.leo.skills.trazos.subskills))).toEqual(
      new Set(['letras', 'numeros-trazo', 'espejo']),
    )
  })

  it('numeros has base subskills plus the challenge subskills', () => {
    const numeros = CATALOG.leo.skills.numeros
    expect(new Set(Object.keys(numeros.subskills))).toEqual(
      new Set([
        'contar-6',
        'descomponer-4-6',
        'comparar',
        'contar-20',
        'descomponer-7-9',
        'dobles',
        'mas-menos-1-2',
        'simbolos',
        'estimar',
      ]),
    )
    for (const id of ['contar-20', 'descomponer-7-9', 'dobles', 'mas-menos-1-2', 'simbolos', 'estimar']) {
      expect(numeros.subskills[id].challenge).toBe(true)
    }
    expect(numeros.subskills['contar-6'].challenge).toBeFalsy()
  })

  it('english and logica have the expected subskills', () => {
    expect(new Set(Object.keys(CATALOG.leo.skills.english.subskills))).toEqual(
      new Set(['animales', 'colores', 'comida', 'huerto']),
    )
    expect(new Set(Object.keys(CATALOG.leo.skills.logica.subskills))).toEqual(
      new Set(['patrones', 'formas', 'simetria', 'clasificar', 'posiciones']),
    )
  })
})

describe('skillOfSubskill', () => {
  it('finds the owning skill for a known subskill', () => {
    expect(skillOfSubskill('aira', 'tablas')).toBe('calculo')
    expect(skillOfSubskill('aira', 'dinero')).toBe('problemas')
    expect(skillOfSubskill('leo', 'letras')).toBe('trazos')
    expect(skillOfSubskill('leo', 'contar-20')).toBe('numeros')
  })

  it('returns undefined for an unknown subskill or wrong profile', () => {
    expect(skillOfSubskill('aira', 'nope')).toBeUndefined()
    expect(skillOfSubskill('leo', 'tablas')).toBeUndefined()
  })
})

describe('subskillsForSkill', () => {
  it('returns all subskill defs for a given skill', () => {
    const subs = subskillsForSkill('aira', 'lectura')
    expect(new Set(subs.map((s) => s.id))).toEqual(new Set(['comprension', 'reflexion']))
    for (const s of subs) {
      expect(s.skill).toBe('lectura')
    }
  })

  it('returns an empty array for an unknown skill', () => {
    expect(subskillsForSkill('leo', 'calculo' as never)).toEqual([])
  })
})

describe('display metadata', () => {
  it('has Spanish name and emoji for every Aira skill', () => {
    const expected: Record<string, string> = {
      calculo: '🔢',
      problemas: '🧩',
      ortografia: '✏️',
      escritura: '📔',
      lectura: '📖',
      english: '🗣️',
      geografia: '🌍',
      mundo: '🪐',
    }
    for (const [skillId, emoji] of Object.entries(expected)) {
      expect(SKILL_META.aira[skillId as keyof typeof SKILL_META.aira].emoji).toBe(emoji)
      expect(SKILL_META.aira[skillId as keyof typeof SKILL_META.aira].name.length).toBeGreaterThan(0)
    }
  })

  it('has Spanish name and emoji for every Leo skill', () => {
    const expected: Record<string, string> = {
      trazos: '✍️',
      numeros: '🔢',
      english: '🗣️',
      logica: '🧩',
    }
    for (const [skillId, emoji] of Object.entries(expected)) {
      expect(SKILL_META.leo[skillId as keyof typeof SKILL_META.leo].emoji).toBe(emoji)
      expect(SKILL_META.leo[skillId as keyof typeof SKILL_META.leo].name.length).toBeGreaterThan(0)
    }
  })

  it('uses the exact expected Spanish names', () => {
    expect(SKILL_META.aira.calculo.name).toBe('Cálculo')
    expect(SKILL_META.aira.problemas.name).toBe('Problemas')
    expect(SKILL_META.aira.ortografia.name).toBe('Ortografía')
    expect(SKILL_META.aira.escritura.name).toBe('Escritura')
    expect(SKILL_META.aira.lectura.name).toBe('Lectura')
    expect(SKILL_META.aira.english.name).toBe('English')
    expect(SKILL_META.aira.geografia.name).toBe('Geografía')
    expect(SKILL_META.aira.mundo.name).toBe('Mundo')
    expect(SKILL_META.leo.trazos.name).toBe('Trazos')
    expect(SKILL_META.leo.numeros.name).toBe('Números')
    expect(SKILL_META.leo.english.name).toBe('English')
    expect(SKILL_META.leo.logica.name).toBe('Lógica')
  })
})

describe('ortografia spelling rules', () => {
  it('ORTOGRAFIA_RULE_IDS matches the ortografia subskill ids exactly', () => {
    expect(new Set(ORTOGRAFIA_RULE_IDS)).toEqual(
      new Set(Object.keys(CATALOG.aira.skills.ortografia.subskills)),
    )
    expect(ORTOGRAFIA_RULE_IDS).toHaveLength(15)
  })

  it('every rule has a kid-facing label in the correct language register', () => {
    for (const id of ORTOGRAFIA_RULE_IDS) {
      expect(subskillLabel(id)).not.toBe(id) // has a real label, not the raw id
    }
    // ca-* labels are Catalan, es-* labels are Spanish (spec-mandated strings).
    expect(subskillLabel('ca-b-v')).toBe('La b i la v')
    expect(subskillLabel('ca-ela-geminada')).toBe('La ela geminada (l·l)')
    expect(subskillLabel('ca-accents')).toBe("L'accent i la dièresi")
    expect(subskillLabel('es-b-v')).toBe('La b y la v')
    expect(subskillLabel('es-tildes')).toBe('Las tildes')
  })

  it('ruleLang infers ca vs es from the id prefix', () => {
    expect(ruleLang('ca-b-v')).toBe('ca')
    expect(ruleLang('ca-majuscules')).toBe('ca')
    expect(ruleLang('es-tildes')).toBe('es')
    expect(ruleLang('es-mayusculas')).toBe('es')
  })

  it('every rule id is on the expected 1-4 difficulty scale', () => {
    for (const id of ORTOGRAFIA_RULE_IDS) {
      const def = CATALOG.aira.skills.ortografia.subskills[id]
      expect(def.difficultyRange).toEqual([1, 4])
    }
  })

  it('isOrtografiaRule recognizes rules and rejects other subskills', () => {
    expect(isOrtografiaRule('ca-b-v')).toBe(true)
    expect(isOrtografiaRule('es-tildes')).toBe(true)
    expect(isOrtografiaRule('tablas')).toBe(false)
    expect(isOrtografiaRule('diario')).toBe(false)
    expect(isOrtografiaRule('nope')).toBe(false)
  })
})

describe('challenge subskill coverage (CI-level invariant)', () => {
  it('every Aira challenge-bearing skill is covered by AIRA_PROBLEMA_SKILLS (used by pickChallengeSubskill)', () => {
    for (const [skillId, def] of Object.entries(CATALOG.aira.skills)) {
      const hasChallengeSubskill = Object.values(def.subskills).some((s) => s.challenge)
      if (hasChallengeSubskill) {
        expect(
          AIRA_PROBLEMA_SKILLS,
          `skill "${skillId}" has a challenge subskill but is missing from AIRA_PROBLEMA_SKILLS in dayComposerCards.ts — it would never be reachable via a 'desafio' surprise. Add it to AIRA_PROBLEMA_SKILLS (or wire up a dedicated slot) when adding challenge subskills to a new skill.`,
        ).toContain(skillId)
      }
    }
  })

  it('every Leo challenge-bearing skill is covered by a LEO_SKILL_BY_SLOT entry (used by pickChallengeSubskill)', () => {
    const slottedSkills = new Set(Object.values(LEO_SKILL_BY_SLOT))
    for (const [skillId, def] of Object.entries(CATALOG.leo.skills)) {
      const hasChallengeSubskill = Object.values(def.subskills).some((s) => s.challenge)
      if (hasChallengeSubskill) {
        expect(
          slottedSkills.has(skillId as never),
          `skill "${skillId}" has a challenge subskill but no LEO_BASE_CARD_TYPES slot in dayComposerCards.ts maps to it via LEO_SKILL_BY_SLOT — it would never be reachable via a 'desafio' surprise. Wire up a slot (or extend buildLeoBaseCard's gating) when adding challenge subskills to a new Leo skill.`,
        ).toBe(true)
      }
    }
  })
})

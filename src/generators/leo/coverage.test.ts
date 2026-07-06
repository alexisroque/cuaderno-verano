import { describe, expect, it } from 'vitest'
import './index'
import { CATALOG } from '../../engine/skills'
import { getGenerator } from '../framework'

/**
 * Repo-wide registry coverage test for the Leo catalog, mirroring
 * `generators/aira/coverage.test.ts`. Iterates the FULL `CATALOG.leo` and
 * asserts that every subskill expected to be generator-backed actually has
 * a registered generator, so a scheduler pick for any Leo subskill can
 * always be instantiated — no silent "undefined generator" gaps.
 *
 * Content-backed subskills are intentionally exempt: Leo's `english` skill
 * (animales, colores, comida, huerto) is vocabulary content driven by
 * curated content data, not a pure generator — same pattern as Aira's
 * exempt skills (ortografia, escritura, lectura, english, geografia,
 * mundo). Every subskill under `trazos`, `numeros`, and `logica`
 * (including I5 challenge subskills) is expected to be generator-backed.
 */
const GENERATOR_EXEMPT_SKILLS = new Set(['english'])

describe('Leo generator registry coverage (full catalog)', () => {
  for (const [skillId, skillDef] of Object.entries(CATALOG.leo.skills)) {
    const isExemptSkill = GENERATOR_EXEMPT_SKILLS.has(skillId)

    for (const subskillId of Object.keys(skillDef.subskills)) {
      if (isExemptSkill) {
        it(`${skillId}/${subskillId}: content-backed, no generator expected`, () => {
          // Documented exemption — no assertion needed beyond confirming the
          // subskill still lives under an exempt skill (this test exists so
          // reassigning a subskill to a non-exempt skill doesn't silently
          // stop being covered).
          expect(GENERATOR_EXEMPT_SKILLS.has(skillId)).toBe(true)
        })
        continue
      }

      it(`${skillId}/${subskillId}: has a registered generator`, () => {
        const gen = getGenerator(subskillId)
        expect(gen, `subskill "${subskillId}" (skill "${skillId}") has no registered generator — a scheduler pick for it would fail`).toBeDefined()
        expect(gen?.subskill).toBe(subskillId)
      })
    }
  }

  it('every trazos, numeros, and logica subskill (base + challenge) is generator-backed', () => {
    for (const skillId of ['trazos', 'numeros', 'logica'] as const) {
      const skillDef = CATALOG.leo.skills[skillId]
      for (const subskillId of Object.keys(skillDef.subskills)) {
        expect(getGenerator(subskillId), `${skillId}/${subskillId} missing generator`).toBeDefined()
      }
    }
  })
})

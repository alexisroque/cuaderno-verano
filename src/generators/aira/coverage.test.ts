import { describe, expect, it } from 'vitest'
import './index'
import { CATALOG } from '../../engine/skills'
import { getGenerator } from '../framework'

/**
 * Repo-wide registry coverage test. Iterates the FULL Aira CATALOG and
 * asserts that every subskill expected to be generator-backed actually has
 * a registered generator. This locks the invariant that a scheduler pick
 * (which just looks up `getGenerator(subskillId)`) can ALWAYS be
 * instantiated for any subskill the catalog says exists — no silent
 * "undefined generator" gaps, including for challenge subskills gated
 * behind gem progress (they're picked less often, so a missing generator
 * there could otherwise go unnoticed for a long time).
 *
 * Content-backed subskills are intentionally exempt: their exercises come
 * from curated content data (content/*.json), not a pure generator, so
 * `getGenerator` never applies to them. The exempt list below is the
 * single source of truth for that distinction — every calculo/problemas
 * subskill (including challenge ones) is expected to be generator-backed;
 * everything under the other 6 Aira skills is content-driven instead:
 *
 *   - ortografia: ca-accents, ca-b-v, ca-essa, ca-ela-geminada, ca-apostrof,
 *                 ca-h-muda, ca-g-j, ca-r-rr, ca-majuscules, es-b-v, es-h,
 *                 es-g-j, es-ll-y, es-tildes, es-mayusculas (spelling rules)
 *   - escritura:  diario
 *   - lectura:    comprension, reflexion
 *   - english:    reading, vocab
 *   - geografia:  capitales, banderas, donde-esta
 *   - mundo:      espacio, como-funciona
 */
const GENERATOR_EXEMPT_SKILLS = new Set(['ortografia', 'escritura', 'lectura', 'english', 'geografia', 'mundo'])

// This file only covers `CATALOG.aira`. The Leo generator family
// (younger-grade math/logic/tracing — contar-6, patrones, letras, etc.)
// has its own mirroring coverage test: `generators/leo/coverage.test.ts`,
// which iterates `CATALOG.leo.skills` the same way.

describe('Aira generator registry coverage (full catalog)', () => {
  for (const [skillId, skillDef] of Object.entries(CATALOG.aira.skills)) {
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

  it('every calculo and problemas subskill (base + challenge) is generator-backed', () => {
    for (const skillId of ['calculo', 'problemas'] as const) {
      const skillDef = CATALOG.aira.skills[skillId]
      for (const subskillId of Object.keys(skillDef.subskills)) {
        expect(getGenerator(subskillId), `${skillId}/${subskillId} missing generator`).toBeDefined()
      }
    }
  })
})

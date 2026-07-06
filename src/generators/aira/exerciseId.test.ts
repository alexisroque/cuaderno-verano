import { describe, expect, it } from 'vitest'
import './index'
import { createRng } from '../../lib/rng'
import { listRegistered, getGenerator } from '../framework'
import { DEFAULT_TEST_FLAVOR } from '../testUtils'

/**
 * Regression test for the "unclamped difficulty in exerciseId" bug: every
 * generator used to call `exerciseId(rng, subskill, requestedDifficulty)`
 * with the RAW requested difficulty (e.g. 99), while `Exercise.difficulty`
 * held the clamped value (e.g. 3) — so the id ("romanos-d99-...") disagreed
 * with the exercise's own `difficulty` field. `exerciseId` must still be the
 * FIRST draw off `rng` (clamping is pure and doesn't touch `rng`, so
 * generators clamp first, then call `exerciseId` with the clamped value).
 */
describe('exerciseId reflects the CLAMPED difficulty for every registered generator', () => {
  const subskills = listRegistered()

  it('has at least one registered generator to check', () => {
    expect(subskills.length).toBeGreaterThan(0)
  })

  it.each(subskills)('%s: id embeds the clamped difficulty, not the raw requested one', (subskill) => {
    const generator = getGenerator(subskill)!
    for (const bogusDifficulty of [-999, 0, 99, 9999]) {
      const rng = createRng(`exerciseId-clamp:${subskill}:${bogusDifficulty}`)
      const exercise = generator.generate(rng, bogusDifficulty, DEFAULT_TEST_FLAVOR)

      const idMatch = exercise.id.match(/^.+-d(-?\d+)-/)
      expect(idMatch, `id "${exercise.id}" does not match the "{subskill}-d{difficulty}-{hex}" shape`).toBeTruthy()
      const idDifficulty = Number(idMatch![1])

      expect(
        idDifficulty,
        `id "${exercise.id}" embeds difficulty ${idDifficulty}, but exercise.difficulty is ${exercise.difficulty} (requested ${bogusDifficulty})`,
      ).toBe(exercise.difficulty)
    }
  })

  it.each(subskills)('%s: same seed still produces a deep-equal exercise (determinism preserved)', (subskill) => {
    const generator = getGenerator(subskill)!
    const seed = `exerciseId-determinism:${subskill}`
    const a = generator.generate(createRng(seed), 3, DEFAULT_TEST_FLAVOR)
    const b = generator.generate(createRng(seed), 3, DEFAULT_TEST_FLAVOR)
    expect(a).toEqual(b)
  })
})

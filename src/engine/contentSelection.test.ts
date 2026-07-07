import { describe, expect, it } from 'vitest'
import {
  isRuleFocusDay,
  weakestOrtografiaRule,
  targetRule,
  pickFocusEpisodeForRule,
  pickDictadoContent,
} from './contentSelection'
import { ORTOGRAFIA_RULE_IDS } from './skills'
import { createRng } from '../lib/rng'
import type { Attempt, ProfileProgress } from '../types/progress'
import type { ContentBundle, Series } from '../types/content'

function attempt(subskill: string, correct: boolean, dateISO = '2026-07-01'): Attempt {
  return { dateISO, cardType: 'dictado', subskill, correct, hintsUsed: 0, ms: 1000, difficulty: 2 }
}

function makeProgress(attempts: Attempt[] = [], consumed: string[] = []): ProfileProgress {
  return {
    attempts,
    completedCards: {},
    consumedContent: { episodes: consumed },
    gems: {},
    coins: 0,
    collections: {},
    streak: { current: 0, best: 0, lastActiveISO: null },
  } as unknown as ProfileProgress
}

/** Minimal two-series bundle: one rule-focus series + one cultural series. */
function makeContent(): ContentBundle {
  const ruleSeries: Series = {
    id: 'ortografia-mostra',
    title: 'Regla',
    emoji: '✏️',
    episodes: [
      { id: 'r-bv', order: 1, focus: 'ca-b-v', lang: 'ca' } as never,
      { id: 'r-tildes', order: 2, focus: 'es-tildes', lang: 'es' } as never,
    ],
  }
  const cultural: Series = {
    id: 'animales',
    title: 'Animales',
    emoji: '🐾',
    episodes: [
      { id: 'c-1', order: 1 } as never,
      { id: 'c-2', order: 2 } as never,
    ],
  }
  return {
    chapters: [],
    series: [cultural, ruleSeries],
    curiosities: [],
    jokes: [],
    diaryPrompts: [],
    cuentosLeo: [],
  }
}

describe('isRuleFocusDay', () => {
  it('is deterministic per date and leans rule-focused (2 of every 3 days)', () => {
    // The 3-day cycle from the epoch: rule, rule, cultural.
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06']
    const pattern = days.map(isRuleFocusDay)
    expect(pattern).toEqual([true, true, false, true, true, false])
  })

  it('returns the same answer for the same date', () => {
    expect(isRuleFocusDay('2026-07-15')).toBe(isRuleFocusDay('2026-07-15'))
  })
})

describe('weakestOrtografiaRule', () => {
  it('with no attempts returns the first rule (deterministic tie-break)', () => {
    expect(weakestOrtografiaRule([])).toBe(ORTOGRAFIA_RULE_IDS[0])
  })

  it('prefers a never-attempted rule over a low-mastery one', () => {
    // ca-b-v has some (poor) data; the rest are untrained → an untrained rule wins.
    const attempts = [attempt('ca-b-v', false), attempt('ca-b-v', true)]
    const weakest = weakestOrtografiaRule(attempts)
    expect(weakest).not.toBe('ca-b-v')
    expect(ORTOGRAFIA_RULE_IDS).toContain(weakest)
  })

  it('when every rule has data, returns the lowest-mastery rule', () => {
    const attempts: Attempt[] = []
    for (const id of ORTOGRAFIA_RULE_IDS) {
      // Everyone at 100% except es-h which is all wrong.
      attempts.push(attempt(id, id !== 'es-h'))
    }
    expect(weakestOrtografiaRule(attempts)).toBe('es-h')
  })
})

describe('targetRule', () => {
  it('honors a parent pin that is an ortografia rule', () => {
    expect(targetRule([], ['es-g-j'])).toBe('es-g-j')
  })

  it('ignores a non-ortografia focus and falls back to weakest', () => {
    expect(targetRule([], ['tablas'])).toBe(weakestOrtografiaRule([]))
  })

  it('uses weakest rule when no pin set', () => {
    const attempts = ORTOGRAFIA_RULE_IDS.map((id) => attempt(id, id !== 'ca-r-rr'))
    expect(targetRule(attempts, [])).toBe('ca-r-rr')
  })
})

describe('pickFocusEpisodeForRule', () => {
  it('picks the focus episode matching the rule', () => {
    const { series } = makeContent()
    const picked = pickFocusEpisodeForRule([series[0], series[1]], 'ca-b-v', [])
    expect(picked?.episode.id).toBe('r-bv')
  })

  it('returns undefined when no episode targets the rule', () => {
    const { series } = makeContent()
    expect(pickFocusEpisodeForRule(series, 'ca-h-muda', [])).toBeUndefined()
  })

  it('repeats a consumed episode rather than giving up', () => {
    const { series } = makeContent()
    const picked = pickFocusEpisodeForRule(series, 'ca-b-v', ['r-bv'])
    expect(picked?.episode.id).toBe('r-bv')
  })
})

describe('pickDictadoContent — rule focus', () => {
  const content = makeContent()

  it('on a rule-focus day serves the weakest-rule focus episode with its own language', () => {
    // Make ca-b-v the clear weakest by giving every OTHER rule perfect data.
    const attempts = ORTOGRAFIA_RULE_IDS.filter((id) => id !== 'ca-b-v').map((id) => attempt(id, true))
    const progress = makeProgress(attempts)
    // 2026-01-01 is a rule-focus day.
    const pick = pickDictadoContent(createRng('t'), content, progress, '2026-01-01', [])
    expect(pick.contentRef?.episodeId).toBe('r-bv')
    expect(pick.focus).toBe('ca-b-v')
    expect(pick.language).toBe('ca') // episode language, not the day rotation
  })

  it('parent pin overrides the weakest rule', () => {
    const progress = makeProgress()
    const pick = pickDictadoContent(createRng('t'), content, progress, '2026-01-01', ['es-tildes'])
    expect(pick.contentRef?.episodeId).toBe('r-tildes')
    expect(pick.focus).toBe('es-tildes')
    expect(pick.language).toBe('es')
  })

  it('falls back to a cultural episode when no focus content for the target rule', () => {
    // Pin a rule with no fixture content → must fall back to a cultural (non-focus) episode.
    const progress = makeProgress()
    const pick = pickDictadoContent(createRng('t'), content, progress, '2026-01-01', ['ca-h-muda'])
    expect(pick.contentRef?.episodeId).toBe('c-1')
    expect(pick.focus).toBeUndefined()
  })

  it('on a cultural day never serves a focus episode', () => {
    const progress = makeProgress()
    // 2026-01-03 is a cultural day.
    const pick = pickDictadoContent(createRng('t'), content, progress, '2026-01-03', ['ca-b-v'])
    expect(pick.contentRef?.episodeId).toBe('c-1')
    expect(pick.focus).toBeUndefined()
  })
})

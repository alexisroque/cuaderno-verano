import type { ProfileId } from '../../state/profileStore'
import { useSettingsStore, type SubskillAdjustment } from '../../state/settingsStore'
import { subskillLabel, type SubskillDef } from '../../engine/skills'
import type { SubskillStat } from '../../engine/analytics'
import { Modal } from '../../components/ui/Modal'
import { todayISO } from '../../lib/clock'
import { addDays } from '../../lib/dates'
import { daysBetween } from '../../lib/dates'

const BOOST_DAYS = 7

function currentAdjustment(profile: ProfileId, id: string): SubskillAdjustment {
  const stored = useSettingsStore.getState().children[profile].subskillAdjustments[id]
  return stored ?? { difficultyOffset: 0, boostUntil: null }
}

/**
 * Detail sheet for one subskill, opened from the heatmap. Two parent controls
 * that feed the scheduler:
 * - **Reforzar**: sets `boostUntil = today + 7 days`, which the scheduler reads
 *   to double the subskill's within-pool weight for the week.
 * - **Dificultad −1 / auto / +1**: sets `difficultyOffset` on the subskill.
 *
 * Both persist via `updateChildSettings` (debounced to IndexedDB).
 */
export function SubskillDetail({
  profile,
  def,
  stat,
  onClose,
}: {
  profile: ProfileId
  def: SubskillDef | null
  stat: SubskillStat | undefined
  onClose: () => void
}) {
  const adjustments = useSettingsStore((s) => s.children[profile].subskillAdjustments)
  const update = useSettingsStore((s) => s.updateChildSettings)

  if (!def) return null

  const adj = adjustments[def.id] ?? { difficultyOffset: 0, boostUntil: null }
  const today = todayISO()
  const boostActive = !!adj.boostUntil && adj.boostUntil >= today
  const boostDaysLeft = adj.boostUntil ? Math.max(0, daysBetween(today, adj.boostUntil)) : 0

  function setAdjustment(patch: Partial<SubskillAdjustment>) {
    const base = currentAdjustment(profile, def!.id)
    const next = { ...base, ...patch }
    update(profile, {
      subskillAdjustments: {
        ...useSettingsStore.getState().children[profile].subskillAdjustments,
        [def!.id]: next,
      },
    })
  }

  function toggleBoost() {
    setAdjustment({ boostUntil: boostActive ? null : addDays(today, BOOST_DAYS) })
  }

  function setDifficulty(offset: number) {
    setAdjustment({ difficultyOffset: offset })
  }

  const offset = adj.difficultyOffset
  const diffButtons: { label: string; value: number }[] = [
    { label: '−1 · más fácil', value: -1 },
    { label: 'auto', value: 0 },
    { label: '+1 · más difícil', value: 1 },
  ]

  return (
    <Modal open onClose={onClose} title={subskillLabel(def.id)}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div
            className="flex flex-1 flex-col rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
              Acierto
            </span>
            <span className="text-2xl font-black" style={{ color: 'var(--navy)' }}>
              {stat && stat.volume > 0 ? `${Math.round(stat.accuracy * 100)}%` : '—'}
            </span>
          </div>
          <div
            className="flex flex-1 flex-col rounded-2xl px-4 py-3"
            style={{ background: 'var(--bg)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
              Practicado
            </span>
            <span className="text-2xl font-black" style={{ color: 'var(--navy)' }}>
              {stat?.volume ?? 0}×
            </span>
          </div>
        </div>

        {/* Reforzar */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
              Reforzar esta semana
            </span>
            {boostActive && (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: 'var(--mint)', color: '#3f7d55' }}
              >
                activo · {boostDaysLeft} d
              </span>
            )}
          </div>
          <p className="mb-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
            Aparece el doble de veces durante {BOOST_DAYS} días.
          </p>
          <button
            type="button"
            onClick={toggleBoost}
            className="min-h-[48px] w-full rounded-full font-extrabold transition-transform active:translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]"
            style={
              boostActive
                ? { background: 'var(--peach-soft)', color: '#c26a4c', boxShadow: '0 3px 0 #f2cdb4' }
                : { background: 'var(--peach)', color: '#fff', boxShadow: '0 4px 0 #d98363' }
            }
          >
            {boostActive ? 'Quitar refuerzo' : '💪 Reforzar 7 días'}
          </button>
        </div>

        {/* Dificultad */}
        <div>
          <span className="mb-2 block text-sm font-bold" style={{ color: 'var(--ink)' }}>
            Dificultad
          </span>
          <div className="grid grid-cols-3 gap-2">
            {diffButtons.map((b) => {
              const selected = offset === b.value
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setDifficulty(b.value)}
                  className="min-h-[48px] rounded-2xl px-2 text-sm font-bold transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
                  style={
                    selected
                      ? { background: 'var(--navy)', color: '#fff' }
                      : { background: 'var(--bg)', color: 'var(--ink)' }
                  }
                >
                  {b.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            «auto» deja que el motor calibre la dificultad según sus aciertos.
          </p>
        </div>
      </div>
    </Modal>
  )
}

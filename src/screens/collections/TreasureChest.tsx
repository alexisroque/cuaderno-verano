import { useProgressStore } from '../../state/progressStore'
import type { ProfileId } from '../../state/profileStore'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { TREASURES, canAfford, type Treasure } from '../../engine/collections'

/**
 * "El Cofre de los Tesoros" (§5.8): spend earned coins on cosmetic/bonus items
 * — premium curiosities, joke packs, bonus stickers, mascot accessories. Flat
 * cheap prices (5-15). Purchases persist in progress.unlockedTreasures and are
 * irreversible/one-time (owned items show a checkmark). Leo gets big audio-
 * labelled tiles.
 */
export function TreasureChest({ profile, leo }: { profile: ProfileId; leo: boolean }) {
  const coins = useProgressStore((s) => s.profiles[profile].coins)
  const unlocked = useProgressStore((s) => s.profiles[profile].unlockedTreasures)
  const addCoins = useProgressStore((s) => s.addCoins)
  const unlockTreasure = useProgressStore((s) => s.unlockTreasure)

  const buy = (t: Treasure) => {
    if (!canAfford(coins, unlocked, t)) return
    addCoins(profile, -t.cost)
    unlockTreasure(profile, t.id)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black">🎁 El Cofre de los Tesoros</h3>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Gasta tus monedas en premios especiales.
          </p>
        </div>
        <span className="rounded-xl px-3 py-1.5 text-sm font-black" style={{ background: 'var(--sky)', color: '#2f6690' }}>
          💎 {coins}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TREASURES.map((t) => {
          const owned = unlocked.includes(t.id)
          const affordable = canAfford(coins, unlocked, t)
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--card)', boxShadow: '0 1px 4px rgba(184,140,120,.14)', opacity: owned ? 0.75 : 1 }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: 'var(--peach-soft)' }} aria-hidden>
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-extrabold">
                  {t.name}
                  {leo && <SpeakButton text={t.name} size="md" tone="peach" />}
                </div>
                <p className="truncate text-xs" style={{ color: 'var(--ink-soft)' }}>
                  {t.description}
                </p>
              </div>
              {owned ? (
                <span className="rounded-xl px-3 py-1 text-xs font-black" style={{ background: 'var(--mint)', color: '#3f7d55' }}>
                  ✓ Tuyo
                </span>
              ) : (
                <Button variant={affordable ? 'primary' : 'soft'} size={leo ? 'lg' : 'md'} disabled={!affordable} onClick={() => buy(t)}>
                  💎 {t.cost}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

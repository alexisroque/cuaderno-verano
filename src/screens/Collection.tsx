import { useState } from 'react'
import { Shell } from '../components/Shell'
import { useProfileStore } from '../state/profileStore'
import { GemCabinet } from './collections/GemCabinet'
import { Passport } from './collections/Passport'
import { Mural } from './collections/Mural'
import { DiaryList } from './collections/DiaryList'
import { TreasureChest } from './collections/TreasureChest'
import { LeoStars } from './collections/LeoStars'

interface Tab {
  id: string
  label: string
  emoji: string
}

const AIRA_TABS: Tab[] = [
  { id: 'gemas', label: 'Gemas', emoji: '💎' },
  { id: 'pasaporte', label: 'Pasaporte', emoji: '🛂' },
  { id: 'diario', label: 'Diario', emoji: '📔' },
  { id: 'cofre', label: 'Cofre', emoji: '🎁' },
]

const LEO_TABS: Tab[] = [
  { id: 'gemas', label: 'Estrellas', emoji: '⭐' },
  { id: 'mural', label: 'Mi selva', emoji: '🌴' },
  { id: 'cofre', label: 'Cofre', emoji: '🎁' },
]

/**
 * "Mi colección" (§5.8), tabbed by profile:
 *  - Aira: Gem Cabinet + Passport + her Diary + the Treasure Chest.
 *  - Leo:  Gem stars + the MI SELVA Mural + the Treasure Chest.
 */
export function Collection() {
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const leo = profile === 'leo'
  const tabs = leo ? LEO_TABS : AIRA_TABS
  const [active, setActive] = useState(tabs[0].id)

  return (
    <Shell>
      <div className="mx-auto max-w-2xl pt-2">
        <h2 className="mb-3 text-lg font-extrabold">Mi colección</h2>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => {
            const on = active === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl px-4 font-bold transition-colors"
                style={{
                  minHeight: leo ? 60 : 44,
                  background: on ? 'var(--peach-soft)' : 'var(--card)',
                  color: on ? '#c26a4c' : 'var(--ink-soft)',
                }}
              >
                <span aria-hidden>{t.emoji}</span>
                <span className={leo ? 'text-base' : 'text-sm'}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {active === 'gemas' && (leo ? <LeoStars /> : <GemCabinet profile="aira" />)}
        {active === 'pasaporte' && <Passport />}
        {active === 'diario' && <DiaryList />}
        {active === 'mural' && <Mural />}
        {active === 'cofre' && <TreasureChest profile={profile} leo={leo} />}
      </div>
    </Shell>
  )
}

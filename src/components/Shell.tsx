import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useProfileStore, type ProfileId } from '../state/profileStore'
import { useProgressStore } from '../state/progressStore'
import { useTestModeStore } from '../state/testModeStore'
import { currentChapter } from '../content/chapters'
import { speak } from '../lib/tts'
import { Pill } from './ui/Pill'
import { IconTile } from './ui/IconTile'

/** Display identity for each child (name + avatar emoji + shell tint). */
const PROFILE_META: Record<ProfileId, { name: string; emoji: string; tone: 'peach' | 'sky' }> = {
  aira: { name: 'Aira', emoji: '🌸', tone: 'peach' },
  leo: { name: 'Leo', emoji: '🦖', tone: 'sky' },
}

interface NavItem {
  to: string
  label: string
  emoji: string
}

const NAV: NavItem[] = [
  { to: '/hoy', label: 'Hoy', emoji: '☀️' },
  { to: '/entrenar', label: 'Entrenar', emoji: '🎯' },
  { to: '/coleccion', label: 'Colección', emoji: '💎' },
]

/**
 * App chrome for the two kid areas: a warm header (greeting + chapter + streak
 * + coins) and a bottom nav. Leo gets a larger, sparser header and hears his
 * greeting spoken aloud on mount (he can't read yet).
 */
export function Shell({ children }: { children: ReactNode }) {
  const profile = useProfileStore((s) => s.activeProfile)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const streak = useProgressStore((s) => (profile ? s.profiles[profile].streak.count : 0))
  const coins = useProgressStore((s) => (profile ? s.profiles[profile].coins : 0))
  const testMode = useTestModeStore((s) => s.active)
  const exitTestMode = useTestModeStore((s) => s.disable)

  const isLeo = profile === 'leo'
  const chapter = currentChapter()

  useEffect(() => {
    if (isLeo && profile) {
      speak(`¡Hola, Leo! Hoy estamos ${chapter.flavor.placePhrase}.`, 'es-ES')
    }
    // greet once per mount for Leo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  if (!profile) return <>{children}</>
  const meta = PROFILE_META[profile]

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {testMode && (
        <div
          role="status"
          className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-bold"
          style={{ background: 'var(--sky)', color: 'var(--navy)' }}
        >
          <span>🧪 Modo prueba · el progreso no se guarda</span>
          <button
            type="button"
            onClick={() => {
              exitTestMode()
              navigate('/')
            }}
            className="rounded-full px-3 py-1 text-xs font-extrabold transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
            style={{ background: 'var(--navy)', color: '#fff' }}
          >
            Salir
          </button>
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-8">
        <div className="flex items-center gap-3">
          <IconTile emoji={meta.emoji} tone={meta.tone} size={isLeo ? 'lg' : 'md'} tilt />
          <div>
            <div className={isLeo ? 'text-3xl font-black' : 'text-xl font-extrabold'}>
              ¡Hola, {meta.name}!
            </div>
            {!isLeo && (
              <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                {chapter.title} {chapter.emoji} · {chapter.place}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isLeo && (
            <Pill tone="mint" size="md">
              {chapter.emoji} {chapter.place}
            </Pill>
          )}
          <Pill tone="peach" size={isLeo ? 'lg' : 'md'}>
            🔥 {streak}
          </Pill>
          {!isLeo && (
            <Pill tone="sky" size="md">
              💎 {coins}
            </Pill>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 sm:px-8">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around px-3 py-2"
        style={{
          background: 'var(--card)',
          boxShadow: '0 -4px 18px rgba(184,140,120,.14)',
          borderTopLeftRadius: 'var(--r-card)',
          borderTopRightRadius: 'var(--r-card)',
        }}
      >
        {NAV.map((item) => {
          const active = pathname === item.to
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 font-bold transition-colors"
              style={{
                color: active ? '#c26a4c' : 'var(--ink-soft)',
                background: active ? 'var(--peach-soft)' : 'transparent',
                minHeight: isLeo ? 64 : 52,
              }}
            >
              <span className={isLeo ? 'text-3xl' : 'text-2xl'} aria-hidden>
                {item.emoji}
              </span>
              <span className={isLeo ? 'text-base' : 'text-xs'}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

import { useNavigate } from 'react-router'
import { useProfileStore, type ProfileId } from '../state/profileStore'
import { currentChapter } from '../content/chapters'

interface Avatar {
  id: ProfileId
  name: string
  emoji: string
  bg: string
  ring: string
  peso: string
}

const AVATARS: Avatar[] = [
  { id: 'aira', name: 'Aira', emoji: '🌸', bg: 'var(--peach-soft)', ring: 'var(--peach)', peso: '#e6a488' },
  { id: 'leo', name: 'Leo', emoji: '🦖', bg: 'var(--sky)', ring: '#8ec4e6', peso: '#a7cfe6' },
]

/**
 * The welcome cover: pick a child to enter their day. A discreet lock in the
 * corner opens the parent area. Choosing an avatar sets the active profile and
 * routes to "la página de hoy".
 */
export function ProfileSelect() {
  const navigate = useNavigate()
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)
  const chapter = currentChapter()

  const choose = (id: ProfileId) => {
    setActiveProfile(id)
    navigate('/hoy')
  }

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(180deg, #fef9ee, #fdf3e0)', color: 'var(--ink)' }}
    >
      <button
        type="button"
        aria-label="Zona de padres"
        onClick={() => navigate('/padres')}
        className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full text-lg opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--peach)]"
        style={{ background: 'rgba(255,255,255,.7)' }}
      >
        <span aria-hidden>🔒</span>
      </button>

      <div className="mb-2 text-6xl" aria-hidden>
        {chapter.emoji}
      </div>
      <h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl" style={{ color: '#78350f' }}>
        El Cuaderno de Verano
      </h1>
      <p className="mt-2 text-center text-base" style={{ color: '#a16207' }}>
        ¿Quién juega hoy?
      </p>

      <div className="mt-10 flex flex-col gap-6 sm:flex-row">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => choose(a.id)}
            className="group flex w-64 flex-col items-center rounded-[28px] px-8 py-9 transition-transform duration-150 ease-out hover:-translate-y-1 active:translate-y-0.5 active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]"
            style={{ background: 'var(--card)', boxShadow: `0 8px 0 ${a.peso}, 0 14px 26px rgba(184,140,120,.2)` }}
          >
            <span
              className="flex h-32 w-32 items-center justify-center rounded-full text-7xl transition-transform duration-200 group-hover:scale-105"
              style={{ background: a.bg, boxShadow: `inset 0 0 0 5px ${a.ring}` }}
            >
              <span aria-hidden>{a.emoji}</span>
            </span>
            <span className="mt-5 text-3xl font-black">{a.name}</span>
          </button>
        ))}
      </div>
    </main>
  )
}

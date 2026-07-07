import type { ProfileId } from '../../state/profileStore'
import { useSettingsStore } from '../../state/settingsStore'
import {
  CATALOG,
  SKILL_META,
  subskillLabel,
  ORTOGRAFIA_RULE_IDS,
  isOrtografiaRule,
  ruleLang,
  type SkillId,
  type SubskillDef,
} from '../../engine/skills'

/** Mission-size bounds per child (design §4: Leo 3-4 cards, Aira 4-6). */
const MISSION_BOUNDS: Record<ProfileId, [number, number]> = {
  aira: [4, 6],
  leo: [3, 4],
}

const MAX_FOCUS = 3

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section
      className="p-5"
      style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: '0 6px 18px rgba(184,140,120,.12)' }}
    >
      <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      {hint && (
        <p className="mt-1 mb-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
          {hint}
        </p>
      )}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  suffix?: string
}) {
  const btn = (label: string, delta: number, disabled: boolean) => (
    <button
      type="button"
      aria-label={delta < 0 ? 'Menos' : 'Más'}
      disabled={disabled}
      onClick={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black transition-transform active:translate-y-[1px] disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
      style={{ background: 'var(--bg)', color: 'var(--navy)' }}
    >
      {label}
    </button>
  )
  return (
    <div className="flex items-center gap-4">
      {btn('−', -1, value <= min)}
      <span className="min-w-[3ch] text-center text-2xl font-black" style={{ color: 'var(--ink)' }}>
        {value}
        {suffix ? <span className="ml-1 text-base font-bold" style={{ color: 'var(--ink-soft)' }}>{suffix}</span> : null}
      </span>
      {btn('+', 1, value >= max)}
    </div>
  )
}

export function Settings({ profile }: { profile: ProfileId }) {
  const settings = useSettingsStore((s) => s.children[profile])
  const update = useSettingsStore((s) => s.updateChildSettings)

  const [missionMin, missionMax] = MISSION_BOUNDS[profile]
  const skillIds = Object.keys(CATALOG[profile].skills) as SkillId[]
  const meta = SKILL_META[profile] as Record<string, { name: string; emoji: string }>
  const allSubskills = skillIds.flatMap(
    (id) =>
      Object.values(
        CATALOG[profile].skills[id as keyof (typeof CATALOG)[typeof profile]['skills']].subskills,
      ) as SubskillDef[],
  )

  const challengePercent = Math.round(settings.challengeFrequency * 100)

  // The child has an ortografia skill (Aira) → offer the weekly spelling-rule
  // pin. The pinned rule is whichever ortografia rule currently sits in
  // weeklyFocus (at most one); setting it replaces that entry while leaving any
  // non-ortografia focus subtemas untouched.
  const hasOrtografia = 'ortografia' in CATALOG[profile].skills
  const pinnedRule = settings.weeklyFocus.find((id) => isOrtografiaRule(id)) ?? ''

  function setPinnedRule(ruleId: string) {
    const rest = settings.weeklyFocus.filter((id) => !isOrtografiaRule(id))
    const next = ruleId ? [...rest, ruleId].slice(0, MAX_FOCUS) : rest
    update(profile, { weeklyFocus: next })
  }

  function toggleFocus(id: string) {
    const current = settings.weeklyFocus
    if (current.includes(id)) {
      update(profile, { weeklyFocus: current.filter((x) => x !== id) })
    } else if (current.length < MAX_FOCUS) {
      update(profile, { weeklyFocus: [...current, id] })
    }
  }

  function toggleModule(skillId: string) {
    const current = settings.moduleToggles[skillId] ?? true
    update(profile, { moduleToggles: { ...settings.moduleToggles, [skillId]: !current } })
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Tamaño de la misión diaria"
        hint={`Cuántas tarjetas trae la página de hoy (${missionMin}-${missionMax}).`}
      >
        <Stepper
          value={Math.min(missionMax, Math.max(missionMin, settings.missionSize))}
          min={missionMin}
          max={missionMax}
          suffix="tarjetas"
          onChange={(v) => update(profile, { missionSize: v })}
        />
      </Section>

      <Section
        title="Frecuencia de desafíos 🚀"
        hint="Cada cuánto aparece contenido del curso siguiente (solo si la base va bien)."
      >
        <div className="flex flex-wrap gap-2">
          {[0, 0.1, 0.2, 0.35, 0.5].map((f) => {
            const selected = Math.abs(settings.challengeFrequency - f) < 0.001
            return (
              <button
                key={f}
                type="button"
                onClick={() => update(profile, { challengeFrequency: f })}
                className="min-h-[44px] rounded-full px-4 text-sm font-bold transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
                style={
                  selected
                    ? { background: 'var(--navy)', color: '#fff' }
                    : { background: 'var(--bg)', color: 'var(--ink)' }
                }
              >
                {f === 0 ? 'Nunca' : `${Math.round(f * 100)}%`}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
          Ahora: {challengePercent === 0 ? 'sin desafíos' : `~${challengePercent}% de los días`}.
        </p>
      </Section>

      {hasOrtografia && (
        <Section
          title="Regla de ortografía de la semana ✏️"
          hint="Fija una regla y los dictados de la semana la trabajarán a fondo. Si no fijas ninguna, el motor elige la regla en la que va más floja."
        >
          <select
            aria-label="Regla de ortografía de la semana"
            value={pinnedRule}
            onChange={(e) => setPinnedRule(e.target.value)}
            className="min-h-[48px] w-full rounded-2xl px-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
          >
            <option value="">Automático (regla más floja)</option>
            <optgroup label="Catalán">
              {ORTOGRAFIA_RULE_IDS.filter((id) => ruleLang(id) === 'ca').map((id) => (
                <option key={id} value={id}>
                  {subskillLabel(id)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Castellano">
              {ORTOGRAFIA_RULE_IDS.filter((id) => ruleLang(id) === 'es').map((id) => (
                <option key={id} value={id}>
                  {subskillLabel(id)}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            {pinnedRule ? `Fijada: ${subskillLabel(pinnedRule)}.` : 'Ahora mismo: automático.'}
          </p>
        </Section>
      )}

      <Section
        title="Modo foco semanal"
        hint={`Elige hasta ${MAX_FOCUS} subtemas: el motor priorizará practicarlos esta semana.`}
      >
        <div className="flex flex-wrap gap-2">
          {allSubskills.map((def) => {
            const on = settings.weeklyFocus.includes(def.id)
            const disabled = !on && settings.weeklyFocus.length >= MAX_FOCUS
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => toggleFocus(def.id)}
                disabled={disabled}
                className="min-h-[44px] rounded-full px-3.5 text-sm font-semibold transition-transform active:translate-y-[1px] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
                style={
                  on
                    ? { background: 'var(--peach)', color: '#fff', boxShadow: '0 3px 0 #d98363' }
                    : { background: 'var(--bg)', color: 'var(--ink)' }
                }
              >
                {on ? '✓ ' : ''}
                {subskillLabel(def.id)}
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="Módulos activos"
        hint="Apaga una habilidad y sus tarjetas dejarán de aparecer en la página de hoy y en el entrenamiento libre (ese día trae una tarjeta menos)."
      >
        <div className="flex flex-col gap-2">
          {skillIds.map((skillId) => {
            const on = settings.moduleToggles[skillId] ?? true
            return (
              <div
                key={skillId}
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: 'var(--bg)' }}
              >
                <span className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  <span aria-hidden>{meta[skillId]?.emoji}</span>
                  {meta[skillId]?.name ?? skillId}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${meta[skillId]?.name ?? skillId}: ${on ? 'activo' : 'apagado'}`}
                  onClick={() => toggleModule(skillId)}
                  className="relative h-7 w-12 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
                  style={{ background: on ? 'var(--peach)' : 'rgba(30,58,95,.2)' }}
                >
                  <span
                    className="absolute top-1 h-5 w-5 rounded-full bg-white transition-[left]"
                    style={{ left: on ? 26 : 4 }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Pill } from '../../components/ui/Pill'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { IconTile } from '../../components/ui/IconTile'
import { Modal } from '../../components/ui/Modal'
import { voicesAvailable } from '../../lib/tts'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-black tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  )
}

/** Design kitchen-sink: every UI primitive in default + Leo-large sizes. */
export function KitchenSink() {
  const [modalOpen, setModalOpen] = useState(false)
  const voices = voicesAvailable()

  return (
    <main className="min-h-screen px-8 py-10" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-3xl font-black">Kitchen sink</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Voces locales: es {voices.es ? '✅' : '❌'} · ca {voices.ca ? '✅' : '❌'} · en{' '}
          {voices.en ? '✅' : '❌'}
        </p>

        <Section title="Button — default (md)">
          <Button variant="primary">Resolver ♡</Button>
          <Button variant="soft">Más tarde</Button>
          <Button variant="ghost">Saltar</Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
        </Section>

        <Section title="Button — Leo (lg)">
          <Button variant="primary" size="lg">
            ¡A jugar!
          </Button>
          <Button variant="soft" size="lg">
            Otra vez
          </Button>
        </Section>

        <Section title="Pill — tones (md / lg)">
          <Pill tone="peach">💎 128</Pill>
          <Pill tone="mint">🦁 Singapur</Pill>
          <Pill tone="sky">🔥 4</Pill>
          <Pill tone="navy">🛂 Pasaporte</Pill>
          <Pill tone="peach" size="lg">
            🔥 4
          </Pill>
        </Section>

        <Section title="IconTile — tones (md / lg)">
          <IconTile emoji="🦧" tone="peach" tilt />
          <IconTile emoji="🐢" tone="mint" />
          <IconTile emoji="🦁" tone="sky" />
          <IconTile emoji="⭐" tone="sun" />
          <IconTile emoji="🦖" tone="sky" size="lg" tilt />
        </Section>

        <Section title="SpeakButton — md / lg">
          <SpeakButton text="Hola, soy Aira" tone="peach" />
          <SpeakButton text="Bon dia" lang="ca-ES" tone="mint" />
          <SpeakButton text="Where is the tiger?" lang="en-US" tone="sky" />
          <SpeakButton text="¡Hola, Leo!" size="lg" tone="sky" />
        </Section>

        <Section title="ProgressBar — md / lg">
          <div className="w-64">
            <ProgressBar value={0.35} label="Ortografía" />
          </div>
          <div className="w-64">
            <ProgressBar value={0.8} color="var(--mint)" label="Cálculo" />
          </div>
          <div className="w-72">
            <ProgressBar value={0.6} size="lg" color="var(--sun)" label="Trazos" />
          </div>
        </Section>

        <Section title="Card — accents & sizes">
          <div className="w-72">
            <Card accent="var(--peach)">
              <div className="flex items-center gap-3">
                <IconTile emoji="🔢" tone="peach" tilt />
                <div>
                  <div className="font-extrabold">El problema del día</div>
                  <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                    Kinabatangan · con Tang
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <div className="w-72">
            <Card accent="var(--sky)" size="lg" interactive>
              <div className="text-center">
                <div className="text-5xl">✍️</div>
                <div className="mt-2 text-xl font-black">Trazos</div>
                <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  hoy: la L de Leo
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Modal">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="¡Bien hecho!">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
              Has completado la página de hoy. Aquí irían las celebraciones manga.
            </p>
            <div className="mt-4">
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Seguir
              </Button>
            </div>
          </Modal>
        </Section>
      </div>
    </main>
  )
}

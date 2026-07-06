import { ParentGate } from './parents/ParentGate'
import { ParentPanel } from './parents/ParentPanel'
import { useParentSession } from './parents/session'

/**
 * Parent area entry point, reached from the lock icon on the cover. Behind a
 * session PIN gate: locked → PIN entry (`ParentGate`), unlocked → the full
 * panel (`ParentPanel`). The unlock flag is session-only, so closing the tab
 * re-locks it and the kids can never wander in.
 */
export function ParentArea() {
  const unlocked = useParentSession((s) => s.unlocked)
  return unlocked ? <ParentPanel /> : <ParentGate />
}

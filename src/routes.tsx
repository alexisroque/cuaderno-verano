import {
  createHashRouter,
  Navigate,
  Outlet,
  useLocation,
  type RouteObject,
} from 'react-router'
import { useProfileStore } from './state/profileStore'
import { ProfileSelect } from './screens/ProfileSelect'
import { Today } from './screens/Today'
import { FreeTraining } from './screens/FreeTraining'
import { Collection } from './screens/Collection'
import { ParentArea } from './screens/ParentArea'
import { ProblemPlayer } from './screens/players/ProblemPlayer'
import { ComingSoonPlayer } from './screens/players/ComingSoonPlayer'
import { KitchenSink } from './screens/dev/KitchenSink'

/**
 * Redirects to profile select when no child is active and the destination
 * requires one. `/` (ProfileSelect) and any `/dev/*` route are always allowed
 * so the picker and the design kitchen-sink stay reachable.
 */
function RequireProfile() {
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { pathname } = useLocation()
  const exempt = pathname === '/' || pathname.startsWith('/dev')
  if (!activeProfile && !exempt) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export const routeConfig: RouteObject[] = [
  {
    element: <RequireProfile />,
    children: [
      { path: '/', element: <ProfileSelect /> },
      { path: '/hoy', element: <Today /> },
      { path: '/entrenar', element: <FreeTraining /> },
      { path: '/coleccion', element: <Collection /> },
      { path: '/padres', element: <ParentArea /> },
      { path: '/jugar/problema', element: <ProblemPlayer /> },
      { path: '/jugar/proximamente', element: <ComingSoonPlayer /> },
      { path: '/dev/kitchen-sink', element: <KitchenSink /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const router = createHashRouter(routeConfig)

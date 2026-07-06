import { RouterProvider } from 'react-router'
import { router } from './routes'
import { PwaBanners } from './components/PwaBanners'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaBanners />
    </>
  )
}

export default App

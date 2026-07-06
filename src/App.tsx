function App() {
  return (
    <main
      style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}
      className="flex min-h-screen items-center justify-center"
    >
      <div
        style={{ backgroundColor: 'var(--card)', borderRadius: 'var(--r-card)' }}
        className="px-10 py-8 text-center shadow-md"
      >
        <h1 style={{ color: 'var(--pow)' }} className="text-3xl font-bold">
          Cuaderno de Verano
        </h1>
        <p style={{ color: 'var(--ink-soft)' }} className="mt-2">
          Actividades para el verano
        </p>
      </div>
    </main>
  )
}

export default App

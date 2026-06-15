import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 sm:p-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-6 tracking-tight">
            TrackFlow
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
            Coming Soon!
          </p>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 text-sm text-slate-500 flex items-center justify-center gap-2">
          <span>Edit</span>
          <code className="bg-slate-200 px-2 py-1 rounded text-slate-700 font-mono text-xs">src/App.tsx</code>
          <span>to see changes instantly.</span>
        </div>
      </div>
    </div>
  )
}

export default App

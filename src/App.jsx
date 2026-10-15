import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AlertCircle, Camera, ChevronLeft, Clock3, Lock, LogOut, Mail, Sparkles, X } from 'lucide-react'
import apiClient from './apiClient'
import './App.css'

const TIER_META = {
  1: { name: 'Optimal', color: '#f68aa8' },
  2: { name: 'Mild', color: '#d76fb0' },
  3: { name: 'Moderate', color: '#8b5cc7' },
  4: { name: 'Severe', color: '#5c6dde' },
  5: { name: 'Critical', color: '#7ca7cf' },
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('opticycle_token'))

  const handleLogout = () => {
    apiClient.logout()
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const isRegistering = mode === 'register'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegistering) {
        await apiClient.register(email, password)
      } else {
        await apiClient.login(email, password)
      }
      onLogin()
      navigate('/')
    } catch (err) {
      setError(err.message || 'Unable to connect. Check that the API is running and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5fa] px-4 py-10">
      <div className="w-full max-w-sm rounded-[28px] border border-slate-200/80 bg-[#f8f9fb] p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <span className="block h-4 w-4 rounded-full border-[3px] border-slate-700 bg-white" />
          </div>
          <div className="text-3xl font-semibold tracking-[-0.06em] text-slate-800">OptiCycle</div>
        </div>

        <h1 className="mb-5 text-center text-lg font-semibold text-slate-700">
          {isRegistering ? 'Create your account' : 'Welcome back'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:ring-2 focus-within:ring-slate-200">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm focus-within:ring-2 focus-within:ring-slate-200">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                minLength={isRegistering ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegistering ? 'At least 8 characters' : 'Password'}
                className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-pink-300 to-pink-400 px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(244,138,165,0.35)] transition hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {error && <p role="alert" className="mt-4 text-center text-sm text-rose-600">{error}</p>}

        <div className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            disabled={loading}
            onClick={() => { setMode(isRegistering ? 'login' : 'register'); setError('') }}
            className="font-medium text-pink-500 hover:text-pink-600"
          >
            {isRegistering ? 'Already have an account? Sign in' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [capturedImage, setCapturedImage] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const capturedFileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    const enableCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is unavailable. Use a current browser on localhost or HTTPS.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraError('')
      } catch (err) {
        if (active) {
          setCameraError(err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
            : 'Could not start the camera. Check that it is connected and not being used by another app.')
        }
      }
    }

    enableCamera()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraAttempt])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('Camera is not ready yet. Wait a moment and try again.')
      return
    }
    setError('')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('This browser could not capture the image. Try another browser.')
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setError('Could not capture the image. Please try again.')
      return
    }
    capturedFileRef.current = new File([blob], 'capture.png', { type: 'image/png' })
    setCapturedImage(canvas.toDataURL('image/png'))
    setAnalysisResult(null)
    setStatusMessage('Photo captured. Review it, then choose Analyse Patch.')
  }

  const handleAnalyze = async () => {
    if (!capturedFileRef.current) {
      setError('Capture a photo before starting the analysis.')
      return
    }
    setBusy(true)
    setError('')
    setStatusMessage('Analyzing photo...')
    try {
      const result = await apiClient.analyzeFile(capturedFileRef.current)
      setAnalysisResult(result)
      setStatusMessage('Analysis complete.')
    } catch (err) {
      setError(err.message || 'Could not analyze this photo. Check your connection and try again.')
      setStatusMessage('')
    } finally {
      setBusy(false)
    }
  }

  const handleRetake = () => {
    capturedFileRef.current = null
    setCapturedImage('')
    setAnalysisResult(null)
    setError('')
    setStatusMessage('')
  }

  const handleShowHistory = async () => {
    setIsHistoryOpen(true)
    setHistoryLoading(true)
    setError('')
    try {
      const result = await apiClient.getHistory()
      setHistory(result.scans)
    } catch (err) {
      setError(err.message || 'Could not load scan history.')
      setIsHistoryOpen(false)
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeHistory = () => setIsHistoryOpen(false)
  const tierId = analysisResult?.analysis?.tier ?? analysisResult?.record?.tier
  const tier = TIER_META[tierId]
  const remedies = analysisResult?.record?.remedies ?? []
  const statusLabel = analysisResult?.record?.statusLabel

  return (
    <div className="min-h-screen bg-[#edf0f7] px-3 py-6 sm:px-4">
      <div className="mx-auto max-w-[480px] rounded-[32px] bg-[#f8fafc] shadow-[0_26px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
        <div className="relative overflow-hidden rounded-[30px] bg-[#f8fafc] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                <span className="block h-4 w-4 rounded-full border-[3px] border-slate-700 bg-white" />
              </div>
              <span className="text-[17px] font-semibold tracking-[-0.05em] text-slate-700">OptiCycle</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleShowHistory} aria-label="View scan history" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <Clock3 size={19} />
              </button>
              <button type="button" onClick={() => { onLogout(); navigate('/login') }} aria-label="Sign out" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <LogOut size={19} />
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[26px] bg-[#efe7e1] shadow-inner ring-1 ring-slate-200">
            <video ref={videoRef} className={`h-[min(560px,65vh)] min-h-[340px] w-full object-cover ${capturedImage ? 'hidden' : ''}`} playsInline muted autoPlay />
            {capturedImage ? (
              <div className="flex h-[min(560px,65vh)] min-h-[340px] items-center justify-center bg-slate-900/5 p-6">
                <img src={capturedImage} alt="Captured photo preview" className="max-h-full max-w-full rounded-3xl object-contain shadow-2xl" />
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-52 w-52 rounded-[28px] border-[3px] border-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                  <div className="absolute inset-4 rounded-[18px] border-[2px] border-white/80" />
                </div>
              </div>
            )}
          </div>

          {cameraError && !capturedImage && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Camera size={18} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{cameraError}</p>
                <button type="button" onClick={() => { setCameraError(''); setCameraAttempt((attempt) => attempt + 1) }} className="mt-2 font-semibold underline">
                  Try camera again
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            {!capturedImage ? (
              <button type="button" disabled={busy || !!cameraError} onClick={handleCapture} className="w-full rounded-2xl bg-gradient-to-r from-pink-300 to-pink-400 px-4 py-3 font-semibold text-white shadow-[0_12px_24px_rgba(244,138,165,0.35)] disabled:cursor-not-allowed disabled:opacity-50">
                Capture Photo
              </button>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={handleAnalyze} className="flex-1 rounded-2xl bg-gradient-to-r from-pink-300 to-pink-400 px-4 py-3 font-semibold text-white shadow-[0_12px_24px_rgba(244,138,165,0.35)] disabled:cursor-wait disabled:opacity-60">
                  {busy ? 'Analyzing...' : analysisResult ? 'Analyze Again' : 'Analyse Patch'}
                </button>
                <button type="button" disabled={busy} onClick={handleRetake} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm disabled:opacity-60">
                  Retake Photo
                </button>
              </>
            )}
          </div>

          {statusMessage && <p aria-live="polite" className="mt-3 text-center text-sm text-slate-600">{statusMessage}</p>}
          {error && <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

          {analysisResult && (
            <section aria-label="Analysis result" className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-[#fbf2f5] p-3 ring-1 ring-pink-100">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-[6px] border-white shadow-inner" style={{ background: tier?.color ?? '#e2e8f0' }}>
                  <span className="h-4 w-4 rounded-full bg-white/80" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Color estimate</div>
                  <div className="mt-1 text-xl font-semibold text-slate-800">{tier?.name ?? 'Unknown'}</div>
                </div>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-700">Tier {tierId ?? '-'}</span>
              </div>
              {statusLabel && <div className="flex items-center gap-2 rounded-2xl bg-[#fff7fb] p-3 text-sm font-semibold text-slate-700 ring-1 ring-pink-100"><Sparkles size={16} className="shrink-0 text-pink-500" />{statusLabel}</div>}
              {remedies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {remedies.map((remedy) => <span key={remedy} className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">{remedy}</span>)}
                </div>
              )}
            </section>
          )}

          <p className="mt-5 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">
            Prototype only: this color estimate is not a diagnosis or a substitute for medical advice. Do not use it to make treatment decisions.
          </p>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-3 sm:items-center">
          <section role="dialog" aria-modal="true" aria-labelledby="history-title" className="w-full max-w-md rounded-t-[30px] bg-[#f8fafc] p-5 shadow-xl sm:rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={closeHistory} aria-label="Close scan history" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
              <h2 id="history-title" className="font-semibold text-slate-700">Scan History</h2>
              <button type="button" onClick={closeHistory} aria-label="Close scan history" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {historyLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading history...</p> : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No saved scans yet.</p>
            ) : (
              <ul className="max-h-[60vh] space-y-3 overflow-y-auto">
                {history.map((scan) => {
                  const scanTier = TIER_META[scan.tier]
                  return (
                    <li key={scan.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                      <div className="h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: scanTier?.color ?? '#e2e8f0' }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-700">{scanTier?.name ?? scan.statusLabel ?? 'Scan'} · Tier {scan.tier}</p>
                        <p className="text-xs text-slate-500">{new Date(scan.createdAt).toLocaleString()}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App

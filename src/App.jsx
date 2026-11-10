import { useState, useEffect, lazy, Suspense } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import { Loader } from 'lucide-react'
import './App.css'

// ---------------------------------------------------------------------------
// Lazy-Loaded Page Components (Code Splitting / Dynamic Chunking)
// Chunks are loaded on-demand when the route or action is visited.
// ---------------------------------------------------------------------------
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))

function PageFallback() {
  return (
    <div className="state-box" style={{ minHeight: '320px', margin: '2rem 0' }} role="status" aria-live="polite">
      <Loader size={30} className="spin" />
      <p style={{ marginTop: '0.5rem', color: 'var(--steel)' }}>Loading view…</p>
    </div>
  )
}

function App() {
  // Inspect deep-linked gun in URL query (?gun=...)
  const [initialDeepLink] = useState(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const gunParam = params.get('gun')
    if (!gunParam) return null
    const localMatch = GUNS_LOCAL.find(
      (g, idx) =>
        String(g.id || `local-${idx}`) === gunParam ||
        g.name === gunParam,
    )
    return { gunParam, localMatch }
  })

  const [showSplash, setShowSplash] = useState(() => !initialDeepLink?.localMatch)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState(() => (initialDeepLink?.localMatch ? 'detail' : 'list'))
  const [selectedGun, setSelectedGun] = useState(() => initialDeepLink?.localMatch || null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Asynchronously resolve API deep link if not found locally
  useEffect(() => {
    if (initialDeepLink?.gunParam && !initialDeepLink.localMatch) {
      gunService
        .getGunById(initialDeepLink.gunParam)
        .then((res) => {
          if (res && (res.data || res.success)) {
            setSelectedGun(res.data || res)
            setMode('detail')
            setShowSplash(false)
          }
        })
        .catch(() => {
          /* Fallback gracefully */
        })
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search)
      if (!p.get('gun')) {
        setMode('list')
        setSelectedGun(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initialDeepLink])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      const id = payload?.id || payload?.name
      if (id) {
        window.history.pushState(null, '', `?gun=${encodeURIComponent(id)}`)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      if (window.location.search.includes('gun=')) {
        window.history.pushState(null, '', window.location.pathname)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    if (window.location.search.includes('gun=')) {
      window.history.pushState(null, '', window.location.pathname)
    }
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<PageFallback />}>
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onReplaySplash={() => setShowSplash(true)}
                  onNavigate={handleNavigate}
                />
              )}
              {tab === 'About' && (
                <ProfilePage
                  initialSection="about"
                  onReplaySplash={() => setShowSplash(true)}
                  onNavigate={handleNavigate}
                />
              )}
              {tab === 'Contact' && (
                <ProfilePage
                  initialSection="contact"
                  onReplaySplash={() => setShowSplash(true)}
                  onNavigate={handleNavigate}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App

import { Plus } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'
import { useArchive } from '../hooks/useArchive'

const NAV_ITEMS = [
  { id: 'Catalog', label: 'Catalog' },
  { id: 'Favorites', label: 'Favorites', badgeKey: 'fav' },
  { id: 'Archive', label: 'Archive', badgeKey: 'archive' },
  { id: 'Profile', label: 'Profile' },
]

function Header({ tab, onTab, onNavigateCreate }) {
  const { favorites } = useFavorites()
  const favCount = favorites ? favorites.length : 0
  const { archivedCount } = useArchive()

  return (
    <header className="header">
      <div className="header-brand-wrap" onClick={() => onTab('Catalog')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="header-logo-badge">
          <img src="/logo.png" alt="Bore & Barrel" />
        </div>
        <span className="brand display">Bore &amp; Barrel</span>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'nav-link active' : 'nav-link'}
            onClick={() => onTab(item.id)}
          >
            {item.label}
            {item.badgeKey === 'fav' && favCount > 0 && (
              <span className="nav-badge">{favCount}</span>
            )}
            {item.badgeKey === 'archive' && archivedCount > 0 && (
              <span className="nav-badge nav-badge--archive">{archivedCount}</span>
            )}
          </button>
        ))}
      </nav>

      {onNavigateCreate && (
        <button
          type="button"
          className="btn btn--primary btn--sm header-cta"
          onClick={onNavigateCreate}
          title="Register new hardware"
        >
          <Plus size={15} /> Add Hardware
        </button>
      )}
    </header>
  )
}

export default Header

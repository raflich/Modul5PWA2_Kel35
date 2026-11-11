import { useState, useMemo } from 'react'
import {
  Archive,
  ArrowLeft,
  Search,
  Check,
  PackageOpen,
} from 'lucide-react'
import { useArchive } from '../hooks/useArchive'
import GunCard from '../components/gun/GunCard'
import ConfirmModal from '../components/modals/ConfirmModal'
import { matchesSearch } from '../utils/helpers'

/**
 * ArchivePage — Dedicated view for archived catalog pieces (Soft Delete).
 *
 * Supports:
 *  - Listing all archived hardware pieces with time of archiving.
 *  - Search filtering across archived items.
 *  - Restoring items back to the active catalog (Pulihkan).
 *  - Permanently deleting items from both archive and backend (Hapus Permanen).
 */
export default function ArchivePage({ onNavigateCatalog, onSelectGun }) {
  const { archivedGuns, restoreGun, deletePermanently } = useArchive()
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Filter archived guns by search term
  const filteredArchived = useMemo(() => {
    return archivedGuns.filter((g) => matchesSearch(g, search))
  }, [archivedGuns, search])

  // Restore gun back to active catalog
  const handleRestore = async (gun) => {
    const id = gun.id || gun.name
    await restoreGun(id)
    setFeedback(`"${gun.name}" berhasil dipulihkan ke katalog utama.`)
    setTimeout(() => setFeedback(''), 3500)
  }

  // Confirm permanent deletion
  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return
    try {
      setDeleting(true)
      const id = permanentDeleteTarget.id || permanentDeleteTarget.name
      await deletePermanently(id)
      setFeedback(`"${permanentDeleteTarget.name}" telah dihapus secara permanen.`)
      setPermanentDeleteTarget(null)
      setTimeout(() => setFeedback(''), 3500)
    } catch {
      setFeedback('Gagal menghapus data secara permanen.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="archive-page">
      {/* Header */}
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="badge badge--warning">SOFT DELETE ARCHIVE</span>
            <span className="count-badge">{archivedGuns.length}</span>
          </div>
          <h1 className="display">Hardware Archive</h1>
          <p className="lede">
            Katalog hardware yang diarsipkan. Senjata di halaman ini disembunyikan dari katalog utama,
            dan dapat dipulihkan kembali sewaktu-waktu atau dihapus secara permanen.
          </p>
        </div>

        {onNavigateCatalog && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={onNavigateCatalog}
          >
            <ArrowLeft size={16} /> Kembali ke Katalog
          </button>
        )}
      </section>

      {/* Toast Feedback */}
      {feedback && (
        <div className="toast toast--success" style={{ marginBottom: '16px' }}>
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Search Bar (if there are archived items) */}
      {archivedGuns.length > 0 && (
        <div className="archive-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div className="filter-search-box" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={16} className="filter-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari hardware di arsip..."
              className="filter-search-input"
            />
            {search && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.88rem', color: 'var(--steel)' }}>
            Menampilkan {filteredArchived.length} dari {archivedGuns.length} hardware arsip
          </div>
        </div>
      )}

      {/* Main Content */}
      {archivedGuns.length === 0 ? (
        <div className="state-box">
          <Archive size={42} stroke="var(--steel)" />
          <h3>Arsip Masih Kosong</h3>
          <p className="lede">
            Belum ada senjata atau hardware yang diarsipkan. Anda dapat mengarsipkan item dari katalog
            menggunakan tombol arsip (ikon kotak 📦) pada kartu senjata.
          </p>
          {onNavigateCatalog && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onNavigateCatalog}
              style={{ marginTop: '16px' }}
            >
              <ArrowLeft size={16} /> Buka Katalog Utama
            </button>
          )}
        </div>
      ) : filteredArchived.length === 0 ? (
        <div className="state-box">
          <PackageOpen size={32} stroke="var(--steel)" />
          <p>Tidak ada hardware arsip yang cocok dengan pencarian "{search}".</p>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setSearch('')}
            style={{ marginTop: '12px' }}
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <ul className="stock">
          {filteredArchived.map((gun) => (
            <GunCard
              key={gun.id || gun.name}
              gun={gun}
              onSelect={onSelectGun || (() => {})}
              isArchived={true}
              onRestore={handleRestore}
              onDelete={setPermanentDeleteTarget}
            />
          ))}
        </ul>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmModal
        open={Boolean(permanentDeleteTarget)}
        title="Hapus Permanen dari Database"
        message={`Apakah Anda yakin ingin menghapus "${permanentDeleteTarget?.name}" secara permanen? Data akan dihapus sepenuhnya dari server/database dan tidak dapat dipulihkan lagi.`}
        confirmLabel="Hapus Permanen"
        cancelLabel="Batal"
        danger
        loading={deleting}
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => setPermanentDeleteTarget(null)}
      />
    </div>
  )
}

import { Archive, RotateCcw } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import LazyImage from '../common/LazyImage'
import { formatPrice, truncate } from '../../utils/helpers'

/**
 * Product card used in the catalog and archive grid.
 *
 * @param {Object}   props
 * @param {Object}   props.gun        — product data
 * @param {Function} props.onSelect   — called with the gun when clicked
 * @param {Function} [props.onEdit]   — called when Edit is clicked (admin)
 * @param {Function} [props.onDelete] — called when Delete is clicked
 * @param {Function} [props.onArchive]— called when Archive is clicked (soft delete)
 * @param {Function} [props.onRestore]— called when Restore is clicked
 * @param {boolean}  [props.isArchived=false] — whether this card is displayed in archive
 */
export default function GunCard({
  gun,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  isArchived = false,
}) {
  const imgSrc = gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  return (
    <li className={`card ${isArchived ? 'card--archived' : ''}`}>
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <LazyImage
            className="card-img"
            wrapperClassName="card-img-wrapper"
            src={imgSrc}
            alt={gun.name}
            width={240}
            height={180}
            fallbackSrc="/guns/pistol.svg"
            rootMargin="50px 0px"
          />
          {isArchived && (
            <span className="card-archive-badge">
              <Archive size={11} /> ARSIP
            </span>
          )}
        </div>

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <span className="price">{formatPrice(price)}</span>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        {!isArchived && <ShareButton gun={gun} />}
        {!isArchived && <FavoriteButton gunId={gun.id || gun.name} />}

        {onEdit && !isArchived && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {/* Restore button (in archive view) */}
        {onRestore && (
          <button
            type="button"
            className="card-act-btn card-act-btn--restore"
            onClick={(e) => { e.stopPropagation(); onRestore(gun) }}
            aria-label={`Pulihkan ${gun.name}`}
            title="Pulihkan ke Katalog"
          >
            <RotateCcw size={15} stroke="var(--brass)" />
          </button>
        )}

        {/* Archive button (in active catalog view) */}
        {onArchive && !isArchived && (
          <button
            type="button"
            className="card-act-btn card-act-btn--archive"
            onClick={(e) => { e.stopPropagation(); onArchive(gun) }}
            aria-label={`Arsipkan ${gun.name}`}
            title="Arsipkan (Soft Delete)"
          >
            <Archive size={15} />
          </button>
        )}

        {/* Delete button (or permanent delete in archive) */}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(gun) }}
            aria-label={isArchived ? `Hapus permanen ${gun.name}` : `Delete ${gun.name}`}
            title={isArchived ? "Hapus Permanen" : "Delete"}
          >
            🗑️
          </button>
        )}
      </div>
    </li>
  )
}

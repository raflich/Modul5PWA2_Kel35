import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination — Responsive pagination control for product lists.
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current active page number (1-based)
 * @param {number} props.totalPages - Total calculated pages
 * @param {number} props.totalItems - Total item count across all pages
 * @param {number} [props.itemsPerPage=10] - Number of items shown per page
 * @param {Function} props.onPageChange - Callback receiving new page number
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages]
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const pages = getPages()

  return (
    <nav className="pagination" aria-label="Catalog pagination">
      <div className="pagination-info">
        Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> pieces
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn--outline btn--sm pagination-nav"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="pagination-pages">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="pagination-ellipsis">
                  &hellip;
                </span>
              )
            }
            const isActive = p === currentPage
            return (
              <button
                key={p}
                type="button"
                className={`pagination-num ${isActive ? 'pagination-num--active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="btn btn--outline btn--sm pagination-nav"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}


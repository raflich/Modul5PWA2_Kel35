import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  Archive,
  RotateCcw,
  Check,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Images,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import LazyImage from '../common/LazyImage'
import ConfirmModal from '../modals/ConfirmModal'
import { useArchive } from '../../hooks/useArchive'
import {
  useReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  useVoteReview,
} from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'

/**
 * Full-screen product detail view.
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onBack    — return to catalog
 * @param {Function} [props.onEdit]  — navigate to edit page
 * @param {Function} [props.onDelete]— trigger delete flow
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete }) {
  // Multiple images gallery
  const galleryImages = Array.isArray(gun.images) && gun.images.length > 0
    ? gun.images.filter(Boolean)
    : [gun.image_url || gun.image || '/guns/pistol.svg']
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const activeImage = galleryImages[activeImageIndex] || galleryImages[0]

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
  }

  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Reviews
  const currentUserId = getUserIdentifier()
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const { updateReview, loading: updatingReview } = useUpdateReview()
  const { deleteReview, loading: deletingReview } = useDeleteReview()
  const { voteReview, getReaction } = useVoteReview()
  const { isArchived, archiveGun, restoreGun } = useArchive()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [archiveFeedback, setArchiveFeedback] = useState('')

  // State for editing user's own review
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [editError, setEditError] = useState('')

  // State for deleting review confirmation modal
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null)

  // Local reaction overrides to provide instantaneous UI updates
  const [reactions, setReactions] = useState({})

  const isItemArchived = isArchived(gun.id || gun.name) || Boolean(gun.is_archived)

  const handleToggleArchive = async () => {
    if (isItemArchived) {
      await restoreGun(gun.id || gun.name)
      setArchiveFeedback('Hardware berhasil dipulihkan ke katalog utama.')
    } else {
      await archiveGun(gun)
      setArchiveFeedback('Hardware berhasil dipindahkan ke arsip (soft delete).')
    }
    setTimeout(() => setArchiveFeedback(''), 3500)
  }

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: getUserIdentifier(),
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  // Helper to resolve reaction state for a review
  const getReactionState = (rev) => {
    if (reactions[rev.id]) return reactions[rev.id]
    const stored = getReaction(rev.id, currentUserId)
    return {
      likes: stored.likes ?? rev.likes ?? 0,
      dislikes: stored.dislikes ?? rev.dislikes ?? 0,
      userVote: stored.userVote || null,
    }
  }

  // Handle Like / Dislike voting for reviews by other operators
  const handleVote = async (revId, voteType) => {
    const res = await voteReview(revId, voteType, currentUserId)
    if (res && res.success) {
      setReactions((prev) => ({
        ...prev,
        [revId]: res.data,
      }))
    }
  }

  const handleStartEdit = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating || 5)
    setEditComment(rev.comment || '')
    setEditError('')
  }

  const handleCancelEdit = () => {
    setEditingReviewId(null)
    setEditError('')
  }

  const handleSaveEdit = async (revId) => {
    if (editRating < 1 || editRating > 5) {
      setEditError('Rating must be between 1 and 5.')
      return
    }
    const success = await updateReview(gun.id, revId, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (success) {
      setEditingReviewId(null)
      refetchReviews()
      setReviewSuccess('Ulasan berhasil diperbarui!')
      setTimeout(() => setReviewSuccess(''), 3000)
    } else {
      setEditError('Gagal memperbarui ulasan.')
    }
  }

  const handleConfirmDeleteReview = async () => {
    if (!deleteReviewTarget) return
    const success = await deleteReview(gun.id, deleteReviewTarget.id)
    if (success) {
      setDeleteReviewTarget(null)
      refetchReviews()
      setReviewSuccess('Ulasan Anda telah dihapus.')
      setTimeout(() => setReviewSuccess(''), 3000)
    }
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-gallery">
          <div className="detail-img-wrapper">
            <LazyImage
              className="detail-img"
              src={activeImage}
              alt={`${gun.name} - asset ${activeImageIndex + 1}`}
              fallbackSrc="/guns/pistol.svg"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--prev"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  title="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-btn gallery-nav-btn--next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  title="Next image"
                >
                  <ChevronRight size={20} />
                </button>
                <span className="gallery-counter">
                  <Images size={12} /> {activeImageIndex + 1} / {galleryImages.length}
                </span>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="detail-thumbs-strip" role="tablist" aria-label="Product image thumbnails">
              {galleryImages.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeImageIndex}
                  className={`gallery-thumb ${idx === activeImageIndex ? 'gallery-thumb--active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                  title={`View image ${idx + 1}`}
                >
                  <img src={url} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          {archiveFeedback && (
            <div className="toast toast--success" style={{ margin: '8px 0' }}>
              <Check size={16} /> {archiveFeedback}
            </div>
          )}

          {isItemArchived && (
            <div style={{ margin: '6px 0' }}>
              <span className="badge badge--warning">
                <Archive size={12} /> STATUS: DIARSIPKAN
              </span>
            </div>
          )}

          <div className="detail-actions">
            <ShareButton gun={gun} variant="button" />
            <FavoriteButton gunId={gun.id || gun.name} />
            {isItemArchived ? (
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleToggleArchive}
                title="Pulihkan hardware ini ke katalog aktif"
              >
                <RotateCcw size={16} stroke="var(--brass)" /> Pulihkan
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleToggleArchive}
                title="Pindahkan hardware ini ke arsip (soft delete)"
              >
                <Archive size={16} /> Arsipkan
              </button>
            )}
            {onEdit && !isItemArchived && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications (from ingredients / steps if present) */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section */}
      <section className="detail-section">
        <h2>Reviews</h2>

        {/* Submit review */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a short review (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID. This product is local-only.
            </p>
          )}
        </form>

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isEditing = editingReviewId === rev.id
              const isOwnReview = Boolean(
                currentUserId &&
                (String(rev.user_id) === String(currentUserId) ||
                 rev.user_identifier === currentUserId ||
                 rev.user_identifier === `Operator ${String(currentUserId).substring(0, 8)}`)
              )
              const reaction = getReactionState(rev)

              return (
                <li key={rev.id} className={`review-item ${isOwnReview ? 'review-item--own' : ''}`}>
                  <div className="review-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                      {isOwnReview && <span className="review-own-badge">Ulasan Anda</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {!isEditing && (
                        <span className="review-stars-display">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < rev.rating ? 'var(--brass)' : 'none'}
                              stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                            />
                          ))}
                        </span>
                      )}

                      {/* Edit / Delete actions for own review */}
                      {isOwnReview && !isEditing && (
                        <div className="review-actions-own">
                          <button
                            type="button"
                            className="review-icon-btn"
                            onClick={() => handleStartEdit(rev)}
                            title="Edit ulasan Anda"
                            aria-label="Edit ulasan"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="review-icon-btn review-icon-btn--danger"
                            onClick={() => setDeleteReviewTarget(rev)}
                            title="Hapus ulasan Anda"
                            aria-label="Hapus ulasan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* If currently editing this review */}
                  {isEditing ? (
                    <div className="review-edit-box">
                      <div className="review-stars" style={{ marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                            aria-label={`${n} star`}
                          >
                            <Star
                              size={20}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="review-input"
                        rows="3"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Ubah ulasan Anda..."
                        maxLength={500}
                      />
                      {editError && <p className="form-error">{editError}</p>}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEdit(rev.id)}
                          disabled={updatingReview}
                        >
                          {updatingReview ? 'Menyimpan…' : 'Simpan Perubahan'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={handleCancelEdit}
                          disabled={updatingReview}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}

                      {/* Voting for reviews made by other operators */}
                      {!isOwnReview ? (
                        <div className="review-reactions">
                          <button
                            type="button"
                            className={`review-vote-btn ${reaction.userVote === 'like' ? 'review-vote-btn--active' : ''}`}
                            onClick={() => handleVote(rev.id, 'like')}
                            title="Suka ulasan ini (Thumbs Up)"
                          >
                            <ThumbsUp size={13} />
                            <span>{reaction.likes}</span>
                          </button>
                          <button
                            type="button"
                            className={`review-vote-btn ${reaction.userVote === 'dislike' ? 'review-vote-btn--active-dislike' : ''}`}
                            onClick={() => handleVote(rev.id, 'dislike')}
                            title="Tidak suka ulasan ini (Thumbs Down)"
                          >
                            <ThumbsDown size={13} />
                            <span>{reaction.dislikes}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="review-reactions-info">
                          <span title="Dukungan pada ulasan Anda">
                            👍 {reaction.likes} · 👎 {reaction.dislikes}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
      </section>

      {/* Confirmation Modal for Review Deletion */}
      <ConfirmModal
        open={Boolean(deleteReviewTarget)}
        title="Hapus Ulasan Anda"
        message="Apakah Anda yakin ingin menghapus ulasan ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Ulasan"
        cancelLabel="Batal"
        danger
        loading={deletingReview}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setDeleteReviewTarget(null)}
      />
    </div>
  )
}

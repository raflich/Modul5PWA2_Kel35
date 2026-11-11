import { useState, useEffect } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Camera,
  Play,
  Database,
  RotateCcw,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Info,
  X,
  ArrowRight,
  Plus,
  Archive,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { useArchive } from '../hooks/useArchive'
import queryCache from '../utils/queryCache'
import {
  getAllDrafts,
  deleteDraft,
  clearAllDrafts,
  formatDraftTime,
} from '../utils/draftStorage'
import { formatPrice } from '../utils/helpers'

/**
 * Get count of cached queries in localStorage
 */
const getQueryCacheCount = () => {
  try {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('bore_barrel_qc_')) {
        count++
      }
    }
    return count
  } catch {
    return 0
  }
}

/**
 * ProfilePage — Comprehensive Operator Profile, Saved Drafts, About, & Contact.
 *
 * Features:
 *  - Operator identity card with callsign, bio notes, stats, and Edit Profile modal.
 *  - Dedicated Saved Drafts section to view, resume, or delete form drafts.
 *  - Integrated About and Contact sections moved from navbar into profile.
 */
export default function ProfilePage({ onReplaySplash, onNavigate, initialSection }) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Drafts state
  const [drafts, setDrafts] = useState(() => getAllDrafts())

  // Cache stats
  const { favorites } = useFavorites()
  const { archivedCount } = useArchive()
  const [cacheCount, setCacheCount] = useState(getQueryCacheCount)

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editUsername, setEditUsername] = useState(profile.username || 'Shooter')
  const [editBio, setEditBio] = useState(profile.bio || '')
  const [editAvatar, setEditAvatar] = useState(profile.avatar || null)

  // Auto-scroll to initial section if specified (e.g. from navbar redirects)
  useEffect(() => {
    if (initialSection) {
      const el = document.getElementById(initialSection)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [initialSection])

  const refreshDrafts = () => {
    setDrafts(getAllDrafts())
  }

  const handleClearCache = () => {
    queryCache.clear()
    setCacheCount(0)
    setFeedback('Query cache successfully purged.')
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Open Edit Profile Modal
  const handleOpenEditModal = () => {
    setEditUsername(profile.username || 'Shooter')
    setEditBio(profile.bio || '')
    setEditAvatar(profile.avatar || null)
    setIsEditModalOpen(true)
  }

  const handleAvatarFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Avatar image must be under 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setEditAvatar(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfileModal = (e) => {
    e.preventDefault()
    const updated = {
      ...profile,
      username: editUsername.trim() || 'Shooter',
      bio: editBio.trim(),
      avatar: editAvatar,
    }
    const result = userService.saveUserProfile(updated)
    if (result.success) {
      setProfile(result.data)
      setIsEditModalOpen(false)
      setFeedback('Profile successfully updated.')
      setTimeout(() => setFeedback(''), 3000)
    } else {
      setFeedback('Failed to save profile.')
    }
  }

  // Resume Draft
  const handleResumeDraft = (draft) => {
    if (onNavigate) {
      if (draft.id === 'create') {
        onNavigate('Create')
      } else {
        onNavigate('Edit', { id: draft.id, ...(draft.formData || {}) })
      }
    }
  }

  // Delete single draft
  const handleDeleteDraft = (draftId) => {
    deleteDraft(draftId)
    refreshDrafts()
    setFeedback('Draft removed.')
    setTimeout(() => setFeedback(''), 2500)
  }

  // Clear all drafts
  const handleClearAllDrafts = () => {
    clearAllDrafts()
    refreshDrafts()
    setFeedback('All saved drafts cleared.')
    setTimeout(() => setFeedback(''), 2500)
  }

  return (
    <div className="profile-page">
      {/* Header Masthead */}
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display">Operator Profile &amp; Armory</h1>
          <p className="lede">
            Operator credentials, offline drafts, armory standards, and range station.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory splash animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* Toast Feedback */}
      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Quick Nav Anchors */}
      <div className="profile-quick-nav">
        <a href="#operator-card" className="profile-nav-pill">Operator</a>
        <a href="#drafts" className="profile-nav-pill">
          Drafts {drafts.length > 0 && <span className="pill-badge">{drafts.length}</span>}
        </a>
        <a href="#about" className="profile-nav-pill">About</a>
        <a href="#contact" className="profile-nav-pill">Contact</a>
      </div>

      {/* ===================================================================
       * 1. OPERATOR CARD
       * =================================================================== */}
      <div id="operator-card" className="profile-card">
        <div className="profile-card-top" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="avatar-wrap">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={36} stroke="var(--brass)" />
                </div>
              )}
            </div>

            <div className="profile-identity">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 className="display" style={{ margin: 0 }}>{profile.username || 'Shooter'}</h2>
                <span className="badge badge--neutral">Registered Operator</span>
              </div>
              <div className="profile-id-row" style={{ marginTop: '6px' }}>
                <span className="mono-badge" title="Persistent UUID">{profile.userId}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleCopyId}
                  title="Copy User ID to clipboard"
                >
                  {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            type="button"
            className="btn btn--primary btn--sm edit-profile-trigger"
            onClick={handleOpenEditModal}
            title="Edit callsign, bio notes, and avatar"
          >
            <Edit3 size={15} /> Edit Profile
          </button>
        </div>

        {/* Armorer Notes & Station Bio */}
        <div className="profile-bio-box">
          <span className="profile-bio-label">Armorer Notes &amp; Station Bio</span>
          <p className="profile-bio-text">
            {profile.bio
              ? profile.bio
              : 'No operator qualifications or armory notes recorded yet. Click "Edit Profile" to add your callsign details and notes.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
          <div className="stat-item">
            <Database size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{cacheCount}</div>
            <div className="stat-label">Cached Queries</div>
          </div>
          <div
            className="stat-item"
            onClick={() => onNavigate && onNavigate('Archive')}
            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
            title="Buka halaman Arsip Hardware"
          >
            <Archive size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{archivedCount}</div>
            <div className="stat-label">Archived Hardware</div>
          </div>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleClearCache}
            title="Purge stored query cache"
          >
            <RotateCcw size={14} /> Clear Query Cache
          </button>
        </div>
      </div>

      {/* ===================================================================
       * 2. SECTION: HARDWARE DRAFTS
       * =================================================================== */}
      <section id="drafts" className="profile-section">
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} stroke="var(--brass)" />
            <h2 className="display section-title">Catalog Drafts</h2>
            <span className="count-badge">{drafts.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {drafts.length > 1 && (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={handleClearAllDrafts}
              >
                Clear All Drafts
              </button>
            )}
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={14} /> New Hardware
              </button>
            )}
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="state-box draft-empty-box">
            <FileText size={34} stroke="var(--steel)" />
            <h3>No Hardware Drafts Saved</h3>
            <p className="lede">
              When you start creating or editing hardware in the armory, your form progress
              is automatically preserved locally so you never lose your specifications.
            </p>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => onNavigate('Create')}
                style={{ marginTop: '12px' }}
              >
                <Plus size={14} /> Start New Draft
              </button>
            )}
          </div>
        ) : (
          <div className="drafts-grid">
            {drafts.map((draft) => {
              const formData = draft.formData || {}
              const isCreate = draft.id === 'create'
              const name = formData.name || (isCreate ? 'New Hardware Draft' : 'Hardware Draft')
              const category = formData.type || formData.category || 'Hardware'
              const caliber = formData.caliber || ''
              const price = formData.price ? formatPrice(formData.price) : 'No price set'
              const savedTime = formatDraftTime(draft.savedAt)
              const thumb = draft.uploadedImageUrl || formData.image_url || '/guns/pistol.svg'

              return (
                <div key={draft.id} className="draft-card">
                  <div className="draft-card-header">
                    <span className={`draft-badge ${isCreate ? 'draft-badge--create' : 'draft-badge--edit'}`}>
                      {isCreate ? 'NEW HARDWARE DRAFT' : 'EDIT DRAFT'}
                    </span>
                    <span className="draft-time">{savedTime}</span>
                  </div>

                  <div className="draft-card-body">
                    <img
                      src={thumb}
                      alt={name}
                      className="draft-thumb"
                      onError={(e) => {
                        e.currentTarget.src = '/guns/pistol.svg'
                      }}
                    />
                    <div className="draft-info">
                      <h4 className="draft-title display">{name}</h4>
                      <p className="draft-meta">
                        {category} {caliber && `· ${caliber}`}
                      </p>
                      <p className="draft-price">{price}</p>
                    </div>
                  </div>

                  <div className="draft-card-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handleResumeDraft(draft)}
                      title="Continue editing this draft"
                    >
                      <ArrowRight size={14} /> Resume Draft
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm btn--danger-subtle"
                      onClick={() => handleDeleteDraft(draft.id)}
                      title="Discard this draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===================================================================
       * 3. SECTION: ABOUT BORE & BARREL ARMORY
       * =================================================================== */}
      <section id="about" className="profile-section">
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} stroke="var(--brass)" />
            <h2 className="display section-title">About Bore &amp; Barrel Armory</h2>
          </div>
        </div>

        <div className="about-content-card">
          <h3 className="display about-tagline">A one-room armory.</h3>
          <p className="lede" style={{ marginBottom: '18px' }}>
            Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced
            from the bench — no markup theatre, no filler.
          </p>

          <div className="about-pillars-grid">
            <div className="pillar-item">
              <span className="pillar-num">01</span>
              <h4>Bench-Priced Integrity</h4>
              <p>Every piece is priced according to machining tolerance and real component cost, avoiding retail inflation.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-num">02</span>
              <h4>Specification-First Catalog</h4>
              <p>Pistols, rifles, and shotguns documented with verified calibers, barrel dimensions, and action types.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-num">03</span>
              <h4>Offline-Ready Progressive Web App</h4>
              <p>Powered by multi-tier query caching, scroll-triggered lazy loading, and direct deep-link catalog sharing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
       * 4. SECTION: CONTACT & RANGE LOCATION
       * =================================================================== */}
      <section id="contact" className="profile-section">
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={20} stroke="var(--brass)" />
            <h2 className="display section-title">Come By The Shop</h2>
          </div>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-card-icon">
              <MapPin size={22} stroke="var(--brass)" />
            </div>
            <div>
              <h4>Armory Location</h4>
              <p className="contact-val">123 Range Road</p>
              <p className="contact-sub">Range entrance gate, Bay 4 bench</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <Clock size={22} stroke="var(--brass)" />
            </div>
            <div>
              <h4>Operating Hours</h4>
              <p className="contact-val">Tuesday to Saturday</p>
              <p className="contact-sub">10:00 AM – 6:00 PM (Closed Sun &amp; Mon)</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <Phone size={22} stroke="var(--brass)" />
            </div>
            <div>
              <h4>Shop Telephone</h4>
              <p className="contact-val">(555) 010-0100</p>
              <p className="contact-sub">Direct line to head armorer &amp; procurement</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <Mail size={22} stroke="var(--brass)" />
            </div>
            <div>
              <h4>Armory Dispatch</h4>
              <p className="contact-val">dispatch@borebarrel.armory</p>
              <p className="contact-sub">Secure procurement &amp; hardware inquiries</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
       * 5. MODAL: EDIT OPERATOR PROFILE
       * =================================================================== */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-box modal-box--profile-edit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} stroke="var(--brass)" />
                <h3 id="edit-profile-title" className="modal-title display" style={{ margin: 0 }}>
                  Edit Operator Profile
                </h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="modal-form">
              {/* Avatar Preview & Upload */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="avatar-wrap">
                  {editAvatar ? (
                    <img src={editAvatar} alt="Avatar preview" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      <Shield size={36} stroke="var(--brass)" />
                    </div>
                  )}
                  <label htmlFor="modal-avatar-input" className="avatar-upload-btn" title="Upload new avatar">
                    <Camera size={14} />
                    <input
                      id="modal-avatar-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden-file-input"
                    />
                  </label>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Operator Avatar</label>
                  <p className="form-help" style={{ fontSize: '0.8rem', color: 'var(--steel)', margin: '0 0 6px' }}>
                    JPG, PNG, or WebP. Max 2MB.
                  </p>
                  {editAvatar && (
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => setEditAvatar(null)}
                      style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Callsign / Username */}
              <div className="form-group">
                <label htmlFor="modal-username" className="form-label">
                  Callsign / Operator Alias
                </label>
                <input
                  id="modal-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. Operator Delta, Master Gunsmith"
                  className="form-input"
                  required
                />
              </div>

              {/* Bio / Armorer Notes */}
              <div className="form-group">
                <label htmlFor="modal-bio" className="form-label">
                  Station Bio &amp; Armorer Qualifications
                </label>
                <textarea
                  id="modal-bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Qualifications, preferred calibers, armory notes..."
                  rows={4}
                  className="form-textarea"
                />
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="modal-btn modal-btn--cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn--confirm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

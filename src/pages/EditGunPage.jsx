import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
  Star,
  Trash2,
  Images,
} from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * EditGunPage — Edit an existing weapon / hardware item.
 * Supports updating specs, steps, image replacement, and draft management.
 */
export default function EditGunPage({ gun, gunId, onBack, onSuccess }) {
  const targetId = gunId || gun?.id

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan',
    difficulty: 'mudah',
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)

  // Specs & Steps
  const [specs, setSpecs] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => (targetId ? hasDraft(targetId) : false))
  const [draftTimestamp, setDraftTimestamp] = useState(() => (targetId ? getDraftTimestamp(targetId) : null))

  // Fetch initial data
  useEffect(() => {
    const fetchGun = async () => {
      try {
        setLoading(true)
        setError('')

        // If gun was passed directly and has full details, use it; else fetch from API
        let data = gun
        if (!data || !data.ingredients || !data.steps) {
          if (targetId && !String(targetId).startsWith('local-')) {
            const res = await gunService.getGunById(targetId)
            if (res.success && res.data) {
              data = res.data
            }
          }
        }

        if (data) {
          setFormData({
            name: data.name || '',
            type: data.type || (data.category === 'makanan' ? 'Pistol' : 'Rifle'),
            caliber: data.caliber || '9mm',
            category: data.category || 'makanan',
            difficulty: data.difficulty || 'mudah',
            price: data.price ?? data.cook_time ?? 599,
            description: data.description || '',
            servings: data.servings || 1,
            is_featured: Boolean(data.is_featured),
          })
          const fetchedImages = Array.isArray(data.images) && data.images.length > 0
            ? data.images.filter(Boolean)
            : [data.image_url || data.image || '/guns/pistol.svg']
          setImages(fetchedImages)

          if (data.ingredients && data.ingredients.length > 0) {
            setSpecs(data.ingredients.map((ing) => ({
              name: ing.name || '',
              quantity: ing.quantity || '',
            })))
          } else {
            setSpecs([
              { name: 'Platform', quantity: data.type || 'Pistol' },
              { name: 'Caliber', quantity: data.caliber || '9mm' },
            ])
          }

          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')))
          } else {
            setSteps(['Standard manufacturer maintenance and cleaning protocol.'])
          }

        } else {
          setError('Hardware record could not be loaded.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load hardware record from server.')
      } finally {
        setLoading(false)
      }
    }

    if (targetId) {
      fetchGun()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  // Draft operations
  const handleLoadDraft = () => {
    const draft = loadDraft(targetId)
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.images) && draft.images.length > 0) {
        setImages(draft.images)
      } else if (draft.imagePreview) {
        setImages([draft.imagePreview])
      }
      setShowDraftModal(false)
      setSuccessMsg('Saved draft restored.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft(targetId)
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleManualSaveDraft = () => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
      imagePreview: images[0] || '/guns/pistol.svg',
    }
    const saved = saveDraft(draftData, targetId)
    if (saved) {
      const ts = getDraftTimestamp(targetId)
      setDraftTimestamp(ts)
      setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // Handle multiple file upload
  const handleAddFiles = async (e) => {
    const fileList = Array.from(e.target.files || [])
    if (fileList.length === 0) return

    const validFiles = []
    for (const file of fileList) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" melebihi batas 5MB.`)
        continue
      }
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        setError(`File "${file.name}" memiliki format tidak didukung (.jpg, .jpeg, .png, .webp).`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    try {
      setUploading(true)
      setError('')
      const uploadedUrls = await uploadService.uploadMultipleImages(validFiles)
      let finalUrls = []
      if (uploadedUrls.length > 0) {
        finalUrls = uploadedUrls
      } else {
        finalUrls = validFiles.map((f) => URL.createObjectURL(f))
      }
      setImages((prev) => [...prev, ...finalUrls])
      setSuccessMsg(`${finalUrls.length} gambar baru berhasil ditambahkan.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.warn('Upload API failed, using local preview:', err)
      const fallbackUrls = validFiles.map((f) => URL.createObjectURL(f))
      setImages((prev) => [...prev, ...fallbackUrls])
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleAddPreset = (url) => {
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]))
  }

  const handleSetCover = (indexToCover) => {
    setImages((prev) => {
      if (indexToCover === 0) return prev
      const item = prev[indexToCover]
      const remaining = prev.filter((_, idx) => idx !== indexToCover)
      return [item, ...remaining]
    })
  }

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => {
      if (prev.length <= 1) {
        setError('Setidaknya harus menyisakan minimal 1 gambar produk.')
        setTimeout(() => setError(''), 3500)
        return prev
      }
      return prev.filter((_, idx) => idx !== indexToRemove)
    })
  }

  // Specs & Steps
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product name must be at least 3 characters.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    if (cleanSpecs.length === 0) {
      setError('Please provide at least one specification.')
      return
    }

    const cleanSteps = steps
      .filter((s) => s.trim())
      .map((s) => s.trim())

    if (cleanSteps.length === 0) {
      setError('Please provide at least one maintenance step.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      type: formData.type || (formData.category === 'minuman' ? 'Rifle' : 'Pistol'),
      caliber: formData.caliber || '9mm',
      price: Number(formData.price) || 500,
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url: images[0] || '/guns/pistol.svg',
      images: images.length > 0 ? images : ['/guns/pistol.svg'],
      prep_time: 15,
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setUpdating(true)
      const res = await gunService.updateGun(targetId, payload)
      if (res.success || res.data) {
        deleteDraft(targetId)
        if (onSuccess) {
          onSuccess(res.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(res.message || 'Failed to update record on server.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating record.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={32} className="spin" />
        <p>Loading hardware details for editing…</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      {/* Head */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleManualSaveDraft}
          title="Save draft"
        >
          <Save size={14} /> Save Draft
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Modify Hardware Record</h1>
        <p className="lede">
          Updating record ID: <code className="mono-badge">{targetId}</code>
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        {/* Imagery Section */}
        <div className="card-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="card-box-title">Visual Assets ({images.length} Image{images.length !== 1 ? 's' : ''})</h2>
              <p className="card-box-desc">
                Kelola foto produk. Anda dapat mengunggah lebih dari satu gambar. Gambar pertama adalah sampul utama kartu katalog.
              </p>
            </div>
            <span className="badge badge--warning">
              <Images size={14} /> {images.length} Foto Terdaftar
            </span>
          </div>

          <div className="multi-image-preview-container" style={{ marginTop: '14px' }}>
            <div className="multi-image-grid">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className={`multi-image-card ${idx === 0 ? 'multi-image-card--cover' : ''}`}
                >
                  <div className="multi-image-thumb-wrap">
                    <img src={url} alt={`Asset ${idx + 1}`} className="multi-image-thumb" />
                    {idx === 0 && (
                      <span className="multi-image-badge multi-image-badge--cover">
                        <Star size={11} fill="currentColor" /> Sampul Utama
                      </span>
                    )}
                  </div>
                  <div className="multi-image-actions">
                    {idx > 0 && (
                      <button
                        type="button"
                        className="btn-thumb-action"
                        onClick={() => handleSetCover(idx)}
                        title="Jadikan gambar ini sebagai sampul utama"
                      >
                        <Star size={12} /> Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-thumb-action btn-thumb-action--danger"
                      onClick={() => handleRemoveImage(idx)}
                      disabled={images.length <= 1}
                      title={images.length <= 1 ? 'Minimal 1 gambar diperlukan' : 'Hapus gambar ini'}
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </div>
              ))}

              {/* Add More Photos Card */}
              <div className="multi-image-add-card">
                <input
                  id="edit-gun-add-more"
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAddFiles}
                  className="hidden-file-input"
                  disabled={uploading}
                />
                <label htmlFor="edit-gun-add-more" className="multi-image-add-label">
                  {uploading ? (
                    <Loader size={24} className="spin" />
                  ) : (
                    <>
                      <Plus size={24} />
                      <span>Tambah Foto</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Preset quick add bar */}
            <div className="preset-selector" style={{ marginTop: '16px' }}>
              <span className="preset-title">Tambah aset vektor bawaan:</span>
              <div className="preset-pills">
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/pistol.svg')}
                >
                  + Pistol
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/rifle.svg')}
                >
                  + Rifle
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/shotgun.svg')}
                >
                  + Shotgun
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Core fields */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-type" className="form-label">
              Platform / Category <span className="req">*</span>
            </label>
            <select
              id="edit-type"
              name="type"
              value={formData.type}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  type: e.target.value,
                  category: e.target.value === 'Pistol' ? 'makanan' : 'minuman',
                }))
              }
              className="form-select"
            >
              <option value="Pistol">Pistol (Sidearm)</option>
              <option value="Rifle">Rifle (Long Gun)</option>
              <option value="Shotgun">Shotgun (Smoothbore)</option>
              <option value="Submachine Gun">Submachine Gun</option>
            </select>
          </div>
        </div>

        <div className="form-grid form-grid--3">
          <div className="form-group">
            <label htmlFor="edit-caliber" className="form-label">
              Caliber / Chambering <span className="req">*</span>
            </label>
            <input
              id="edit-caliber"
              type="text"
              name="caliber"
              value={formData.caliber}
              onChange={(e) => setFormData((p) => ({ ...p, caliber: e.target.value }))}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              name="price"
              value={formData.price}
              onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
              className="form-input"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-difficulty" className="form-label">
              Grade / Build Quality <span className="req">*</span>
            </label>
            <select
              id="edit-difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))}
              className="form-select"
            >
              <option value="mudah">Commercial / Standard</option>
              <option value="sedang">Mil-Spec / Service Issue</option>
              <option value="sulit">Match Grade / Custom</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-desc" className="form-label">
            Armory Description
          </label>
          <textarea
            id="edit-desc"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="form-textarea"
          />
        </div>

        {/* Specs */}
        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Specifications &amp; Components</label>
            <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
              <Plus size={14} /> Add Spec
            </button>
          </div>
          <div className="multi-rows">
            {specs.map((spec, i) => (
              <div key={i} className="multi-row">
                <input
                  type="text"
                  placeholder="Attribute"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={spec.quantity}
                  onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => removeSpec(i)}
                  disabled={specs.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="form-fieldset">
          <div className="fieldset-header">
            <label className="form-label">Assembly &amp; Maintenance Protocol</label>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Plus size={14} /> Add Step
            </button>
          </div>
          <div className="multi-rows">
            {steps.map((st, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <input
                  type="text"
                  value={st}
                  onChange={(e) => handleStepChange(i, e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Featured */}
        <div className="checkbox-row">
          <input
            id="edit-is-featured"
            type="checkbox"
            name="is_featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData((p) => ({ ...p, is_featured: e.target.checked }))}
            className="form-checkbox"
          />
          <label htmlFor="edit-is-featured" className="checkbox-label">
            Feature in Armory Showcase
          </label>
        </div>

        {/* Submit */}
        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack} disabled={updating}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={updating}>
            {updating ? (
              <>
                <Loader size={18} className="spin" /> Updating Record…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* Restore draft dialog */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Unsaved Changes?"
        message={`An unsaved draft for this product was saved on ${draftTimestamp ? formatDraftTime(draftTimestamp) : 'earlier'}. Would you like to restore it?`}
        confirmLabel="Restore Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Upload,
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
 * CreateGunPage — Create a new weapon / hardware item with image upload,
 * draft persistence (auto-save), specs, and assembly steps.
 */
export default function CreateGunPage({ onBack, onSuccess }) {
  // Step state: 'upload' (upload or choose image) or 'form' (enter details)
  const [currentStep, setCurrentStep] = useState('upload')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan', // API validation expects 'makanan' or 'minuman'
    difficulty: 'mudah',  // 'mudah' (Standard) | 'sedang' (Service) | 'sulit' (Match)
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  // Multiple images state: array of image URLs
  const [images, setImages] = useState([])

  // Specifications (ingredients in API)
  const [specs, setSpecs] = useState([
    { name: 'Frame', quantity: 'Polymer' },
    { name: 'Action', quantity: 'Striker-Fired' },
    { name: 'Capacity', quantity: '17 rounds' },
  ])

  // Maintenance / Assembly Steps (steps in API)
  const [steps, setSteps] = useState([
    'Verify firearm is completely unloaded and point in safe direction.',
    'Disassemble slide assembly from receiver frame for routine maintenance.',
  ])

  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Draft management
  const [showDraftModal, setShowDraftModal] = useState(() => hasDraft('create'))
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  const handleSaveDraft = useCallback((notify = true) => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
      uploadedImageUrl: images[0] || '',
    }
    const saved = saveDraft(draftData, 'create')
    if (saved) {
      const ts = getDraftTimestamp('create')
      setDraftTimestamp(ts)
      if (notify) {
        setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }
  }, [formData, specs, steps, images])

  // Auto-save draft every 30 seconds while in form step
  useEffect(() => {
    if (currentStep !== 'form') return

    const interval = setInterval(() => {
      handleSaveDraft(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [handleSaveDraft, currentStep])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (Array.isArray(draft.images) && draft.images.length > 0) {
        setImages(draft.images)
        setCurrentStep('form')
      } else if (draft.uploadedImageUrl) {
        setImages([draft.uploadedImageUrl])
        setCurrentStep('form')
      }
      setShowDraftModal(false)
      setSuccessMsg('Draft successfully loaded.')
      setTimeout(() => setSuccessMsg(''), 4000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  // Handle multiple file selection
  const handleFilesChange = async (e) => {
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
        // Fallback to local object URLs if backend upload fails
        finalUrls = validFiles.map((f) => URL.createObjectURL(f))
      }
      setImages((prev) => [...prev, ...finalUrls])
      setSuccessMsg(`${finalUrls.length} gambar berhasil ditambahkan.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.warn('Upload API failed, falling back to local previews:', err)
      const fallbackUrls = validFiles.map((f) => URL.createObjectURL(f))
      setImages((prev) => [...prev, ...fallbackUrls])
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Quick fallback select vector from local assets
  const handleAddPreset = (url) => {
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]))
    setError('')
  }

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSetCover = (indexToCover) => {
    setImages((prev) => {
      if (indexToCover === 0) return prev
      const item = prev[indexToCover]
      const remaining = prev.filter((_, idx) => idx !== indexToCover)
      return [item, ...remaining]
    })
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Specs handlers
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => {
    setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  }

  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  // Steps handlers
  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => {
    setSteps((prev) => [...prev, ''])
  }

  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit create product
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
      setError('Please provide at least one maintenance / assembly step.')
      return
    }

    // Prepare payload compliant with backend /api/v1/recipes schema
    const payload = {
      name: formData.name.trim(),
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url: images[0] || '/guns/pistol.svg',
      images: images.length > 0 ? images : ['/guns/pistol.svg'],
      prep_time: 15,
      cook_time: Number(formData.price) || 500, // Price stored in cook_time
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setCreating(true)
      const response = await gunService.createGun(payload)
      if (response.success || response.data) {
        deleteDraft('create')
        if (onSuccess) {
          onSuccess(response.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(response.message || 'Failed to create product.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving product to server.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      {/* Header */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          {currentStep === 'form' && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => handleSaveDraft(true)}
              title="Save draft"
            >
              <Save size={14} /> Save Draft
            </button>
          )}
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
        <p className="lede">
          Add a firearm or accessory to the catalog. Data will be synchronized with the
          university RESTful backend.
        </p>
      </div>

      {/* Notifications */}
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

      {/* Step Indicators */}
      <div className="form-steps-nav">
        <div className={`step-badge ${currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'}`}>
          1. Imagery
        </div>
        <div className="step-badge-connector" />
        <div className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}>
          2. Specifications &amp; Details
        </div>
      </div>

      {/* STEP 1: Upload Image */}
      {currentStep === 'upload' && (
        <div className="card-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="card-box-title">Weapon Imagery ({images.length} Image{images.length !== 1 ? 's' : ''})</h2>
              <p className="card-box-desc">
                Unggah satu atau lebih foto / blueprint (mendukung multi-select, maks 5MB/file), atau pilih stock preset. Foto pertama akan dijadikan sampul utama katalog.
              </p>
            </div>
            {images.length > 0 && (
              <span className="badge badge--warning">
                <Images size={14} /> {images.length} Gambar Dipilih
              </span>
            )}
          </div>

          {images.length === 0 ? (
            <div className="upload-dropzone">
              <input
                id="gun-image-input"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFilesChange}
                className="hidden-file-input"
                disabled={uploading}
              />
              <label htmlFor="gun-image-input" className="upload-label">
                {uploading ? (
                  <>
                    <Loader size={36} className="spin upload-icon" />
                    <span className="upload-main-text">Mengunggah gambar…</span>
                  </>
                ) : (
                  <>
                    <Upload size={36} className="upload-icon" />
                    <span className="upload-main-text">Klik untuk memilih satu atau beberapa foto</span>
                    <span className="upload-sub-text">Mendukung multi-upload: JPG, PNG, atau WebP hingga 5MB</span>
                  </>
                )}
              </label>

              <div className="preset-selector">
                <span className="preset-title">Atau gunakan vektor bawaan:</span>
                <div className="preset-pills">
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleAddPreset('/guns/pistol.svg')}
                  >
                    + Pistol Vector
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleAddPreset('/guns/rifle.svg')}
                  >
                    + Rifle Vector
                  </button>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => handleAddPreset('/guns/shotgun.svg')}
                  >
                    + Shotgun Vector
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="multi-image-preview-container">
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
                        title="Hapus gambar ini"
                      >
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add More Tile */}
                <div className="multi-image-add-card">
                  <input
                    id="gun-image-add-more"
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFilesChange}
                    className="hidden-file-input"
                    disabled={uploading}
                  />
                  <label htmlFor="gun-image-add-more" className="multi-image-add-label">
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

              {/* Presets quick add bar */}
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

              <div className="preview-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setCurrentStep('form')}
                  disabled={uploading || images.length === 0}
                >
                  <CheckCircle size={18} /> Konfirmasi Gambar &amp; Lanjut ({images.length} Foto)
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setImages([])}
                  disabled={uploading}
                >
                  Hapus Semua
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Product Form */}
      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          {/* Active Image Thumbnail Strip */}
          <div className="selected-thumb-bar">
            <div className="selected-thumb-strip">
              {(images.length > 0 ? images.slice(0, 4) : ['/guns/pistol.svg']).map((url, idx) => (
                <div key={idx} className="thumb-item-wrap">
                  <img src={url} alt={`Asset ${idx + 1}`} className="thumb-small" />
                  {idx === 0 && <span className="thumb-cover-tag">Cover</span>}
                </div>
              ))}
              {images.length > 4 && (
                <div className="thumb-more-count">+{images.length - 4}</div>
              )}
            </div>
            <div className="thumb-info">
              <span className="thumb-title">{images.length} Gambar Ditetapkan</span>
              <span className="thumb-sub">
                Foto sampul aktif untuk tampilan kartu katalog
              </span>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setCurrentStep('upload')}
            >
              Kelola Gambar
            </button>
          </div>

          {/* Core Info */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Model Designation <span className="req">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g. Glock 19 Gen 5, Colt M4A1..."
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Platform / Category <span className="req">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => {
                  handleFormChange(e)
                  // Map category for backend schema
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value === 'Pistol' ? 'makanan' : 'minuman',
                  }))
                }}
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
              <label htmlFor="caliber" className="form-label">
                Caliber / Chambering <span className="req">*</span>
              </label>
              <input
                id="caliber"
                type="text"
                name="caliber"
                value={formData.caliber}
                onChange={handleFormChange}
                placeholder="e.g. 9mm, 5.56mm, 12 Gauge"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Price (USD) <span className="req">*</span>
              </label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                placeholder="599"
                min="0"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty" className="form-label">
                Grade / Build Quality <span className="req">*</span>
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="mudah">Commercial / Standard</option>
                <option value="sedang">Mil-Spec / Service Issue</option>
                <option value="sulit">Match Grade / Custom</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Armory Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Operational background, ergonomics, intended mission profile..."
              rows={3}
              className="form-textarea"
            />
          </div>

          {/* Specifications (Ingredients) */}
          <div className="form-fieldset">
            <div className="fieldset-header">
              <label className="form-label">Specifications &amp; Components</label>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addSpec}
              >
                <Plus size={14} /> Add Spec
              </button>
            </div>
            <div className="multi-rows">
              {specs.map((spec, i) => (
                <div key={i} className="multi-row">
                  <input
                    type="text"
                    placeholder="Attribute (e.g. Barrel Length, Action)"
                    value={spec.name}
                    onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 16 inch, Striker-fired)"
                    value={spec.quantity}
                    onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeSpec(i)}
                    disabled={specs.length <= 1}
                    title="Remove item"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assembly / Maintenance Steps */}
          <div className="form-fieldset">
            <div className="fieldset-header">
              <label className="form-label">Assembly &amp; Maintenance Protocol</label>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addStep}
              >
                <Plus size={14} /> Add Step
              </button>
            </div>
            <div className="multi-rows">
              {steps.map((st, i) => (
                <div key={i} className="step-row">
                  <span className="step-num">{i + 1}</span>
                  <input
                    type="text"
                    placeholder="e.g. Clear the chamber and lock slide back..."
                    value={st}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="btn btn--danger-ghost"
                    onClick={() => removeStep(i)}
                    disabled={steps.length <= 1}
                    title="Remove step"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Featured checkbox */}
          <div className="checkbox-row">
            <input
              id="is_featured"
              type="checkbox"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleFormChange}
              className="form-checkbox"
            />
            <label htmlFor="is_featured" className="checkbox-label">
              Feature in Armory Showcase (Highlight product on catalog)
            </label>
          </div>

          {/* Submit bar */}
          <div className="form-actions-bar">
            <button
              type="button"
              className="btn btn--outline"
              onClick={onBack}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader size={18} className="spin" /> Registering Hardware…
                </>
              ) : (
                'Commit to Armory'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Restore Draft Modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Previous Draft?"
        message={`An unfinished draft from ${draftTimestamp ? formatDraftTime(draftTimestamp) : 'earlier'} was detected. Would you like to resume editing?`}
        confirmLabel="Load Draft"
        cancelLabel="Discard"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}

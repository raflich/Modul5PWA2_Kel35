import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

/**
 * ShareButton — Share a catalog item using the Web Share API (native sheet on mobile)
 * with automatic fallback to clipboard copy and visual tooltip feedback.
 *
 * @param {Object} props
 * @param {Object} props.gun - Product data
 * @param {'icon'|'button'} [props.variant='icon'] - Display mode
 * @param {string} [props.className=''] - Optional extra CSS class
 */
export default function ShareButton({ gun, variant = 'icon', className = '' }) {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  if (!gun) return null

  const getShareUrl = () => {
    const id = gun.id || gun.name
    return `${window.location.origin}${window.location.pathname}?gun=${encodeURIComponent(id)}`
  }

  const handleShare = async (e) => {
    e.stopPropagation() // Prevent triggering card selection / navigation

    const shareUrl = getShareUrl()
    const shareData = {
      title: `${gun.name} | Bore & Barrel`,
      text: `Check out ${gun.name} (${gun.type || gun.category || 'Hardware'}) on Bore & Barrel Armory:`,
      url: shareUrl,
    }

    // 1. Try native Web Share API (mobile Android/iOS, Safari, modern Chrome)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if (err.name === 'AbortError') {
          // User closed the share sheet — no action needed
          return
        }
        // If navigator.share failed unexpectedly, fall through to clipboard copy
      }
    }

    // 2. Fallback: Copy direct share link to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const tempInput = document.createElement('input')
        tempInput.value = shareUrl
        document.body.appendChild(tempInput)
        tempInput.select()
        document.execCommand('copy')
        document.body.removeChild(tempInput)
      }

      setCopied(true)
      setShowTooltip(true)
      setTimeout(() => {
        setCopied(false)
        setShowTooltip(false)
      }, 2000)
    } catch {
      // In case clipboard permissions are blocked, prompt user
      window.prompt('Copy share link:', shareUrl)
    }
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        className={`btn btn--outline share-btn-action ${copied ? 'share-btn--copied' : ''} ${className}`}
        onClick={handleShare}
        title="Share link to this hardware piece"
      >
        {copied ? (
          <>
            <Check size={16} stroke="var(--brass)" />
            <span>Link Copied!</span>
          </>
        ) : (
          <>
            <Share2 size={16} />
            <span>Share Link</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="share-btn-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className={`card-act-btn share-btn ${copied ? 'share-btn--copied' : ''} ${className}`}
        onClick={handleShare}
        aria-label={`Share ${gun.name}`}
        title={copied ? 'Link copied!' : `Share ${gun.name}`}
      >
        {copied ? (
          <Check size={14} stroke="var(--brass)" />
        ) : (
          <Share2 size={14} stroke="var(--steel)" />
        )}
      </button>

      {showTooltip && (
        <span className="share-tooltip" role="status" aria-live="polite">
          Link Copied!
        </span>
      )}
    </div>
  )
}


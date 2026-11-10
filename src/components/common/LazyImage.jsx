import { useState, useEffect, useRef } from 'react'

/**
 * LazyImage — Scroll-triggered image loading with IntersectionObserver.
 *
 * Prevents premature network requests on initial page load by deferring <img>
 * rendering until the container scrolls into/near the browser viewport.
 *
 * @param {Object} props
 * @param {string} props.src              — Image source URL
 * @param {string} [props.alt='']         — Image alt text
 * @param {string} [props.className='']   — Class name for the <img> tag
 * @param {string} [props.wrapperClassName=''] — Class name for the container <span>
 * @param {number|string} [props.width]   — Image / container width
 * @param {number|string} [props.height]  — Image / container height
 * @param {Object} [props.style]          — Additional inline style for container
 * @param {string} [props.fallbackSrc]    — Fallback image if source fails
 * @param {string} [props.rootMargin]     — IntersectionObserver margin (default: '50px 0px')
 * @param {number} [props.threshold]      — Intersection threshold (default: 0.01)
 */
export default function LazyImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  width,
  height,
  style = {},
  fallbackSrc = '/guns/pistol.svg',
  rootMargin = '50px 0px',
  threshold = 0.01,
  ...rest
}) {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  // Adjust state during render when src changes (React recommended pattern)
  if (prevSrc !== src) {
    setPrevSrc(src)
    setIsLoaded(false)
    setHasError(false)
  }

  // IntersectionObserver to detect when the element approaches the viewport
  useEffect(() => {
    if (isVisible) return

    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry && entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        root: null, // use document viewport
        rootMargin, // trigger slightly before entering viewport
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [rootMargin, threshold, isVisible])

  const targetSrc = hasError || !src ? fallbackSrc : src

  return (
    <span
      ref={containerRef}
      className={`lazy-img-wrapper ${wrapperClassName}`.trim()}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
    >
      {/* Shimmer skeleton shown until image has completed download */}
      {!isLoaded && (
        <span className="lazy-img-skeleton" aria-hidden="true">
          <span className="lazy-img-shimmer" />
        </span>
      )}

      {/* <img> is ONLY mounted when scrolled near/into the viewport */}
      {isVisible && (
        <img
          src={targetSrc}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          className={`lazy-img ${className} ${isLoaded ? 'lazy-img--loaded' : 'lazy-img--loading'}`.trim()}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!hasError && targetSrc !== fallbackSrc) {
              setHasError(true)
            } else {
              setIsLoaded(true)
            }
          }}
          {...rest}
        />
      )}
    </span>
  )
}

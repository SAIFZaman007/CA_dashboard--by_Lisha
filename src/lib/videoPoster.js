const DEFAULT_SEEK_RATIO = 0.1 
const MAX_SEEK_SECONDS = 3
const POSTER_WIDTH = 960
const TIMEOUT_MS = 15_000

/**
 * @returns {Promise<Blob|null>} a JPEG, or null if this browser or codec
 *   could not produce one. Null is a normal outcome, not an error: an exotic
 *   container or a locked-down canvas should cost the coach a thumbnail, never
 *   the upload itself.
 */
export function capturePosterFrame(file, { seekRatio = DEFAULT_SEEK_RATIO } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('video/')) {
      resolve(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
      resolve(value)
    }

    const timer = setTimeout(() => finish(null), TIMEOUT_MS)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      video.currentTime = Math.min(duration * seekRatio || 0, MAX_SEEK_SECONDS)
    }

    video.onseeked = () => {
      try {
        const width = video.videoWidth
        const height = video.videoHeight
        if (!width || !height) {
          finish(null)
          return
        }

        const scale = Math.min(1, POSTER_WIDTH / width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)

        const context = canvas.getContext('2d')
        if (!context) {
          finish(null)
          return
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.82)
      } catch {
        finish(null)
      }
    }

    video.onerror = () => finish(null)
    video.src = objectUrl
  })
}

/** Wrap a captured frame as a File so it can go up through the normal upload. */
export function posterFileFrom(blob, videoName = 'tutorial') {
  const base = videoName.replace(/\.[^.]+$/, '') || 'tutorial'
  return new File([blob], `${base}-poster.jpg`, { type: 'image/jpeg' })
}
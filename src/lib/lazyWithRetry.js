import { lazy } from 'react'

const RELOAD_FLAG = 'ca-admin:chunk-reloaded'

const isChunkError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    error?.message ?? '',
  )

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (first) {
      if (!isChunkError(first)) throw first

      await wait(350)
      try {
        return await factory()
      } catch (second) {
        let alreadyReloaded = false
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
          sessionStorage.setItem(RELOAD_FLAG, '1')
        } catch {
          throw second
        }

        if (alreadyReloaded) throw second

        window.location.reload()
        return await new Promise(() => {})
      }
    }
  })
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    /* nothing to clear */
  }
}
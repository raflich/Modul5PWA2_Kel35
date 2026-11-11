import { useState, useEffect, useCallback } from 'react'
import archiveService, { ARCHIVE_EVENT } from '../services/archiveService'

/**
 * useArchive — Hook for reactive catalog archiving (soft delete), restoring,
 * and permanent deletion.
 *
 * @returns {{
 *   archivedGuns: Array<Object>,
 *   archivedCount: number,
 *   isArchived: (id: string|number) => boolean,
 *   archiveGun: (gun: Object) => Promise<{success: boolean, data?: Object}>,
 *   restoreGun: (id: string|number) => Promise<{success: boolean, restoredGun?: Object}>,
 *   deletePermanently: (id: string|number) => Promise<{success: boolean}>,
 *   refresh: () => void
 * }}
 */
export function useArchive() {
  const [archivedGuns, setArchivedGuns] = useState(() => archiveService.getArchivedGuns())

  const refresh = useCallback(() => {
    setArchivedGuns(archiveService.getArchivedGuns())
  }, [])

  useEffect(() => {
    const handleSync = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(ARCHIVE_EVENT, handleSync)
      window.addEventListener('storage', handleSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(ARCHIVE_EVENT, handleSync)
        window.removeEventListener('storage', handleSync)
      }
    }
  }, [refresh])

  const archiveGun = useCallback(async (gun) => {
    const res = await archiveService.archiveGun(gun)
    refresh()
    return res
  }, [refresh])

  const restoreGun = useCallback(async (id) => {
    const res = await archiveService.restoreGun(id)
    refresh()
    return res
  }, [refresh])

  const deletePermanently = useCallback(async (id) => {
    const res = await archiveService.deletePermanently(id)
    refresh()
    return res
  }, [refresh])

  const isArchived = useCallback((id) => {
    return archiveService.isArchived(id)
  }, [])

  return {
    archivedGuns,
    archivedCount: archivedGuns.length,
    isArchived,
    archiveGun,
    restoreGun,
    deletePermanently,
    refresh,
  }
}

export default useArchive


import { apiClient, IS_SUPABASE } from '../config/api'
import queryCache from '../utils/queryCache'
import gunService from './gunService'

const STORAGE_KEY = 'bore_barrel_archived_guns'
export const ARCHIVE_EVENT = 'bore_barrel_archive_change'

class ArchiveService {
  /**
   * Safely retrieve all archived guns from localStorage.
   * @returns {Array<Object>}
   */
  getArchivedGuns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const list = JSON.parse(raw)
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  /**
   * Return a Set of all archived IDs (as strings) for fast lookups.
   * @returns {Set<string>}
   */
  getArchivedIdSet() {
    const guns = this.getArchivedGuns()
    return new Set(guns.map((g) => String(g.id || g.name)))
  }

  /**
   * Check if a specific gun ID or name is archived.
   * @param {string|number} id
   * @returns {boolean}
   */
  isArchived(id) {
    if (id == null) return false
    const strId = String(id)
    const list = this.getArchivedGuns()
    return list.some((g) => String(g.id || g.name) === strId || g.id === id)
  }

  /**
   * Archive a gun (Soft Delete).
   * Persists to local archive storage and attempts Supabase patch if available.
   * @param {Object} gun
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async archiveGun(gun) {
    if (!gun) return { success: false }

    const list = this.getArchivedGuns()
    const gunId = String(gun.id || gun.name)

    // Check if already in archive
    const existingIdx = list.findIndex((g) => String(g.id || g.name) === gunId)
    const archivedItem = {
      ...gun,
      is_archived: true,
      archived_at: new Date().toISOString(),
    }

    if (existingIdx > -1) {
      list[existingIdx] = archivedItem
    } else {
      list.unshift(archivedItem)
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
      /* storage quota fallback */
    }

    // Try Supabase patch if supported (fail silently if is_archived column does not exist yet)
    if (IS_SUPABASE && gun.id) {
      try {
        await apiClient.patch(`/rest/v1/products?id=eq.${gun.id}`, {
          is_archived: true,
          updated_at: new Date().toISOString(),
        })
      } catch {
        // Ignored: Supabase column is optional, client-side soft delete is persistent
      }
    }

    // Invalidate query caches so Catalog immediately excludes this gun
    queryCache.invalidateQueries('guns')
    queryCache.invalidateQueries(['gun', gun.id])

    this.notify()
    return { success: true, data: archivedItem }
  }

  /**
   * Restore an archived gun back to the active catalog.
   * @param {string|number} id
   * @returns {Promise<{success: boolean, restoredGun: Object|null}>}
   */
  async restoreGun(id) {
    const list = this.getArchivedGuns()
    const strId = String(id)
    const targetIdx = list.findIndex((g) => String(g.id || g.name) === strId)

    if (targetIdx === -1) {
      return { success: false, restoredGun: null }
    }

    const [restored] = list.splice(targetIdx, 1)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
      /* ignore */
    }

    // Try Supabase unarchive patch
    if (IS_SUPABASE && restored.id) {
      try {
        await apiClient.patch(`/rest/v1/products?id=eq.${restored.id}`, {
          is_archived: false,
          updated_at: new Date().toISOString(),
        })
      } catch {
        /* ignore */
      }
    }

    // Invalidate query caches so Catalog immediately shows the restored gun
    queryCache.invalidateQueries('guns')
    if (restored.id) {
      queryCache.invalidateQueries(['gun', restored.id])
    }

    this.notify()
    return { success: true, restoredGun: restored }
  }

  /**
   * Permanently delete an archived gun (Hard Delete).
   * Removes from both local archive and the backend database.
   * @param {string|number} id
   * @returns {Promise<{success: boolean}>}
   */
  async deletePermanently(id) {
    const list = this.getArchivedGuns()
    const strId = String(id)
    const target = list.find((g) => String(g.id || g.name) === strId)

    // Remove from local archive list
    const filtered = list.filter((g) => String(g.id || g.name) !== strId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch {
      /* ignore */
    }

    // If item has a persistent database ID, delete from Supabase / REST API
    if (target && target.id) {
      try {
        await gunService.deleteGun(target.id)
      } catch (err) {
        console.warn('[archiveService] Could not delete from backend:', err)
      }
    }

    queryCache.invalidateQueries('guns')
    if (target?.id) {
      queryCache.invalidateQueries(['gun', target.id])
    }

    this.notify()
    return { success: true }
  }

  /**
   * Dispatch custom event to sync all useArchive hooks reactively.
   */
  notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ARCHIVE_EVENT))
    }
  }
}

export const archiveService = new ArchiveService()
export default archiveService

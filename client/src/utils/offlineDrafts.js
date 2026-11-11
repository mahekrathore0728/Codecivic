/**
 * Client-Side Offline Storage using IndexedDB (Phase 4)
 * Allows citizens to create and save complaint drafts offline.
 * Sensitive authentication tokens or passwords are NEVER stored here.
 */

const DB_NAME = 'CodeCivicOfflineDB';
const DB_VERSION = 1;
const STORE_DRAFTS = 'complaint_drafts';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const store = db.createObjectStore(STORE_DRAFTS, { keyPath: 'localId' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates a complaint draft locally
 * @param {Object} draft { localId, category_id, title, description, address, landmark, district, state, ward, latitude, longitude, photoNames }
 */
export async function saveDraft(draft) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DRAFTS], 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    const item = {
      localId: draft.localId || `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category_id: draft.category_id,
      title: draft.title,
      description: draft.description,
      address: draft.address,
      landmark: draft.landmark,
      district: draft.district || 'Kota',
      state: draft.state || 'Rajasthan',
      ward: draft.ward || '',
      latitude: draft.latitude,
      longitude: draft.longitude,
      syncStatus: 'PENDING', // 'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
      syncError: null,
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all stored drafts
 */
export async function getAllDrafts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DRAFTS], 'readonly');
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a draft by local ID
 */
export async function deleteDraft(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DRAFTS], 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.delete(localId);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Updates status of a draft (e.g. SYNCING, FAILED)
 */
export async function updateDraftStatus(localId, syncStatus, syncError = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DRAFTS], 'readwrite');
    const store = tx.objectStore(STORE_DRAFTS);
    const getReq = store.get(localId);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve(null);
      item.syncStatus = syncStatus;
      item.syncError = syncError;
      item.updatedAt = new Date().toISOString();
      store.put(item);
      resolve(item);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

const DB_NAME = "reconnect-ai-offline";
const DB_VERSION = 1;
const API_STORE = "api-cache";
const MUTATION_STORE = "mutation-queue";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(API_STORE)) db.createObjectStore(API_STORE, { keyPath: "key" });
      if (!db.objectStoreNames.contains(MUTATION_STORE)) db.createObjectStore(MUTATION_STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function setCachedApiPayload(key, payload) {
  return withStore(API_STORE, "readwrite", (store) =>
    store.put({
      key,
      payload,
      cachedAt: new Date().toISOString()
    })
  ).catch(() => null);
}

export async function getCachedApiPayload(key) {
  const entry = await withStore(API_STORE, "readonly", (store) => store.get(key)).catch(() => null);
  return entry?.payload || null;
}

export async function queueOfflineMutation(payload) {
  return withStore(MUTATION_STORE, "readwrite", (store) => store.add(payload)).catch(() => null);
}

export async function listOfflineMutations() {
  return withStore(MUTATION_STORE, "readonly", (store) => store.getAll()).catch(() => []);
}

export async function deleteOfflineMutation(id) {
  return withStore(MUTATION_STORE, "readwrite", (store) => store.delete(id)).catch(() => null);
}

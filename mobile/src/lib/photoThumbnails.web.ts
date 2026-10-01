// Small, account-scoped previews. Original files remain in private cloud storage.
// Immutable media paths are the cache keys; a replacement always gets a new path.
type Thumbnail = { key: string; owner: string; data: string; created: number };
const memory = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();
const epochs = new Map<string, number>();
const invalidatedPaths = new Set<string>();
const limit = 128;
let activeOwner: string | null = null;
let database: Promise<IDBDatabase | null> | undefined;

function openCache() {
  database ??= new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open("memento-photo-previews", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("thumbnails", {
        keyPath: "key",
      });
      store.createIndex("owner", "owner");
      store.createIndex("created", "created");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return database;
}
const cacheKey = (owner: string, path: string) =>
  path.startsWith(`${owner}/`) ? `${owner}:${path}` : undefined;
export function activatePhotoThumbnails(owner: string | null) {
  const previous = activeOwner;
  activeOwner = owner;
  if (previous && previous !== owner) void clearPhotoThumbnails(previous);
}
function remember(key: string, data: string) {
  memory.delete(key);
  memory.set(key, data);
  if (memory.size > limit) memory.delete(memory.keys().next().value!);
}
export function peekPhotoThumbnail(
  owner: string,
  path: string,
): string | undefined {
  const key = cacheKey(owner, path);
  return key && activeOwner === owner ? memory.get(key) : undefined;
}

export async function removePhotoThumbnail(
  owner: string,
  path: string,
): Promise<void> {
  const key = cacheKey(owner, path);
  if (!key) return;
  invalidatedPaths.add(key);
  memory.delete(key);
  const db = await openCache();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction("thumbnails", "readwrite");
    tx.objectStore("thumbnails").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => resolve();
  });
}

export async function cachedPhotoThumbnail(
  owner: string,
  path: string,
): Promise<string | undefined> {
  const key = cacheKey(owner, path);
  if (!key || activeOwner !== owner || invalidatedPaths.has(key)) return;
  if (memory.has(key)) return memory.get(key);
  const epoch = epochs.get(owner);
  const db = await openCache();
  if (!db) return;
  return new Promise((resolve) => {
    const request = db
      .transaction("thumbnails")
      .objectStore("thumbnails")
      .get(key);
    request.onsuccess = () => {
      const record = request.result as Thumbnail | undefined;
      if (
        record?.owner === owner &&
        activeOwner === owner &&
        !invalidatedPaths.has(key) &&
        epoch === epochs.get(owner)
      ) {
        remember(key, record.data);
        resolve(record.data);
      } else resolve(undefined);
    };
    request.onerror = () => resolve(undefined);
  });
}

async function storeThumbnail(record: Thumbnail, epoch: number | undefined) {
  const db = await openCache();
  if (
    activeOwner !== record.owner ||
    epoch !== epochs.get(record.owner) ||
    invalidatedPaths.has(record.key)
  )
    return;
  remember(record.key, record.data);
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction("thumbnails", "readwrite");
    const store = tx.objectStore("thumbnails");
    store.put(record);
    const count = store.count();
    count.onsuccess = () => {
      let excess = count.result - limit;
      if (excess <= 0) return;
      const cursor = store.index("created").openCursor();
      cursor.onsuccess = () => {
        if (cursor.result && excess-- > 0) {
          memory.delete((cursor.result.value as Thumbnail).key);
          cursor.result.delete();
          cursor.result.continue();
        }
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => resolve(); // Quota/privacy modes keep the original usable.
  });
}

export async function preparePhotoThumbnail(
  owner: string,
  path: string,
  uri: string,
): Promise<string | undefined> {
  const key = cacheKey(owner, path);
  if (!key || activeOwner !== owner || invalidatedPaths.has(key)) return;
  const existing = pending.get(key);
  if (existing) return existing;
  const epoch = epochs.get(owner);
  const work = (async () => {
    const cached = await cachedPhotoThumbnail(owner, path);
    if (cached) return cached;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = uri;
    await image.decode();
    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      512 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/jpeg", 0.72);
    if (data.length > 100_000) {
      canvas.width = Math.max(1, Math.round(canvas.width / 2));
      canvas.height = Math.max(1, Math.round(canvas.height / 2));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      data = canvas.toDataURL("image/jpeg", 0.65);
    }
    if (
      activeOwner !== owner ||
      epoch !== epochs.get(owner) ||
      invalidatedPaths.has(key) ||
      data.length > 100_000
    )
      return;
    await storeThumbnail({ key, owner, data, created: Date.now() }, epoch);
    return activeOwner === owner &&
      epoch === epochs.get(owner) &&
      !invalidatedPaths.has(key)
      ? data
      : undefined;
  })()
    .catch(() => undefined)
    .finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

export async function clearPhotoThumbnails(owner: string): Promise<void> {
  if (activeOwner === owner) activeOwner = null;
  epochs.set(owner, (epochs.get(owner) ?? 0) + 1);
  for (const key of memory.keys())
    if (key.startsWith(`${owner}:`)) memory.delete(key);
  const db = await openCache();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction("thumbnails", "readwrite");
    const cursor = tx
      .objectStore("thumbnails")
      .index("owner")
      .openCursor(IDBKeyRange.only(owner));
    cursor.onsuccess = () => {
      if (cursor.result) {
        cursor.result.delete();
        cursor.result.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => resolve();
  });
}

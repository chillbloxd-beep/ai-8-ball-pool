export const ASSET_MANIFEST_PATH = './assets/assets.json';

export async function loadAssetManifest(path = ASSET_MANIFEST_PATH) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Asset manifest load failed: ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json.assets)) throw new Error('Asset manifest malformed: assets must be array');
  validateManifest(json.assets);
  return json.assets;
}

export function validateManifest(assets) {
  const required = ['name', 'path', 'sourceUrl', 'license', 'author', 'notes'];
  for (const a of assets) {
    for (const key of required) {
      if (!(key in a) || typeof a[key] !== 'string' || a[key].trim() === '') {
        throw new Error(`Asset manifest malformed: missing ${key} on ${a.name || 'unknown'}`);
      }
    }
  }
}

export async function preloadAssets(assets, onProgress) {
  const total = assets.length;
  let loaded = 0;
  const images = {};

  await Promise.all(assets.map((asset) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loaded += 1;
      images[asset.name] = { ok: true, image: img, meta: asset };
      onProgress?.({ loaded, total, name: asset.name, ok: true });
      resolve();
    };
    img.onerror = () => {
      loaded += 1;
      images[asset.name] = { ok: false, image: null, meta: asset };
      onProgress?.({ loaded, total, name: asset.name, ok: false });
      resolve();
    };
    img.src = asset.path;
  })));

  return { total, loaded, images };
}

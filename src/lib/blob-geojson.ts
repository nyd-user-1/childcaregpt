// District boundary GeoJSON lives in a private Vercel Blob store. The browser
// fetches it through /api/geojson/[key], which streams from Blob server-side and
// adds an immutable cache header. Pathnames (not full URLs) are the stable keys.
export const GEOJSON_BLOB_PATHS: Record<string, string> = {
  'senate':        'geojson/ny-senate-districts.geojson',
  'assembly':      'geojson/ny-assembly-districts.geojson',
  'senate-full':   'geojson/ny-senate-districts-full.geojson',
  'assembly-full': 'geojson/ny-assembly-districts-full.geojson',
}

// Same-origin URL the maps fetch.
export function geojsonUrl(key: keyof typeof GEOJSON_BLOB_PATHS | string): string {
  return `/api/geojson/${key}`
}

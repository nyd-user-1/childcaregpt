'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map as GMap, useMap } from '@vis.gl/react-google-maps'
import { geojsonUrl } from '@/lib/blob-geojson'

const MAP_STYLE = [
  { featureType: 'all',       elementType: 'labels',   stylers: [{ visibility: 'off' }] },
  { featureType: 'water',     elementType: 'geometry', stylers: [{ color: '#e7eef0' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f1ece2' }] },
  { featureType: 'road',      elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'poi',       elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',   elementType: 'all',      stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
]

// Draws one legislative district: the target shape filled teal, neighbors faint,
// and the map fit to the target's bounds.
function FocusLayer({ chamber, district }: { chamber: 'senate' | 'assembly'; district: number }) {
  const map = useMap()
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!map || loadedRef.current) return
    loadedRef.current = true

    const layer = new google.maps.Data()
    fetch(geojsonUrl(chamber))
      .then(r => r.json())
      .then((geojson: object) => {
        layer.addGeoJson(geojson)
        layer.setMap(map)
        layer.setStyle((feature: google.maps.Data.Feature) => {
          const d = Number(feature.getProperty('district'))
          const isTarget = d === district
          return {
            fillColor:    isTarget ? '#2f6d6a' : '#cdc6b8',
            fillOpacity:  isTarget ? 0.78 : 0.12,
            strokeColor:  isTarget ? '#1e4d4a' : '#d8d1c4',
            strokeWeight: isTarget ? 2 : 0.5,
            strokeOpacity: 1,
            clickable: false,
          }
        })
        // Fit to the target district only.
        const bounds = new google.maps.LatLngBounds()
        layer.forEach(feature => {
          if (Number(feature.getProperty('district')) !== district) return
          feature.getGeometry()?.forEachLatLng(ll => bounds.extend(ll))
        })
        if (!bounds.isEmpty()) map.fitBounds(bounds, 24)
      })

    return () => { layer.setMap(null); loadedRef.current = false }
  }, [map, chamber, district])

  return null
}

export default function DistrictMiniMap({ chamber, district }: { chamber: 'senate' | 'assembly'; district: number }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const [failed, setFailed] = useState(!apiKey)
  if (failed) return null

  return (
    <div className="aspect-[2/1] w-full overflow-hidden rounded-2xl border border-[var(--paper-rule)]" style={{ background: 'var(--paper-2)' }}>
      <APIProvider apiKey={apiKey} onError={() => setFailed(true)}>
        <GMap
          defaultCenter={{ lat: 42.9, lng: -75.6 }}
          defaultZoom={7}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          styles={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <FocusLayer chamber={chamber} district={district} />
        </GMap>
      </APIProvider>
    </div>
  )
}

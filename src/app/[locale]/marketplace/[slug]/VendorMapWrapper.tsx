'use client';

import { useEffect, useRef } from 'react';

export default function VendorMapWrapper({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    let map: any;

    // @ts-ignore - CSS import for side effects
    import('leaflet/dist/leaflet.css');

    import('leaflet').then((L) => {
      map = L.map(mapRef.current!).setView([latitude, longitude], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.marker([latitude, longitude]).addTo(map).bindPopup(name).openPopup();
    });

    return () => {
      if (map) map.remove();
    };
  }, [latitude, longitude, name]);

  return <div ref={mapRef} className="w-full h-full" />;
}

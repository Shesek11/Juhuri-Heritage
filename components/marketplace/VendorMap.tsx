import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Vendor } from '../../services/marketplaceService';
import { ExternalLink, ShoppingBag } from 'lucide-react';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface VendorMapProps {
    vendors: Vendor[];
    userLocation?: { lat: number; lng: number };
    onVendorClick: (vendor: Vendor) => void;
}

const LocationMarker = ({ position }: { position: { lat: number; lng: number } }) => {
    return (
        <Marker position={[position.lat, position.lng]} icon={
            new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }>
            <Popup>המיקום שלך</Popup>
        </Marker>
    );
}

export const VendorMap: React.FC<VendorMapProps> = ({ vendors, userLocation, onVendorClick }) => {
    const center = userLocation || { lat: 31.0461, lng: 34.8516 }; // Israel center default

    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={userLocation ? 12 : 8}
            scrollWheelZoom={false}
            className="w-full h-full rounded-xl z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {userLocation && <LocationMarker position={userLocation} />}

            {vendors.map(vendor => (
                <Marker
                    key={vendor.id}
                    position={[vendor.latitude, vendor.longitude]}
                    eventHandlers={{
                        click: () => onVendorClick(vendor),
                    }}
                    icon={
                        new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        })
                    }
                >
                    <Popup>
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold text-lg">{vendor.business_name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{vendor.description}</p>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs text-white ${vendor.is_open ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {vendor.is_open ? 'פתוח' : 'סגור'}
                                </span>
                                <button
                                    onClick={() => onVendorClick(vendor)}
                                    className="text-amber-600 text-xs font-bold underline"
                                >
                                    לפרטים
                                </button>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

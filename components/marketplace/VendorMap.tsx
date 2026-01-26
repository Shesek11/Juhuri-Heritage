import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Vendor } from '../../services/marketplaceService';
import { ExternalLink, ShoppingBag, Star } from 'lucide-react';
import { getVendorStatus } from '../../utils/marketplaceHelpers';

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

    // Filter vendors that have valid coordinates
    const vendorsWithLocation = vendors.filter(v =>
        v.latitude != null && v.longitude != null &&
        !isNaN(v.latitude) && !isNaN(v.longitude)
    );

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

            {vendorsWithLocation.map(vendor => {
                const status = getVendorStatus(vendor);
                return (
                    <Marker
                        key={vendor.id}
                        position={[vendor.latitude!, vendor.longitude!]}
                        eventHandlers={{
                            click: () => onVendorClick(vendor),
                        }}
                        icon={
                            new L.Icon({
                                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${status.isOpen ? 'green' : 'red'}.png`,
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
                                <h3 className="font-bold text-lg">{vendor.name}</h3>
                                <div className={`text-xs font-bold mb-2 ${status.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                    {status.message}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{vendor.about_text}</p>
                                <div className="flex items-center gap-2">
                                    {vendor.avg_rating !== undefined && vendor.avg_rating > 0 && (
                                        <div className="flex items-center gap-1 text-amber-600 text-xs">
                                            <Star size={12} fill="currentColor" />
                                            {vendor.avg_rating.toFixed(1)}
                                        </div>
                                    )}
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
                );
            })}
        </MapContainer>
    );
};

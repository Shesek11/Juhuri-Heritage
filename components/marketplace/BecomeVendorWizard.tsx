import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreateVendorInput, marketplaceService } from '../../services/marketplaceService';
import { Store, MapPin, Image, Check, ChevronRight, ChevronLeft, X, Loader2, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ImageUpload } from './ImageUpload';
import { geocodeAddress } from '../../utils/geocoding';

interface BecomeVendorWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const LocationPicker = ({ position, setPosition }: { position: { lat: number; lng: number } | null, setPosition: (pos: { lat: number; lng: number }) => void }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position ? (
        <Marker position={position} icon={new L.Icon({
            iconUrl: '/images/markers/marker-icon-orange.png',
            shadowUrl: '/images/markers/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })} />
    ) : null;
};

export const BecomeVendorWizard: React.FC<BecomeVendorWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [geocoding, setGeocoding] = useState(false);

    const [formData, setFormData] = useState<CreateVendorInput>({
        name: '',
        slug: '',
        about_text: '',
        phone: '',
        address: '',
        city: '',
        latitude: undefined,
        longitude: undefined,
        logo_url: '',
        about_image_url: '',
        email: '',
        website: ''
    });

    const [locationPicked, setLocationPicked] = useState<{ lat: number; lng: number } | null>(null);

    // Auto-geocode when address changes
    useEffect(() => {
        if (!formData.address || !formData.city) return;

        const timeoutId = setTimeout(async () => {
            setGeocoding(true);
            const result = await geocodeAddress(formData.address, formData.city);
            if (result) {
                setLocationPicked({ lat: result.lat, lng: result.lng });
                setFormData(prev => ({
                    ...prev,
                    latitude: result.lat,
                    longitude: result.lng
                }));
            }
            setGeocoding(false);
        }, 1500); // Wait 1.5s after user stops typing

        return () => clearTimeout(timeoutId);
    }, [formData.address, formData.city]);

    const handleGeocodeManually = async () => {
        if (!formData.address) {
            alert('נא למלא כתובת תחילה');
            return;
        }

        setGeocoding(true);
        const result = await geocodeAddress(formData.address, formData.city);
        if (result) {
            setLocationPicked({ lat: result.lat, lng: result.lng });
            setFormData(prev => ({
                ...prev,
                latitude: result.lat,
                longitude: result.lng
            }));
            alert('✅ המיקום נמצא בהצלחה!');
        } else {
            alert('לא הצלחנו למצוא את הכתובת. אנא בחר מיקום על המפה.');
        }
        setGeocoding(false);
    };

    if (!isOpen) return null;

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    // Generate slug from name
    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[א-ת]/g, '') // Remove Hebrew chars
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '')
            || `vendor-${Date.now()}`;
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            // Generate slug if not set
            const slug = formData.slug || generateSlug(formData.name);

            const dataToSubmit: CreateVendorInput = {
                ...formData,
                slug,
                latitude: locationPicked ? locationPicked.lat : formData.latitude,
                longitude: locationPicked ? locationPicked.lng : formData.longitude,
            };

            await marketplaceService.createVendor(dataToSubmit);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה ביצירת החנות');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d1424]/60 backdrop-blur-xl w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg">
                            <Store className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-100">הצטרפות לשוק הקהילתי</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress */}
                <div className="w-full bg-white/10 h-1">
                    <div
                        className="bg-orange-500 h-full transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">פרטים בסיסיים</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">שם החנות / המטבח</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="המטבח של סבתא שושנה"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">תיאור קצר</label>
                                <textarea
                                    value={formData.about_text}
                                    onChange={e => setFormData({ ...formData, about_text: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    rows={3}
                                    placeholder="מה מיוחד במטבח שלך? איזה סוג אוכל אתה מכין?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">מספר טלפון להזמנות</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="050-1234567"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">אימייל (אופציונלי)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="vendor@example.com"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right h-full flex flex-col">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">מיקום וכתובת</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">עיר</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="תל אביב, ירושלים, חיפה..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">כתובת מלאה</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="flex-1 p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="רחוב הרצל 1"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGeocodeManually}
                                        disabled={geocoding || !formData.address}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        title="מצא מיקום"
                                    >
                                        {geocoding ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Navigation size={18} />
                                        )}
                                    </button>
                                </div>
                                {geocoding && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        מחפש מיקום...
                                    </p>
                                )}
                                {locationPicked && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        ✓ מיקום נמצא: {locationPicked.lat.toFixed(4)}, {locationPicked.lng.toFixed(4)}
                                    </p>
                                )}
                            </div>

                            <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 relative">
                                <MapContainer
                                    center={[31.0461, 34.8516]}
                                    zoom={8}
                                    className="w-full h-full"
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationPicker
                                        position={locationPicked}
                                        setPosition={setLocationPicked}
                                    />
                                </MapContainer>
                                <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg shadow-md text-xs font-medium z-[1000] backdrop-blur-sm pointer-events-none">
                                    לחץ על המפה כדי לסמן מיקום מדוייק 📍
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">תמונות וסיכום</h3>

                            <div className="space-y-4">
                                <ImageUpload
                                    currentImage={formData.logo_url}
                                    onImageChange={(url) => setFormData({ ...formData, logo_url: url })}
                                    label="לוגו (אופציונלי)"
                                    aspectRatio="1/1"
                                />

                                <ImageUpload
                                    currentImage={formData.about_image_url}
                                    onImageChange={(url) => setFormData({ ...formData, about_image_url: url })}
                                    label="תמונת אודות (אופציונלי)"
                                    aspectRatio="16/9"
                                />
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/40">
                                <h4 className="font-bold text-orange-900 dark:text-orange-200">מוכן לפרסום?</h4>
                                <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                                    לאחר השליחה, החנות שלך תיבדק ותאושר על ידי המנהלים.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between bg-white/5/50 rounded-b-2xl">
                    <button
                        onClick={handleBack}
                        disabled={step === 1}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${step === 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                    >
                        <ChevronRight size={18} /> חזור
                    </button>

                    {step === 3 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.name || !formData.address}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                            שלח לאישור
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && !formData.name) ||
                                (step === 2 && !formData.address)
                            }
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            המשך <ChevronLeft size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

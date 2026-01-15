import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { CreateVendorInput, marketplaceService } from '../../services/marketplaceService';
import { Store, MapPin, Image, Check, ChevronRight, ChevronLeft, X, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

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
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })} />
    ) : null;
};

export const BecomeVendorWizard: React.FC<BecomeVendorWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth0();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateVendorInput>({
        business_name: '',
        description: '',
        phone: '',
        address: '',
        latitude: 31.0461, // Default center
        longitude: 34.8516,
        cover_image: ''
    });

    const [locationPicked, setLocationPicked] = useState<{ lat: number; lng: number } | null>(null);

    if (!isOpen) return null;

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            const dataToSubmit = {
                ...formData,
                latitude: locationPicked ? locationPicked.lat : formData.latitude,
                longitude: locationPicked ? locationPicked.lng : formData.longitude,
                cover_image: formData.cover_image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1000' // Default placeholder
            };

            await marketplaceService.createVendor(dataToSubmit);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'שגיאה ביצירת העסק');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg">
                            <Store className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">הצטרפות כשף למרקטפלייס</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Progress */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1">
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
                                <label className="block text-sm font-medium mb-1">שם העסק / המטבח</label>
                                <input
                                    type="text"
                                    value={formData.business_name}
                                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="המטבח של סבתא שושנה"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">תיאור קצר</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
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
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right h-full flex flex-col">
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">מיקום וכתובת</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">כתובת טקסטואלית</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="רחוב הרצל 1, תל אביב"
                                />
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
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">תמונת נושא וסיכום</h3>

                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <Image size={48} className="text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500 text-center mb-4">
                                    הכנס קישור לתמונה שתופיע בכרטיס העסק שלך
                                </p>
                                <input
                                    type="url"
                                    value={formData.cover_image}
                                    onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm mb-2"
                                    placeholder="https://example.com/image.jpg"
                                />
                                {formData.cover_image && (
                                    <div className="mt-4 w-full h-32 rounded-lg overflow-hidden relative shadow-sm">
                                        <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/40">
                                <h4 className="font-bold text-orange-900 dark:text-orange-200">מוכן לפרסום?</h4>
                                <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
                                    לאחר האישור, העסק שלך יופיע במפת ג'והורי ויוכלו ליצור איתך קשר.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
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
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                            פתח עסק
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && !formData.business_name) ||
                                (step === 2 && !locationPicked) // Require map click? make optional later
                            }
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            המשך <ChevronLeft size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

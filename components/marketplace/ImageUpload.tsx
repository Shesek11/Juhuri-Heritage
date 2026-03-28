import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    currentImage?: string;
    onImageChange: (imageUrl: string) => void;
    label?: string;
    aspectRatio?: string; // e.g., "16/9", "1/1", "4/3"
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    currentImage,
    onImageChange,
    label,
    aspectRatio = '16/9'
}) => {
    const t = useTranslations('marketplace');
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | undefined>(currentImage);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t('selectImageFile'));
            return;
        }

        // Validate file size (15MB max)
        if (file.size > 15 * 1024 * 1024) {
            alert(t('imageTooLarge'));
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || t('uploadError'));
            }

            const data = await response.json();
            onImageChange(data.url);
        } catch (err) {
            console.error('Upload failed:', err);
            alert(err instanceof Error ? err.message : t('uploadError'));
            setPreview(currentImage);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(undefined);
        onImageChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                {preview ? (
                    <div className="relative group">
                        <div
                            className="w-full bg-white/10 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-600"
                            style={{ aspectRatio }}
                        >
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Overlay with remove button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={uploading}
                                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                                <div className="text-center text-white">
                                    <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                                    <p className="text-sm">{t('uploading')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-orange-500 dark:hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ aspectRatio }}
                    >
                        <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin mb-3" size={48} />
                                    <p className="text-sm">{t('uploading')}</p>
                                </>
                            ) : (
                                <>
                                    <Upload size={48} className="mb-3" />
                                    <p className="text-sm font-medium">{t('clickToUpload')}</p>
                                    <p className="text-xs mt-1">{t('fileFormats')}</p>
                                </>
                            )}
                        </div>
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
};

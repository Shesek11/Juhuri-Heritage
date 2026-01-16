import React, { useRef, useState } from 'react';
import { familyService } from '../../services/familyService';
import { Upload, Download, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface GedcomToolsProps {
    onSuccess?: () => void;
}

export const GedcomTools: React.FC<GedcomToolsProps> = ({ onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setMessage(null);

        try {
            const result = await familyService.importGedcom(file);
            setMessage({
                type: 'success',
                text: result.message || 'הקובץ יובא בהצלחה!'
            });
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Import failed:', err);
            setMessage({
                type: 'error',
                text: err.message || 'שגיאה בייבוא הקובץ'
            });
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Clear success message after 5 seconds
            setTimeout(() => {
                setMessage(null);
            }, 5000);
        }
    };

    const handleExportClick = async () => {
        setExporting(true);
        try {
            await familyService.exportGedcom();
        } catch (err) {
            console.error('Export failed:', err);
            alert('שגיאה בייצוא הקובץ');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".ged,.gedcom"
                className="hidden"
            />

            <button
                onClick={handleImportClick}
                disabled={importing}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 rounded-lg text-xs font-bold hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                title="ייבוא מקובץ GEDCOM"
            >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                ייבוא
            </button>

            <button
                onClick={handleExportClick}
                disabled={exporting}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="ייצוא לקובץ GEDCOM"
            >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                ייצוא
            </button>

            {message && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4 ${message.type === 'success'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

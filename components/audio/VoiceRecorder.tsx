import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, X, RotateCcw, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface VoiceRecorderProps {
    entryId: string | number;
    dialectId?: number;
    onRecordingComplete?: (url: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ entryId, dialectId, onRecordingComplete }) => {
    const { user, isAuthenticated } = useAuth();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [guestName, setGuestName] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('לא ניתן להקליט. יש לאשר גישה למיקרופון.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const resetRecording = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
        setUploadStatus(null);
    };

    const uploadRecording = async () => {
        if (!audioBlob) return;
        if (!isAuthenticated && !guestName.trim()) {
            alert('יש להזין שם לפני העלאה');
            return;
        }

        setIsUploading(true);
        setUploadStatus(null);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('entryId', String(entryId));
            formData.append('duration', String(recordingTime));
            if (dialectId) formData.append('dialectId', String(dialectId));
            if (isAuthenticated && user?.sub) {
                formData.append('userId', String(user.id));
            } else {
                formData.append('guestName', guestName);
            }

            const response = await fetch('/api/recordings/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setUploadStatus({ success: true, message: data.message });
                onRecordingComplete?.(data.fileUrl);
                setTimeout(() => resetRecording(), 3000);
            } else {
                setUploadStatus({ success: false, message: data.error || 'שגיאה בהעלאה' });
            }

        } catch (err) {
            console.error('Upload failed:', err);
            setUploadStatus({ success: false, message: 'שגיאה בהעלאה' });
        } finally {
            setIsUploading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mic size={16} />
                    הקלט את ההגייה שלך
                </h4>
                <span className="text-xs text-slate-400">{formatTime(recordingTime)}</span>
            </div>

            {/* Guest Name Input */}
            {!isAuthenticated && !audioUrl && (
                <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="השם שלך"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                />
            )}

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-3">
                {!audioUrl ? (
                    // Recording mode
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : 'bg-amber-500 hover:bg-amber-600'
                            } text-white`}
                    >
                        {isRecording ? <Square size={24} /> : <Mic size={28} />}
                    </button>
                ) : (
                    // Playback mode
                    <>
                        <button
                            onClick={resetRecording}
                            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                            title="הקלט מחדש"
                        >
                            <RotateCcw size={18} className="text-slate-600 dark:text-slate-300" />
                        </button>

                        <button
                            onClick={togglePlayback}
                            className="w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center transition-colors text-white shadow-lg"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} className="mr-[-2px]" />}
                        </button>

                        <button
                            onClick={uploadRecording}
                            disabled={isUploading || (!isAuthenticated && !guestName.trim())}
                            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors text-white"
                            title="העלה"
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Upload size={18} />
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Recording indicator */}
            {isRecording && (
                <p className="text-center text-sm text-red-500 animate-pulse">מקליט...</p>
            )}

            {/* Status message */}
            {uploadStatus && (
                <div className={`flex items-center justify-center gap-2 text-sm ${uploadStatus.success ? 'text-green-600' : 'text-red-500'}`}>
                    {uploadStatus.success && <CheckCircle size={16} />}
                    {uploadStatus.message}
                </div>
            )}

            {/* Hidden audio element */}
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                />
            )}

            {!isAuthenticated && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    הקלטות אורחים ממתינות לאישור מנהל
                </p>
            )}
        </div>
    );
};

export default VoiceRecorder;

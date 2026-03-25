import React from 'react';
import { Mic, Play, ThumbsUp } from 'lucide-react';
import VoiceRecorder from '../audio/VoiceRecorder';

interface Recording {
  id: string | number;
  userName: string;
  dialect?: string;
  duration?: number;
  upvotes?: number;
  audioUrl?: string;
}

interface RecordingsListProps {
  recordings: Recording[];
  entryId: string;
}

const RecordingsList: React.FC<RecordingsListProps> = ({ recordings, entryId }) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm uppercase tracking-wider text-slate-300 dark:text-slate-300 font-bold flex items-center gap-2">
        <Mic size={14} />
        הגיות מהקהילה
      </h3>

      {recordings.length > 0 ? (
        <div className="space-y-2">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <button
                className="p-2 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors shrink-0"
                title="השמע"
              >
                <Play size={16} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate">{rec.userName}</span>
                  {rec.dialect && (
                    <span className="text-xs text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded">
                      {rec.dialect}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-300">{formatDuration(rec.duration)}</span>
              </div>

              {typeof rec.upvotes === 'number' && (
                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <ThumbsUp size={12} />
                  <span className="font-bold">{rec.upvotes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          אין עדיין הקלטות למילה זו. היו הראשונים להקליט!
        </p>
      )}

      {/* Voice recorder */}
      <VoiceRecorder entryId={entryId} />
    </div>
  );
};

export default RecordingsList;

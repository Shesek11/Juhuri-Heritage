
import { DictionaryEntry, DialectScript, DialectItem, SystemEvent, EventType, User } from '../types';
import { dictionaryApi, dialectsApi, logsApi } from './apiService';

// --- System Logging ---
// Logging is now handled automatically by the backend

export const getSystemLogs = async (params?: { limit?: number; eventType?: string; userId?: string; from?: string; to?: string; search?: string }): Promise<{ logs: SystemEvent[]; users: { id: string; name: string; email: string }[] }> => {
  try {
    const response = await logsApi.get({ limit: 200, ...params });
    return { logs: response.logs || [], users: response.users || [] };
  } catch (err) {
    console.error('Failed to get logs:', err);
    return { logs: [], users: [] };
  }
};

export const logSystemEvent = async (
  type: EventType,
  description: string,
  actor: { id: string, name: string } | null,
  metadata?: any
): Promise<void> => {
  // Logging is now handled automatically by backend routes
  // This function is kept for backward compatibility
};

// --- Custom Entries Logic ---

export const getCustomEntries = async (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{ entries: DictionaryEntry[]; total: number; page: number; totalPages: number }> => {
  try {
    const response = await dictionaryApi.getEntries(params);
    return {
      entries: response.entries || [],
      total: response.total || 0,
      page: response.page || 1,
      totalPages: response.totalPages || 1,
    };
  } catch (err) {
    console.error('Failed to get entries:', err);
    return { entries: [], total: 0, page: 1, totalPages: 1 };
  }
};

export const saveCustomEntries = async (entries: DictionaryEntry[]): Promise<void> => {
  // Batch save is handled differently now
  await dictionaryApi.addBatchEntries(entries);
};

export const addCustomEntry = async (entry: DictionaryEntry, actor?: User | null): Promise<void> => {
  const ds = entry.dialectScripts?.[0];
  await dictionaryApi.addEntry({
    term: entry.hebrewScript,
    translation: ds?.hebrewScript || '',
    hebrewShort: entry.hebrewShort || '',
    latinScript: ds?.latinScript || '',
    cyrillicScript: ds?.cyrillicScript || '',
    dialect: ds?.dialect || 'General',
    notes: entry.hebrewLong || ''
  });
};

export const deleteCustomEntry = async (term: string, actor: User): Promise<void> => {
  await dictionaryApi.deleteEntry(term);
};

export const approveEntry = async (term: string, adminUser: User): Promise<void> => {
  await dictionaryApi.approveEntry(term);
};

export const findCustomEntry = async (term: string): Promise<DictionaryEntry | null> => {
  try {
    const response = await dictionaryApi.search(term);
    return response.found ? response.entry : null;
  } catch (err) {
    console.error('Failed to find entry:', err);
    return null;
  }
};

// --- Dialects Logic ---

export const getDialects = async (): Promise<DialectItem[]> => {
  try {
    const response = await dialectsApi.getAll();
    return response.dialects || [];
  } catch (err) {
    console.error('Failed to get dialects:', err);
    return [
      { id: '1', name: 'Quba', description: 'קובה (כללי)' },
      { id: '2', name: 'Derbent', description: 'דרבנט' },
      { id: '3', name: 'General', description: 'כללי' }
    ];
  }
};

export const saveDialects = async (dialects: DialectItem[]): Promise<void> => {
  // Individual dialect operations are done separately
};

export const addDialect = async (name: string, description: string, actor: User): Promise<DialectItem> => {
  const response = await dialectsApi.add(name, description);
  return {
    id: response.id.toString(),
    name,
    description
  };
};

export const deleteDialect = async (id: string): Promise<void> => {
  await dialectsApi.delete(id);
};

// --- Excel Logic ---

export const parseExcelData = (text: string): DictionaryEntry[] => {
  const rows = text.trim().split('\n');
  const entries: DictionaryEntry[] = [];

  rows.forEach(row => {
    const cols = row.split('\t');
    if (cols.length < 2) return;

    const hebrewScript = cols[0]?.trim();
    const hebrewShort = cols[1]?.trim() || '';
    const latinScript = cols[2]?.trim() || '';
    const dialect = cols[3]?.trim() || 'General';
    const definition = cols[4]?.trim() || '';
    const cyrillicScript = cols[5]?.trim() || '';

    if (hebrewScript) {
      const dialectScript: DialectScript = {
        dialect,
        hebrewScript: hebrewShort,
        latinScript,
        cyrillicScript
      };

      const entry: DictionaryEntry = {
        hebrewScript,
        detectedLanguage: 'Hebrew',
        dialectScripts: [dialectScript],
        hebrewLong: definition || null,
        examples: [],
        isCustom: true,
        source: 'מאגר',
        status: 'active'
      };
      entries.push(entry);
    }
  });

  return entries;
};

export const downloadTemplate = (): void => {
  const headers = ['Term', 'Hebrew Translation', 'Latin Transliteration', 'Dialect', 'Definition', 'Cyrillic (Optional)'];
  const exampleRow = ['Sholom', 'שלום', 'Sholom', 'General', 'Greeting meaning peace/hello', 'Шолом'];

  const content = [
    headers.join('\t'),
    exampleRow.join('\t')
  ].join('\n');

  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'juhuri_dictionary_template.tsv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

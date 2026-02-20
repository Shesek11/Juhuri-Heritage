// API Client for Juhuri Heritage Backend
// All API calls go through this service

let authToken: string | null = null;
const API_BASE = '/api';

// Helper for making API requests
const request = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE}${endpoint}`;

    const config: RequestInit = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...options.headers,
        },
        credentials: 'include', // Include cookies for auth
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'שגיאת שרת' }));
        const errorMessage = error.details ? `${error.error}: ${error.details}` : (error.error || `HTTP ${response.status}`);
        if (response.status !== 401) {
            console.error('API Error Details:', error);
        }
        throw new Error(errorMessage);
    }

    return response.json();
};

// --- Auth API ---
export const authApi = {
    register: (name: string, email: string, password: string) =>
        request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        }),

    login: (email: string, password: string) =>
        request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),

    logout: () =>
        request('/auth/logout', { method: 'POST' }),

    getMe: () =>
        request('/auth/me'),

    updateProfile: (data: { name?: string; password?: string }) =>
        request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
};

// --- Dictionary API ---
export const dictionaryApi = {
    search: (term: string) =>
        request(`/dictionary/search?q=${encodeURIComponent(term)}`),

    getEntries: (params?: { status?: string; page?: number; limit?: number; search?: string }) => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.search) qs.set('search', params.search);
        const query = qs.toString();
        return request(`/dictionary/entries${query ? `?${query}` : ''}`);
    },

    addEntry: (data: { term: string; translation: string; dialect?: string; notes?: string }) =>
        request('/dictionary/entries', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    addBatchEntries: (entries: any[]) =>
        request('/dictionary/entries/batch', {
            method: 'POST',
            body: JSON.stringify({ entries })
        }),

    approveEntry: (term: string) =>
        request(`/dictionary/entries/${encodeURIComponent(term)}/approve`, {
            method: 'PUT'
        }),

    deleteEntry: (term: string) =>
        request(`/dictionary/entries/${encodeURIComponent(term)}`, {
            method: 'DELETE'
        }),
};

// --- Dialects API ---
export const dialectsApi = {
    getAll: () =>
        request('/dialects'),

    add: (name: string, description: string) =>
        request('/dialects', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        }),

    delete: (id: string) =>
        request(`/dialects/${id}`, { method: 'DELETE' }),
};

// --- Users API (Admin) ---
export const usersApi = {
    getAll: () =>
        request('/users'),

    updateRole: (userId: string, role: string) =>
        request(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        }),

    resetPassword: (userId: string) =>
        request(`/users/${userId}/reset-password`, { method: 'PUT' }),

    delete: (userId: string) =>
        request(`/users/${userId}`, { method: 'DELETE' }),
};

// --- Gemini API (AI) ---
export const geminiApi = {
    search: (query: string) =>
        request('/gemini/search', {
            method: 'POST',
            body: JSON.stringify({ query })
        }),

    searchAudio: (audioData: string, mimeType: string) =>
        request('/gemini/search-audio', {
            method: 'POST',
            body: JSON.stringify({ audioData, mimeType })
        }),

    tts: (text: string, voice?: string) =>
        request('/gemini/tts', {
            method: 'POST',
            body: JSON.stringify({ text, voice })
        }),

    tutor: (history: any[], config: any, message: string) =>
        request('/gemini/tutor', {
            method: 'POST',
            body: JSON.stringify({ history, config, message })
        }),

    generateLesson: (topic: string, dialect: string, level: string, count?: number) =>
        request('/gemini/generate-lesson', {
            method: 'POST',
            body: JSON.stringify({ topic, dialect, level, count })
        }),

    generateEntries: (category: string, count?: number) =>
        request('/gemini/generate-entries', {
            method: 'POST',
            body: JSON.stringify({ category, count })
        }),

    verify: (data: any) =>
        request('/gemini/verify', {
            method: 'POST',
            body: JSON.stringify({ data })
        }),
};

// --- Progress API ---
export const progressApi = {
    get: () =>
        request('/progress'),

    completeUnit: (unitId: string, score?: number) =>
        request('/progress/complete-unit', {
            method: 'POST',
            body: JSON.stringify({ unitId, score })
        }),

    addXp: (xp: number) =>
        request('/progress/add-xp', {
            method: 'POST',
            body: JSON.stringify({ xp })
        }),
};


// --- Logs API ---
export const logsApi = {
    get: (limit?: number, eventType?: string) =>
        request(`/logs?limit=${limit || 100}${eventType ? `&eventType=${eventType}` : ''}`),
};

const apiService = {
    setToken: (token: string) => { authToken = token; },
    get: <T>(endpoint: string) => request(endpoint) as Promise<T>,
    post: <T>(endpoint: string, body?: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }) as Promise<T>,
    put: <T>(endpoint: string, body?: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }) as Promise<T>,
    delete: <T>(endpoint: string, body?: any) => request(endpoint, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }) as Promise<T>,
    baseURL: API_BASE
};

export default apiService;

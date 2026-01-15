import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => void; // Trigger for manual login modal
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        try {
            // "me" endpoint returns { user: ... } if cookie is valid
            const response = await apiService.get<{ user: User }>('/auth/me');
            if (response.user) {
                setUser(response.user);
            }
        } catch (err) {
            // Not logged in or error
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Check for login success from backend redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get('login') === 'success') {
            // Clear URL
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchUser();
        } else {
            fetchUser();
        }
    }, []);

    const logout = async () => {
        try {
            await apiService.post('/auth/logout', {});
            setUser(null);
            // Optional: reload page to clear any client state
            window.location.reload();
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const login = () => {
        // Placeholder function if we want to programmatically open the modal
        // In this app, we control modal visibility via local state in App.tsx
        // but the context can expose a way if we refactor. For now, empty.
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
            refreshUser: fetchUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

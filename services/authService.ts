
import { User, UserRole } from '../types';
import { authApi } from './apiService';

// Session storage key for caching user in memory
let currentUser: User | null = null;

// Initialize auth - check if user is logged in
export const initAuth = async (): Promise<void> => {
    try {
        const response = await authApi.getMe();
        if (response.user) {
            currentUser = response.user;
        }
    } catch (err) {
        // Not logged in - that's okay
        currentUser = null;
    }
};

export const login = async (email: string, password: string): Promise<User> => {
    const response = await authApi.login(email, password);
    currentUser = response.user;
    return response.user;
};

export const register = async (name: string, email: string, password: string): Promise<User> => {
    const response = await authApi.register(name, email, password);
    currentUser = response.user;
    return response.user;
};

export const logout = async (): Promise<void> => {
    await authApi.logout();
    currentUser = null;
};

export const getCurrentUser = (): User | null => {
    return currentUser;
};

export const setCurrentUser = (user: User | null): void => {
    currentUser = user;
};

export const incrementContribution = async (userId: string): Promise<void> => {
    // This is handled automatically by the backend when adding entries
    // Refresh user data to get updated count
    try {
        const response = await authApi.getMe();
        if (response.user) {
            currentUser = response.user;
        }
    } catch (err) {
        console.error('Failed to refresh user:', err);
    }
};

// --- Progress Management ---

export const updateUserProgress = async (userId: string, xpGained: number, completedUnitId?: string): Promise<User | undefined> => {
    // This is now handled by progressApi in the components
    // Keep for backward compatibility but no-op
    return currentUser || undefined;
};

// --- Admin & Profile Management Functions ---

export const getAllUsers = async (): Promise<User[]> => {
    const { usersApi } = await import('./apiService');
    const response = await usersApi.getAll();
    return response.users || [];
};

export const updateUserRole = async (userId: string, newRole: UserRole, adminUser?: User): Promise<void> => {
    const { usersApi } = await import('./apiService');
    await usersApi.updateRole(userId, newRole);
};

export const updateUser = async (userId: string, updates: { name?: string; password?: string }): Promise<User> => {
    const response = await authApi.updateProfile(updates);
    if (currentUser?.id?.toString() === userId) {
        currentUser = { ...currentUser, ...response.user };
    }
    return response.user;
};

export const deleteUser = async (userId: string, adminUser?: User): Promise<void> => {
    const { usersApi } = await import('./apiService');
    await usersApi.delete(userId);
};

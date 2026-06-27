/**
 * SUVIDHA KIOSK — Persistence Utility
 * Handles state and form data persistence across reloads.
 */

const APP_PREFIX = 'aazhi_';

export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw || raw === 'null' || raw === 'undefined') return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export const Persistence = {
    /**
     * Save current route/view state
     */
    saveRoute: (view: string, subView?: any) => {
        sessionStorage.setItem(`${APP_PREFIX}last_view`, JSON.stringify({ view, subView, timestamp: Date.now() }));
    },

    /**
     * Load last saved route
     */
    loadRoute: () => {
        const saved = sessionStorage.getItem(`${APP_PREFIX}last_view`);
        if (!saved) return null;
        try {
            const data = JSON.parse(saved);
            // Expire after 30 minutes for security
            if (Date.now() - data.timestamp > 30 * 60 * 1000) {
                sessionStorage.removeItem(`${APP_PREFIX}last_view`);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Save form data with unique key
     */
    saveFormData: (formKey: string, data: any) => {
        sessionStorage.setItem(`${APP_PREFIX}form_${formKey}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    },

    /**
     * Load form data for a unique key
     */
    loadFormData: (formKey: string) => {
        const saved = sessionStorage.getItem(`${APP_PREFIX}form_${formKey}`);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            // Expire form data after 1 hour
            if (Date.now() - parsed.timestamp > 60 * 60 * 1000) {
                sessionStorage.removeItem(`${APP_PREFIX}form_${formKey}`);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Clear specific form data
     */
    clearFormData: (formKey: string) => {
        sessionStorage.removeItem(`${APP_PREFIX}form_${formKey}`);
        if (currentSaveKey === formKey && saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
            currentSaveKey = null;
        }
    },

    /**
     * Clear all non-essential persistence data
     */
    clearAll: () => {
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(APP_PREFIX) && !key.includes('token') && !key.includes('user')) {
                sessionStorage.removeItem(key);
            }
        });
    }
};

/**
 * Hook-friendly debounced saver
 */
let saveTimeout: any = null;
let currentSaveKey: string | null = null;
export const debounceSaveForm = (formKey: string, data: any, delay = 1000) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    currentSaveKey = formKey;
    saveTimeout = setTimeout(() => {
        Persistence.saveFormData(formKey, data);
        saveTimeout = null;
        currentSaveKey = null;
    }, delay);
};

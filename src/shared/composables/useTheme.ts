import { ref } from 'vue';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'app-theme';
const activeTheme = ref<AppTheme>('light');
let isInitialized = false;

const applyTheme = (theme: AppTheme): void => {
    document.documentElement.dataset.theme = theme;
    activeTheme.value = theme;
};

const getPreferredTheme = (): AppTheme => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const initializeTheme = (): void => {
    if (isInitialized) {
        return;
    }

    applyTheme(getPreferredTheme());
    isInitialized = true;
};

export const useTheme = () => {
    const setTheme = (theme: AppTheme): void => {
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    };

    const toggleTheme = (): void => {
        setTheme(activeTheme.value === 'dark' ? 'light' : 'dark');
    };

    return {
        theme: activeTheme,
        setTheme,
        toggleTheme,
    };
};

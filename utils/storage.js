// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    USER_ID: 'user_id',
    DOMAIN: 'selected_domain',
    // Nové klíče pro nastavení
    SETTINGS: 'app_settings'
};

const DEFAULT_SETTINGS = {
    smPrefix: '',           // Prefix Skladového Místa (např. "L")
    itemPrefix: 'R',        // Prefix Reference (např. "R")
    resetSmAfterItem: false,// "Sken SM po každé zásobě" (ANO/NE)
    checkAgainstDb: true,   // "Dohledání Reference v import. datech" (ANO/NE)
    manualQty: true         // Zadání množství (ANO/NE) - v PDF "Zadání Množství"
};

export const StorageService = {
    // ... (existující metody loadAccessToken, saveAccessToken atd. nech beze změny) ...

    saveAccessToken: async (token) => {
        try {
            await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
        } catch (error) {
            console.error('Error saving access token:', error);
        }
    },

    loadAccessToken: async () => {
        try {
            return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
        } catch (error) {
            console.error('Error loading access token:', error);
            return null;
        }
    },

    saveUserID: async (userID) => {
        try {
            await AsyncStorage.setItem(KEYS.USER_ID, userID);
        } catch (error) {
            console.error('Error saving user ID:', error);
        }
    },

    loadUserID: async () => {
        try {
            return await AsyncStorage.getItem(KEYS.USER_ID);
        } catch (error) {
            console.error('Error loading user ID:', error);
            return null;
        }
    },

    saveDomainSelection: async (domain) => {
        try {
            await AsyncStorage.setItem(KEYS.DOMAIN, domain);
        } catch (error) {
            console.error('Error saving domain:', error);
        }
    },

    loadDomainSelection: async () => {
        try {
            return await AsyncStorage.getItem(KEYS.DOMAIN);
        } catch (error) {
            console.error('Error loading domain:', error);
            return null;
        }
    },

    clearAuth: async () => {
        try {
            await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.USER_ID, KEYS.DOMAIN]);
        } catch (error) {
            console.error('Error clearing auth:', error);
        }
    },

    // --- NOVÉ METODY PRO NASTAVENÍ ---

    saveSettings: async (settings) => {
        try {
            const jsonValue = JSON.stringify(settings);
            await AsyncStorage.setItem(KEYS.SETTINGS, jsonValue);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    },

    loadSettings: async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(KEYS.SETTINGS);
            if (jsonValue != null) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(jsonValue) };
            }
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading settings:', error);
            return DEFAULT_SETTINGS;
        }
    }
};
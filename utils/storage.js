import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageService = {
    async saveDomainSelection(domain) {
        try {
            await AsyncStorage.setItem('selectedDomain', domain);
        } catch (error) {
            console.error('Error saving domain selection:', error);
        }
    },

    async loadDomainSelection() {
        try {
            const domain = await AsyncStorage.getItem('selectedDomain');
            return  domain;
        } catch (error) {
            console.error('Error loading domain selection:', error);
            return null;
        }
    },

    async clearDomainSelection() {
        try {
            await AsyncStorage.removeItem('selectedDomain');
        } catch (error) {
            console.error('Error clearing domain selection:', error);
        }
    },

    // New methods for access token
    async saveAccessToken(accessToken) {
        try {
            await AsyncStorage.setItem('accessToken', accessToken);
        } catch (error) {
            console.error('Error saving access token:', error);
        }
    },

    async loadAccessToken() {
        try {
            const accessToken = await AsyncStorage.getItem('accessToken');
            return accessToken;
        } catch (error) {
            console.error('Error loading access token:', error);
            return null;
        }
    },

    async clearAccessToken() {
        try {
            await AsyncStorage.removeItem('accessToken');
        } catch (error) {
            console.error('Error clearing access token:', error);
        }
    },

    // Updated clearAll method for sign out
    async clearAllUserData() {
        try {
            await AsyncStorage.multiRemove(['selectedDomain', 'accessToken', 'importFilters', 'userID']);
        } catch (error) {
            console.error('Error clearing all user data:', error);
        }
    },

    // New methods for import filters
    async saveImportFilters(filters) {
        try {
            await AsyncStorage.setItem('importFilters', JSON.stringify(filters));
        } catch (error) {
            console.error('Error saving import filters:', error);
        }
    },

    async loadImportFilters() {
        try {
            const filtersString = await AsyncStorage.getItem('importFilters');
            return filtersString ? JSON.parse(filtersString) : null;
        } catch (error) {
            console.error('Error loading import filters:', error);
            return null;
        }
    },

    async clearImportFilters() {
        try {
            await AsyncStorage.removeItem('importFilters');
        } catch (error) {
            console.error('Error clearing import filters:', error);
        }
    },

    async saveUserID(userID) {
        try {
            await AsyncStorage.setItem('userID', userID);
        } catch (error) {
            console.error('Error saving user ID:', error);
        }
    },

    async loadUserID() {
        try {
            const userID = await AsyncStorage.getItem('userID');
            return userID;
        } catch (error) {
            console.error('Error loading user ID:', error);
            return null;
        }
    }
};
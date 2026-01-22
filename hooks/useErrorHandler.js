import { Alert } from 'react-native';

export const useErrorHandler = () => {
    const handleError = (error, context = '') => {
        console.error(`Error in ${context}:`, error);
        
        let message = 'An unexpected error occurred';
        
        if (error.response) {
            // Server responded with error status
            message = `Server error: ${error.response.status}`;
        } else if (error.request) {
            // Network error
            message = 'Network error. Please check your connection.';
        } else if (error.message) {
            message = error.message;
        }
        
        Alert.alert('Error', message);
    };

    return { handleError };
};
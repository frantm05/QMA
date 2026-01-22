import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";

const LoadingButton = ({ onPress, title, isLoading = false, disabled = false, style }) => (
    <TouchableOpacity 
        style={[styles.button, disabled && styles.disabled, style]} 
        onPress={onPress}
        disabled={disabled || isLoading}
    >
        {isLoading ? (
            <ActivityIndicator size="small" color="white" />
        ) : (
            <Text style={styles.buttonText}>{title}</Text>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
        minWidth: 150,
    },
    disabled: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default LoadingButton;
import { Text, StyleSheet, TouchableOpacity } from "react-native";

const Button = ({ onPress, title, disabled = false }) => (
    <TouchableOpacity 
        style={[styles.button, disabled && styles.disabled]} 
        onPress={onPress}
        disabled={disabled}
    >
        <Text style={styles.buttonText}>{title}</Text>
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

export default Button;
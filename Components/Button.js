import { Text, StyleSheet, TouchableOpacity } from "react-native";

const Button = ({ onPress, title, disabled = false, style }) => (
    <TouchableOpacity 
        style={[styles.button, disabled && styles.disabled, style]} 
        onPress={onPress}
        disabled={disabled}
    >
        <Text style={[styles.buttonText, disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#28a745',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 50,
    },
    disabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    disabledText: {
        color: '#888',
    },
});

export default Button;
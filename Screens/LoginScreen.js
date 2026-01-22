import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator } from "react-native";
import LoadingButton from "../Components/LoadingButton";
import { databaseService } from "../Database/Database";
import apiService from "../services/apiService";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { StorageService } from "../utils/storage";

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { handleError } = useErrorHandler();

    const handleLogin = async () => {

        setIsLoading(true);
        try {
            const accessToken = await apiService.authenticate(username, password);
            
            await StorageService.saveAccessToken(accessToken);
            
            await databaseService.initDB();

            await StorageService.saveUserID(username);

            navigation.navigate("Home");
        } catch (error) {
            handleError(error, 'Login');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
            />
            <LoadingButton 
                title="Login" 
                onPress={handleLogin} 
                isLoading={isLoading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',

    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        width: '60%',
        maxWidth: 300,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 12,
    },
});

export default LoginScreen;
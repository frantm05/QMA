// Screens/LoginScreen.js
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import LoadingButton from "../Components/LoadingButton";
import Button from "../Components/Button"; // Ujisti se, že importuješ Button komponentu
import { databaseService } from "../Database/Database";
import apiService from "../services/apiService";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { StorageService } from "../utils/storage";

const LoginScreen = ({ navigation }) => {
    // State pro online login
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // State pro offline flow
    const [isOfflinePromptVisible, setIsOfflinePromptVisible] = useState(false);
    const [offlineUser, setOfflineUser] = useState('');

    const { handleError } = useErrorHandler();

    // 1. ONLINE LOGIN
    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const accessToken = await apiService.authenticate(username, password);
            await StorageService.saveAccessToken(accessToken);
            await databaseService.initDB();
            await StorageService.saveUserID(username);
            navigation.replace("DomainSelection");
        } catch (error) {
            handleError(error, 'Login');
        } finally {
            setIsLoading(false);
        }
    }

    // 2. OFFLINE LOGIN - Krok 1: Zobrazit input
    const showOfflinePrompt = () => {
        setIsOfflinePromptVisible(true);
    };

    // 3. OFFLINE LOGIN - Krok 2: Potvrdit a jít dál
    const confirmOfflineLogin = async () => {
        if (!offlineUser.trim()) {
            Alert.alert("Chyba", "Prosím zadejte identifikátor (jméno nebo číslo).");
            return;
        }

        await databaseService.initDB(); // Inicializace DB i v offline
        await StorageService.saveUserID(offlineUser); // Uloží "Spočetl"
        
        // Navigujeme na Home s parametrem isOffline
        navigation.replace("Home", { isOffline: true });
    };

    const cancelOfflinePrompt = () => {
        setIsOfflinePromptVisible(false);
        setOfflineUser('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>QAD Inventura</Text>

            {/* Pokud uživatel klikl na "Pokračovat bez přihlášení", zobrazíme jen výzvu pro jméno */}
            {isOfflinePromptVisible ? (
                <View style={styles.promptContainer}>
                    <Text style={styles.subtitle}>Offline režim</Text>
                    <Text style={styles.label}>Zadejte identifikátor (Spočetl):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Jméno / ID zaměstnance"
                        value={offlineUser}
                        onChangeText={setOfflineUser}
                        autoFocus={true}
                    />
                    <Button title="Pokračovat" onPress={confirmOfflineLogin} />
                    <View style={{marginTop: 10, width: '100%'}}>
                        <Button title="Zrušit" onPress={cancelOfflinePrompt} style={{backgroundColor: '#666'}} />
                    </View>
                </View>
            ) : (
                /* Standardní Login Obrazovka */
                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Uživatelské jméno (QAD)"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Heslo"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <LoadingButton 
                        title="Přihlásit (Online)" 
                        onPress={handleLogin} 
                        isLoading={isLoading}
                    />

                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>NEBO</Text>
                    </View>

                    <TouchableOpacity style={styles.offlineLink} onPress={showOfflinePrompt}>
                        <Text style={styles.offlineLinkText}>Pokračovat bez přihlášení</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
    },
    subtitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#555',
    },
    formContainer: {
        width: '100%',
        maxWidth: 300,
    },
    promptContainer: {
        width: '100%',
        maxWidth: 300,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    label: {
        alignSelf: 'flex-start',
        marginBottom: 5,
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    divider: {
        marginVertical: 20,
        alignItems: 'center',
    },
    dividerText: {
        color: '#999',
        fontWeight: 'bold',
    },
    offlineLink: {
        padding: 10,
        alignItems: 'center',
    },
    offlineLinkText: {
        color: '#007bff', // Modrá barva odkazu
        fontWeight: 'bold',
        fontSize: 16,
        textDecorationLine: 'underline',
    }
});

export default LoginScreen;
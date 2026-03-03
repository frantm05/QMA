// Screens/LoginScreen.js
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from "react-native";
import LoadingButton from "../Components/LoadingButton";
import Button from "../Components/Button";
import { databaseService } from "../Database/Database";
import db from "../Database/Database";
import apiService from "../services/apiService";
import { useErrorHandler } from "../hooks/useErrorHandler";
import { StorageService } from "../utils/storage";

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [isOfflinePromptVisible, setIsOfflinePromptVisible] = useState(false);
    const [offlineUser, setOfflineUser] = useState('');

    const { handleError } = useErrorHandler();

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const accessToken = await apiService.authenticate(username, password);
            await StorageService.saveAccessToken(accessToken);
            await StorageService.saveUserID(username);

            // Bezpečná inicializace – NEVYMAŽE existující offline skeny
            await databaseService.initDBSafe();

            // Zkontrolujeme, zda existují offline skeny
            const database = await db;
            const existingScans = await database.getAllAsync(
                'SELECT COUNT(*) as count FROM inventory_scans'
            );
            const scanCount = existingScans[0]?.count || 0;

            if (scanCount > 0) {
                Alert.alert(
                    "Existující offline data",
                    `V zařízení je ${scanCount} dříve naskenovaných záznamů.\n\nMůžete je ponechat pro export do QAD nebo smazat a začít čistě.`,
                    [
                        {
                            text: "Ponechat data",
                            onPress: () => {
                                navigation.replace("DomainSelection");
                            }
                        },
                        {
                            text: "Smazat a začít čistě",
                            style: "destructive",
                            onPress: async () => {
                                await database.execAsync('DELETE FROM inventory_scans');
                                await database.execAsync('DELETE FROM resources');
                                navigation.replace("DomainSelection");
                            }
                        }
                    ]
                );
            } else {
                navigation.replace("DomainSelection");
            }
        } catch (error) {
            handleError(error, 'Login');
        } finally {
            setIsLoading(false);
        }
    }

    const showOfflinePrompt = () => {
        setIsOfflinePromptVisible(true);
    };

    const confirmOfflineLogin = async () => {
        if (!offlineUser.trim()) {
            Alert.alert("Chyba", "Prosím zadejte identifikátor (jméno nebo číslo).");
            return;
        }

        try {
            // Bezpečná inicializace – NEVYMAŽE existující data
            await databaseService.initDBSafe();

            const database = await db;
            const existingScans = await database.getAllAsync(
                'SELECT COUNT(*) as count FROM inventory_scans'
            );
            const scanCount = existingScans[0]?.count || 0;

            await StorageService.saveUserID(offlineUser);
            // Vyčistíme online tokeny aby se správně detekoval offline režim
            await StorageService.saveAccessToken('');
            await StorageService.saveDomainSelection('');

            if (scanCount > 0) {
                Alert.alert(
                    "Existující data",
                    `V zařízení je ${scanCount} dříve naskenovaných záznamů.`,
                    [
                        {
                            text: "Pokračovat ve skenování",
                            onPress: () => {
                                navigation.replace("Home", { isOffline: true });
                            }
                        },
                        {
                            text: "Vymazat a začít znovu",
                            style: "destructive",
                            onPress: async () => {
                                await database.execAsync('DELETE FROM inventory_scans');
                                await database.execAsync('DELETE FROM resources');
                                navigation.replace("Home", { isOffline: true });
                            }
                        },
                        {
                            text: "Zrušit",
                            style: "cancel"
                        }
                    ]
                );
            } else {
                navigation.replace("Home", { isOffline: true });
            }
        } catch (error) {
            console.error("Offline init error:", error);
            Alert.alert("Chyba", "Nepodařilo se inicializovat databázi: " + error.message);
        }
    };

    const cancelOfflinePrompt = () => {
        setIsOfflinePromptVisible(false);
        setOfflineUser('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>QAD Inventura</Text>

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
                    <View style={styles.actionRow}>
                        <Button title="Pokračovat" onPress={confirmOfflineLogin} />
                    </View>
                    <View style={styles.actionRow}>
                        <Button title="Zrušit" onPress={cancelOfflinePrompt} style={{backgroundColor: '#dc3545'}} />
                    </View>
                </View>
            ) : (
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
    actionRow: {
        marginBottom: 10,
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
        color: '#007bff',
        fontWeight: 'bold',
        fontSize: 16,
        textDecorationLine: 'underline',
    }
});

export default LoginScreen;
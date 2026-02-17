import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import Button from "../Components/Button";
import { StorageService } from '../utils/storage';
import apiService from '../services/apiService';

const DomainSelectionScreen = ({ navigation }) => {
    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const token = await StorageService.loadAccessToken();
                if (!token) {
                    navigation.replace("Login");
                    return;
                }

                const domainsData = await apiService.getDomains(token);
                setDomains(domainsData);

                if (domainsData.length === 1) {
                    await selectDomain(domainsData[0].name);
                } else if (domainsData.length === 0) {
                    Alert.alert("Chyba", "Žádné domény k dispozici.");
                    navigation.replace("Login");
                } else {
                    setIsLoading(false);
                }

            } catch (error) {
                console.error("Error loading domains:", error);
                Alert.alert("Chyba", "Nepodařilo se načíst domény.");
                navigation.replace("Login");
            }
        };

        fetchDomains();
    }, []);

    const selectDomain = async (domainName) => {
        await StorageService.saveDomainSelection(domainName);
        navigation.replace("Home"); 
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{marginTop: 10}}>Načítání domén...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Vyberte doménu</Text>
            <View style={styles.listContainer}>
                {domains.map(domain => (
                    <View key={domain.key} style={styles.buttonWrapper}>
                        <Button 
                            title={domain.name} 
                            onPress={() => selectDomain(domain.name)} 
                        />
                    </View>
                ))}
            </View>
            <View style={styles.logoutWrapper}>
                <Button title="Odhlásit" onPress={() => navigation.replace("Login")} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    listContainer: {
        width: '100%',
        alignItems: 'center',
    },
    buttonWrapper: {
        width: '80%',
        marginBottom: 15,
    },
    logoutWrapper: {
        marginTop: 30,
        width: '60%',
    }
});

export default DomainSelectionScreen;
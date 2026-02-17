// Screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Button from '../Components/Button';
import { StorageService } from '../utils/storage';

const HomeScreen = ({ navigation, route }) => {
    // Získáme parametr z navigace, zda jsme offline
    // Pokud jdeme přes DomainSelection (online), parametr tam nebude, takže default false.
    // Ale pozor: musíme zjistit doménu nebo "Offline Mode" text.
    
    const [displayHeader, setDisplayHeader] = useState('Načítání...');
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const init = async () => {
            // Parametr předaný z LoginScreen
            const offlineParam = route.params?.isOffline || false;
            setIsOfflineMode(offlineParam);

            const storedUser = await StorageService.loadUserID();
            setUserId(storedUser || 'Neznámý');

            if (offlineParam) {
                setDisplayHeader("Režim: OFFLINE");
            } else {
                const domain = await StorageService.loadDomainSelection();
                setDisplayHeader(`Doména: ${domain}`);
            }
        };
        init();
    }, [route.params]);

    const handleLogout = async () => {
        await StorageService.clearAuth();
        navigation.replace("Login");
    };

    return (
        <View style={styles.container}>
            {/* Hlavička s informacemi */}
            <View style={styles.headerContainer}>
                <Text style={styles.userText}>Uživatel: {userId}</Text>
                <Text style={[styles.domainText, isOfflineMode && styles.offlineText]}>
                    {displayHeader}
                </Text>
            </View>

            <Text style={styles.menuTitle}>Hlavní Menu</Text>

            <View style={styles.menuContainer}>
                {/* 1. Import Dat - POUZE ONLINE */}
                {!isOfflineMode && (
                    <View style={styles.buttonWrapper}>
                        <Button 
                            title="Import Dat" 
                            onPress={() => navigation.navigate("ImportData")} 
                        />
                    </View>
                )}

                {/* 2. Čtečka - VŽDY */}
                <View style={styles.buttonWrapper}>
                    <Button 
                        title="Čtečka" 
                        onPress={() => navigation.navigate("Reader")} 
                    />
                </View>

                {/* 3. Nastavení - VŽDY (důležité pro Offline) */}
                <View style={styles.buttonWrapper}>
                    <Button 
                        title="Nastavení" 
                        onPress={() => navigation.navigate("Settings")} 
                        style={{backgroundColor: '#6c757d'}} // Šedá barva pro odlišení
                    />
                </View>
            </View>

            <View style={styles.logoutWrapper}>
                <Button 
                    title="Odhlásit" 
                    onPress={handleLogout} 
                    style={{backgroundColor: '#dc3545'}} 
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    headerContainer: {
        width: '100%',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    userText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    domainText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007bff',
    },
    offlineText: {
        color: '#dc3545', // Červená pro offline
    },
    menuTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    menuContainer: {
        width: '100%',
        alignItems: 'center',
    },
    buttonWrapper: {
        width: '80%',
        marginBottom: 15,
    },
    logoutWrapper: {
        marginTop: 'auto', // Tlačítko dolů
        width: '60%',
        marginBottom: 20,
    }
});

export default HomeScreen;
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from "react-native";
import { Picker } from '@react-native-picker/picker';
import Button from "../Components/Button";
import { StorageService } from '../utils/storage';
import apiService from '../services/apiService';

const HomeScreen = ({ navigation }) => {
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [domains, setDomains] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Loading user context...");
    const [currentAccessToken, setCurrentAccessToken] = useState('');

    // Load access token from storage
    useEffect(() => {
        const loadAccessToken = async () => {
            try {
                const savedToken = await StorageService.loadAccessToken();
                if (savedToken) {
                    setCurrentAccessToken(savedToken);
                } else {
                    console.log("No access token found, redirecting to login");
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                    return;
                }
            } catch (error) {
                console.error("Error loading access token:", error);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            }
        };
        
        loadAccessToken();
    }, []); 

    // FUNCTION FOR GETTING USER CONTEXT 
    useEffect(() => {
        const fetchUserContext = async () => {
            if (!currentAccessToken) return; 
            
            setIsLoading(true);
            setStatusMessage("Checking user permissions...");
            
            try {
                const domainsData = await apiService.getDomains(currentAccessToken);
                setDomains(domainsData);
                
                // Set default domain or first available
                const defaultDomain = domainsData.find(d => d.isDefault);
                if (defaultDomain) {
                    setSelectedDomain(defaultDomain.name);
                } else if (domainsData.length > 0) {
                    setSelectedDomain(domainsData[0].name);
                }

                // Try to load saved domain
                const savedDomain = await StorageService.loadDomainSelection();
                if (savedDomain && domainsData.some(d => d.name === savedDomain)) {
                    setSelectedDomain(savedDomain);
                }

                setStatusMessage("Select domain for import.");
            } catch (error) {
                console.error("Error fetching user context:", error);
                setStatusMessage("ERROR: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserContext();
    }, [currentAccessToken]);

    const handleSignOut = async () => {
        await StorageService.clearAllUserData();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }

    const handleDomainChange = async (itemValue) => {
        setSelectedDomain(itemValue);
    };

    const handleImportQADData = async () => {
        await StorageService.saveDomainSelection(selectedDomain);
        navigation.navigate("ImportData");
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Home Screen</Text>
            
            {statusMessage && (
                <Text style={{ marginBottom: 20, color: isLoading ? 'blue' : 'green' }}>
                    {statusMessage}
                </Text>
            )}

            {domains.length > 0 && (
                <>
                    <Text>Select Domain:</Text>
                    <Picker
                        marginBottom={10}
                        selectedValue={selectedDomain}
                        onValueChange={handleDomainChange}
                        style={{ width: 200, marginBottom: 10 }}
                    >
                        {domains.map(domain => (
                            <Picker.Item 
                                key={domain.key} 
                                label={`${domain.name}`} 
                                value={domain.name}
                            />
                        ))}
                    </Picker>
                </>
            )}

            <View style={styles.buttonContainer}>
                <Button 
                    title="Import QAD Data" 
                    onPress={handleImportQADData} 
                    disabled={!selectedDomain || !currentAccessToken}
                />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Go to Reader" onPress={() => navigation.navigate("Reader")} />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Sign out" onPress={handleSignOut} />
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
        marginBottom: 20,
    },
    buttonContainer: {
        marginTop: 10,
        width: '60%',
    },
});

export default HomeScreen;

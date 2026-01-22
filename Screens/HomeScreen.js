import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from "react-native";
import Button from "../Components/Button";
import { StorageService } from '../utils/storage';

const HomeScreen = ({ navigation }) => {
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [userID, setUserID] = useState('');

    useEffect(() => {
        const loadContext = async () => {
            const domain = await StorageService.loadDomainSelection();
            const user = await StorageService.loadUserID();
            
            if (!domain) {
                // Pokud není vybrána doména, vrať se na výběr
                navigation.replace("DomainSelection");
                return;
            }
            
            setSelectedDomain(domain);
            setUserID(user);
        };
        
        loadContext();
    }, []); 

    const handleSignOut = async () => {
        await StorageService.clearAllUserData();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }

    return (
        <View style={styles.container}>
            {/* ZÁHLAVÍ S KONTEXTEM */}
            <View style={styles.header}>
                <Text style={styles.headerText}>Uživatel: {userID}</Text>
                <Text style={styles.headerDomain}>Doména: {selectedDomain}</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Hlavní Menu</Text>
                
                <View style={styles.buttonContainer}>
                    <Button 
                        title="Import Dat" 
                        onPress={() => navigation.navigate("ImportData")} 
                    />
                </View>
                <View style={styles.buttonContainer}>
                    <Button title="Čtečka" onPress={() => navigation.navigate("Reader")} />
                </View>
                <View style={styles.buttonContainer}>
                    <Button title="Odhlásit" onPress={handleSignOut} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        width: '100%',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 14,
        color: '#666',
    },
    headerDomain: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 40,
    },
    buttonContainer: {
        marginTop: 15,
        width: '70%',
    },
});

export default HomeScreen;
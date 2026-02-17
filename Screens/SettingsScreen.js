// Screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, ScrollView, Alert } from 'react-native';
import Button from '../Components/Button';
import { StorageService } from '../utils/storage';

const SettingsScreen = ({ navigation }) => {
    const [smPrefix, setSmPrefix] = useState('');
    const [itemPrefix, setItemPrefix] = useState('R');
    const [resetSmAfterItem, setResetSmAfterItem] = useState(false);
    const [checkAgainstDb, setCheckAgainstDb] = useState(true);
    const [manualQty, setManualQty] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const settings = await StorageService.loadSettings();
        setSmPrefix(settings.smPrefix);
        setItemPrefix(settings.itemPrefix);
        setResetSmAfterItem(settings.resetSmAfterItem);
        setCheckAgainstDb(settings.checkAgainstDb);
        setManualQty(settings.manualQty);
    };

    const handleSave = async () => {
        const settings = {
            smPrefix,
            itemPrefix,
            resetSmAfterItem,
            checkAgainstDb,
            manualQty
        };
        await StorageService.saveSettings(settings);
        Alert.alert("Uloženo", "Nastavení bylo úspěšně uloženo.");
        navigation.goBack();
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Nastavení aplikace</Text>

            {/* Sekce Prefixy */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prefixy čárových kódů</Text>
                
                <Text style={styles.label}>Prefix Skladového Místa (SM):</Text>
                <TextInput
                    style={styles.input}
                    value={smPrefix}
                    onChangeText={setSmPrefix}
                    placeholder="Např. L (nechte prázdné pro žádný)"
                    autoCapitalize="characters"
                />

                <Text style={styles.label}>Prefix Reference / Položky:</Text>
                <TextInput
                    style={styles.input}
                    value={itemPrefix}
                    onChangeText={setItemPrefix}
                    placeholder="Např. R"
                    autoCapitalize="characters"
                />
            </View>

            {/* Sekce Chování */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chování skeneru</Text>

                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Skenovat SM po každé položce?</Text>
                    <Switch
                        value={resetSmAfterItem}
                        onValueChange={setResetSmAfterItem}
                    />
                </View>
                <Text style={styles.hint}>
                    ZAP: Po uložení položky se vrátí na skenování SM.{'\n'}
                    VYP: Zůstane na aktuálním SM a čeká na další položku.
                </Text>

                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Dohledávat v databázi (Import)?</Text>
                    <Switch
                        value={checkAgainstDb}
                        onValueChange={setCheckAgainstDb}
                    />
                </View>

                 <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Zadávat množství ručně?</Text>
                    <Switch
                        value={manualQty}
                        onValueChange={setManualQty}
                    />
                </View>
            </View>

            <Button title="Uložit nastavení" onPress={handleSave} />
            <View style={{height: 10}} />
            <Button title="Zpět" onPress={() => navigation.goBack()} style={{backgroundColor: '#666'}} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fafafa',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 5,
    },
    switchLabel: {
        fontSize: 16,
        flex: 1,
    },
    hint: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
        fontStyle: 'italic',
    }
});

export default SettingsScreen;
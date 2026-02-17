// Screens/ReaderScreen.js
import React, { useState, useRef, useCallback } from 'react'; // Přidán useCallback
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; // Důležité pro načítání při návratu
import Button from '../Components/Button';
import { parseBarcode } from '../utils/barcodeParser'; // Ujisti se, že tento soubor existuje z předchozího kroku
import db, { addScan } from '../Database/Database';
import { StorageService } from '../utils/storage';

const ReaderScreen = ({ navigation }) => {
    const [step, setStep] = useState('SCAN_SM'); 
    
    // Data
    const [currentSM, setCurrentSM] = useState('');
    const [scannedItem, setScannedItem] = useState(null);
    const [scannedCode, setScannedCode] = useState(''); 
    const [quantity, setQuantity] = useState('');
    const [statusMessage, setStatusMessage] = useState('Inicializace...');
    const [matchStatus, setMatchStatus] = useState(null);
    
    // Nastavení (Defaultní hodnoty, přepíší se z DB)
    const [settings, setSettings] = useState({
        smPrefix: '', 
        itemPrefix: 'R', 
        checkAgainstDb: true,
        resetSmAfterItem: false,
        manualQty: true
    });

    const inputRef = useRef(null);
    const qtyInputRef = useRef(null);

    // Načtení nastavení při každém vstupu na obrazovku
    useFocusEffect(
        useCallback(() => {
            const loadConfig = async () => {
                const loadedSettings = await StorageService.loadSettings();
                setSettings(loadedSettings);
                
                // Pokud ještě nemáme nastavenou zprávu (první load)
                if (step === 'SCAN_SM') {
                    const prefixText = loadedSettings.smPrefix ? `(Prefix: ${loadedSettings.smPrefix})` : '';
                    setStatusMessage(`Naskenujte Skladové místo ${prefixText}`);
                }
            };
            loadConfig();
            
            // Focus na input
            setTimeout(() => inputRef.current?.focus(), 200);
        }, [step])
    );

    const handleScan = async (text) => {
        if (!text) return;

        if (step === 'SCAN_SM') {
            const result = parseBarcode(text, 'LOCATION', settings);
            
            if (!result.isValid) {
                setStatusMessage(`Chyba: ${result.error}`);
                setScannedCode(''); 
                return;
            }

            setCurrentSM(result.parsed);
            setStep('SCAN_ITEM');
            setStatusMessage(`SM: ${result.parsed}. Skenujte položku.`);
            setScannedCode(''); 
        } 
        else if (step === 'SCAN_ITEM') {
            const result = parseBarcode(text, 'ITEM', settings);
            
            if (!result.isValid) {
                setStatusMessage(`Chyba: ${result.error}`);
                setScannedCode('');
                return;
            }

            const itemData = {
                raw: result.original,
                parsedRef: result.parsed
            };

            // Podmínka dle nastavení: Dohledávat v DB?
            if (settings.checkAgainstDb) {
                checkDatabase(itemData.parsedRef);
            } else {
                setMatchStatus('UNKNOWN'); // "Nenalezeno vůbec" v kontextu PDF bez DB
                proceedToQty(itemData, null);
            }
        }
    };

    const checkDatabase = async (ref) => {
        try {
            const database = await db;
            // Hledáme v importovaných datech
            const result = await database.getAllAsync(
                `SELECT * FROM resources WHERE reference = ? OR part_number = ? LIMIT 1`,
                [ref, ref]
            );

            if (result.length > 0) {
                const item = result[0];
                if (item.storage_location === currentSM) {
                    setMatchStatus('FOUND_OK');
                    setStatusMessage(`Nalezeno: ${item.part_number} (${item.quantity} ${item.unit || 'ks'})`);
                } else {
                    setMatchStatus('FOUND_WRONG_SM');
                    setStatusMessage(`POZOR: Nalezeno na jiném SM: ${item.storage_location}!`);
                }
                proceedToQty({ parsedRef: ref }, item);
            } else {
                setMatchStatus('NOT_FOUND');
                setStatusMessage(`Nenalezeno v datech.`);
                proceedToQty({ parsedRef: ref }, null);
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Chyba DB", err.message);
        }
    };

    const proceedToQty = (scanData, dbItem) => {
        setScannedItem({ ...scanData, dbData: dbItem });
        
        // Pokud je v nastavení vypnuté ruční zadávání množství a máme 1ks (default),
        // můžeme rovnou uložit (volitelné rozšíření), ale PDF říká "Zadání Množství".
        if (settings.manualQty) {
            setStep('CONFIRM_QTY');
            setTimeout(() => qtyInputRef.current?.focus(), 100);
        } else {
            // Pokud by bylo zadání množství vypnuto, uložíme defaultně 1 nebo 0?
            // Pro teď implementujeme jen manuální
            setStep('CONFIRM_QTY'); 
        }
    };

    const handleSave = async () => {
        if (!quantity || isNaN(quantity)) {
            Alert.alert("Chyba", "Zadejte platné množství.");
            return;
        }

        try {
            const userId = await StorageService.loadUserID();
            const domain = await StorageService.loadDomainSelection(); // V offline bude null nebo stará hodnota

            const database = await db;
            await database.runAsync(
                `INSERT INTO inventory_scans 
                (domain, site, location, original_location_scan, part_number, reference, original_reference_scan, quantity, scanned_by, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    domain || 'OFFLINE', 
                    '1', 
                    currentSM, 
                    currentSM, // Zde by měl být raw scan SM (uložit si ho bokem v statech)
                    scannedItem.dbData?.part_number || scannedItem.parsedRef,
                    scannedItem.parsedRef,
                    scannedItem.raw || '',
                    parseFloat(quantity),
                    userId || 'Unknown',
                    matchStatus
                ]
            );

            Alert.alert("Info", "Záznam uložen."); // Krátké info
            
            // Reset
            setQuantity('');
            setScannedItem(null);
            
            // Logika návratu dle nastavení "Sken SM po každé zásobě"
            if (settings.resetSmAfterItem) {
                setStep('SCAN_SM');
                setCurrentSM('');
                setStatusMessage("Naskenujte Skladové místo");
                setTimeout(() => inputRef.current?.focus(), 100);
            } else {
                setStep('SCAN_ITEM');
                setStatusMessage(`SM: ${currentSM}. Skenujte další položku.`);
                setTimeout(() => inputRef.current?.focus(), 100);
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Chyba ukládání", error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.headerText}>Čtečka ({step === 'SCAN_SM' ? 'Místo' : 'Zboží'})</Text>
                <Text style={styles.subHeader}>{statusMessage}</Text>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.label}>SM: {currentSM || '---'}</Text>
                {scannedItem && (
                    <Text style={styles.label}>Ref: {scannedItem.parsedRef}</Text>
                )}
            </View>

            {step !== 'CONFIRM_QTY' && (
                <TextInput
                    ref={inputRef}
                    style={styles.scanInput}
                    placeholder="Skenujte zde..."
                    value={scannedCode}
                    onChangeText={setScannedCode}
                    onSubmitEditing={(e) => handleScan(e.nativeEvent.text)}
                    autoCapitalize="characters"
                    blurOnSubmit={false}
                    showSoftInputOnFocus={false} 
                />
            )}

            {step === 'CONFIRM_QTY' && (
                <View style={styles.qtyContainer}>
                    <Text style={styles.label}>Množství:</Text>
                    <TextInput
                        ref={qtyInputRef}
                        style={styles.qtyInput}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="0"
                    />
                    <Button title="Uložit" onPress={handleSave} />
                    <View style={{marginTop: 10}}>
                        <Button title="Zrušit" onPress={() => {
                             setStep('SCAN_ITEM');
                             setQuantity('');
                             setScannedItem(null);
                        }} style={{backgroundColor: '#666'}} />
                    </View>
                </View>
            )}

            {step !== 'CONFIRM_QTY' && (
                 <View style={{marginTop: 20}}>
                     <Button title="Enter (Simulace)" onPress={() => handleScan(scannedCode)} />
                 </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: { marginBottom: 20, alignItems: 'center' },
    headerText: { fontSize: 22, fontWeight: 'bold' },
    subHeader: { fontSize: 16, color: '#007bff', marginTop: 5, textAlign: 'center' },
    infoBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    scanInput: { height: 50, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007bff', borderRadius: 8, paddingHorizontal: 15, fontSize: 18, marginBottom: 10 },
    qtyContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 8 },
    qtyInput: { height: 60, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, fontSize: 24, textAlign: 'center', marginBottom: 20, backgroundColor: '#fff' }
});

export default ReaderScreen;
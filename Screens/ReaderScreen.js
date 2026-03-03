// Screens/ReaderScreen.js
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../Components/Button';
import { parseBarcode } from '../utils/barcodeParser';
import db from '../Database/Database';
import { StorageService } from '../utils/storage';

const ReaderScreen = ({ navigation }) => {
    const [step, setStep] = useState('SCAN_SM'); 
    
    const [currentSM, setCurrentSM] = useState('');
    const [rawSM, setRawSM] = useState('');
    const [scannedItem, setScannedItem] = useState(null);
    const [scannedCode, setScannedCode] = useState(''); 
    const [quantity, setQuantity] = useState('');
    const [statusMessage, setStatusMessage] = useState('Inicializace...');
    const [matchStatus, setMatchStatus] = useState(null);
    const [statusColor, setStatusColor] = useState('#007bff');
    const [isOnlineMode, setIsOnlineMode] = useState(false);
    
    const [settings, setSettings] = useState({
        smPrefix: '', 
        itemPrefix: 'R', 
        checkAgainstDb: true,
        resetSmAfterItem: false,
        manualQty: true
    });

    const inputRef = useRef(null);
    const qtyInputRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            const loadConfig = async () => {
                const loadedSettings = await StorageService.loadSettings();
                setSettings(loadedSettings);

                // Zjistíme online/offline režim - prázdný string = offline
                const domain = await StorageService.loadDomainSelection();
                const token = await StorageService.loadAccessToken();
                const online = !!(domain && domain.length > 0 && token && token.length > 0);
                setIsOnlineMode(online);
                
                if (step === 'SCAN_SM') {
                    const prefixInfo = buildPrefixInfo(loadedSettings);
                    setStatusMessage(`Naskenujte Skladové místo ${prefixInfo}`);
                    setStatusColor('#007bff');
                }
            };
            loadConfig();
            
            setTimeout(() => inputRef.current?.focus(), 200);
        }, [step])
    );

    const buildPrefixInfo = (s) => {
        const parts = [];
        if (s.smPrefix) parts.push(`SM prefix: "${s.smPrefix}"`);
        if (s.itemPrefix) parts.push(`Ref prefix: "${s.itemPrefix}"`);
        return parts.length > 0 ? `(${parts.join(', ')})` : '';
    };

    const handleScan = async (text) => {
        const trimmed = (text || '').trim();
        if (!trimmed) return;

        if (step === 'SCAN_SM') {
            const result = parseBarcode(trimmed, 'LOCATION', settings);
            
            if (!result.isValid) {
                setStatusMessage(result.error);
                setStatusColor('#dc3545');
                setScannedCode(''); 
                return;
            }

            setCurrentSM(result.parsed);
            setRawSM(result.original);
            setStep('SCAN_ITEM');
            const itemPrefixInfo = settings.itemPrefix ? ` (prefix: "${settings.itemPrefix}")` : '';
            setStatusMessage(`SM: ${result.parsed} - Skenujte položku${itemPrefixInfo}`);
            setStatusColor('#007bff');
            setScannedCode(''); 
        } 
        else if (step === 'SCAN_ITEM') {
            const result = parseBarcode(trimmed, 'ITEM', settings);
            
            if (!result.isValid) {
                setStatusMessage(result.error);
                setStatusColor('#dc3545');
                setScannedCode('');
                return;
            }

            const itemData = {
                raw: result.original,
                parsedRef: result.parsed
            };

            setScannedCode('');

            if (isOnlineMode && settings.checkAgainstDb) {
                // ONLINE: porovnávání s importem
                await checkDatabase(itemData);
            } else {
                // OFFLINE: hloupé ukládání, jen kontrola duplicity
                await checkDuplicateOnly(itemData);
            }
        }
    };

    // OFFLINE: pouze kontrola duplicity, žádné porovnávání s importem
    const checkDuplicateOnly = async (itemData) => {
        const ref = itemData.parsedRef;
        try {
            const database = await db;
            const previousScans = await database.getAllAsync(
                `SELECT * FROM inventory_scans WHERE reference = ? ORDER BY scan_date DESC LIMIT 1`,
                [ref]
            );

            if (previousScans.length > 0) {
                const prev = previousScans[0];
                setMatchStatus('FOUND_AGAIN');
                setStatusColor('#fd7e14');
                setStatusMessage(
                    `Ref "${ref}" již skenována (SM: ${prev.location}, Qty: ${prev.quantity}). Bude přepsáno.`
                );
                proceedToQty(itemData, null, prev.id);
                return;
            }

            setMatchStatus('NEW');
            setStatusColor('#007bff');
            setStatusMessage(`SM: ${currentSM} | Ref: ${itemData.parsedRef}`);
            proceedToQty(itemData, null, null);
        } catch (err) {
            console.error(err);
            setMatchStatus('NEW');
            setStatusColor('#007bff');
            setStatusMessage(`SM: ${currentSM} | Ref: ${itemData.parsedRef}`);
            proceedToQty(itemData, null, null);
        }
    };

    // ONLINE: porovnávání s importovanými daty
    const checkDatabase = async (itemData) => {
        const ref = itemData.parsedRef;
        try {
            const database = await db;

            let dbItem = null;
            const resourceResults = await database.getAllAsync(
                `SELECT * FROM resources WHERE reference = ? LIMIT 1`,
                [ref]
            );

            if (resourceResults.length > 0) {
                dbItem = resourceResults[0];
            } else {
                const partResults = await database.getAllAsync(
                    `SELECT * FROM resources WHERE part_number = ? LIMIT 1`,
                    [ref]
                );
                if (partResults.length > 0) {
                    dbItem = partResults[0];
                }
            }

            // Kontrola duplicity ve skenech
            const previousScans = await database.getAllAsync(
                `SELECT * FROM inventory_scans WHERE reference = ? ORDER BY scan_date DESC LIMIT 1`,
                [ref]
            );

            const prevScanId = previousScans.length > 0 ? previousScans[0].id : null;

            if (previousScans.length > 0) {
                const prev = previousScans[0];
                setMatchStatus('FOUND_AGAIN');
                setStatusColor('#fd7e14');
                setStatusMessage(
                    `Ref "${ref}" již skenována (SM: ${prev.location}, Qty: ${prev.quantity}). Přepsat na SM: ${currentSM}?`
                );
                proceedToQty(itemData, dbItem, prevScanId);
                return;
            }

            if (!dbItem) {
                setMatchStatus('NOT_FOUND');
                setStatusColor('#dc3545');
                setStatusMessage(`Zásoba "${ref}" nenalezena v importovaných datech. Bude zapsána.`);
                proceedToQty(itemData, null, null);
                return;
            }

            const dbLocation = dbItem.storage_location || '';

            if (dbLocation === currentSM) {
                setMatchStatus('FOUND_OK');
                setStatusColor('#28a745');
                setStatusMessage(
                    `Nalezeno na SM ${currentSM} (${dbItem.part_number || ref}, QAD qty: ${dbItem.quantity})`
                );
            } else {
                setMatchStatus('FOUND_WRONG_SM');
                setStatusColor('#fd7e14');
                setStatusMessage(
                    `V QAD na SM "${dbLocation}", skenujete na SM "${currentSM}".`
                );
            }

            proceedToQty(itemData, dbItem, null);

        } catch (err) {
            console.error(err);
            Alert.alert("Chyba DB", err.message);
        }
    };

    const proceedToQty = (scanData, dbItem, existingScanId) => {
        setScannedItem({ ...scanData, dbData: dbItem, existingScanId });
        
        if (settings.manualQty) {
            setStep('CONFIRM_QTY');
            setQuantity('');
            setTimeout(() => qtyInputRef.current?.focus(), 100);
        } else {
            setQuantity('1');
            setStep('CONFIRM_QTY');
            setTimeout(() => qtyInputRef.current?.focus(), 100);
        }
    };

    const handleSave = async () => {
        if (!quantity || isNaN(quantity) || parseFloat(quantity) < 0) {
            Alert.alert("Chyba", "Zadejte platné množství (číslo >= 0).");
            return;
        }

        try {
            const userId = await StorageService.loadUserID();
            const domain = await StorageService.loadDomainSelection();
            const database = await db;

            if (matchStatus === 'FOUND_AGAIN' && scannedItem.existingScanId) {
                await database.runAsync(
                    `UPDATE inventory_scans 
                     SET location = ?, original_location_scan = ?, quantity = ?, scanned_by = ?, 
                         scan_date = CURRENT_TIMESTAMP, status = ?, part_number = ?
                     WHERE id = ?`,
                    [
                        currentSM,
                        rawSM,
                        parseFloat(quantity),
                        userId || 'Unknown',
                        'FOUND_AGAIN',
                        scannedItem.dbData?.part_number || scannedItem.parsedRef,
                        scannedItem.existingScanId
                    ]
                );
            } else {
                await database.runAsync(
                    `INSERT INTO inventory_scans 
                    (domain, site, location, original_location_scan, part_number, reference, original_reference_scan, quantity, scanned_by, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        domain || 'OFFLINE', 
                        '1', 
                        currentSM, 
                        rawSM,
                        scannedItem.dbData?.part_number || scannedItem.parsedRef,
                        scannedItem.parsedRef,
                        scannedItem.raw || '',
                        parseFloat(quantity),
                        userId || 'Unknown',
                        matchStatus || 'NEW'
                    ]
                );
            }

            // Reset
            setQuantity('');
            setScannedItem(null);
            setMatchStatus(null);
            
            if (settings.resetSmAfterItem) {
                setStep('SCAN_SM');
                setCurrentSM('');
                setRawSM('');
                const prefixInfo = buildPrefixInfo(settings);
                setStatusMessage(`Uloženo. Naskenujte Skladové místo ${prefixInfo}`);
                setStatusColor('#28a745');
                setTimeout(() => inputRef.current?.focus(), 100);
            } else {
                setStep('SCAN_ITEM');
                const itemPrefixInfo = settings.itemPrefix ? ` (prefix: "${settings.itemPrefix}")` : '';
                setStatusMessage(`Uloženo. SM: ${currentSM} - Skenujte další položku${itemPrefixInfo}`);
                setStatusColor('#28a745');
                setTimeout(() => inputRef.current?.focus(), 100);
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Chyba ukládání", error.message);
        }
    };

    const handleCancel = () => {
        setStep('SCAN_ITEM');
        setQuantity('');
        setScannedItem(null);
        setMatchStatus(null);
        const itemPrefixInfo = settings.itemPrefix ? ` (prefix: "${settings.itemPrefix}")` : '';
        setStatusMessage(`SM: ${currentSM}. Skenujte položku${itemPrefixInfo}`);
        setStatusColor('#007bff');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleResetSM = () => {
        setStep('SCAN_SM');
        setCurrentSM('');
        setRawSM('');
        setScannedItem(null);
        setQuantity('');
        setMatchStatus(null);
        const prefixInfo = buildPrefixInfo(settings);
        setStatusMessage(`Naskenujte Skladové místo ${prefixInfo}`);
        setStatusColor('#007bff');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const getStepLabel = () => {
        if (step === 'SCAN_SM') return 'Skladové místo';
        if (step === 'SCAN_ITEM') return 'Reference';
        return 'Množství';
    };

    const getMatchLabel = () => {
        switch (matchStatus) {
            case 'FOUND_OK': return '✓ Nalezeno OK';
            case 'NOT_FOUND': return '✗ Nenalezeno v importu';
            case 'FOUND_AGAIN': return 'Znovu skenováno - bude přepsáno';
            case 'FOUND_WRONG_SM': return 'Jiné SM než v QAD';
            case 'NEW': return 'Nový záznam';
            default: return matchStatus || '';
        }
    };

    const getMatchColor = () => {
        switch (matchStatus) {
            case 'FOUND_OK': return '#28a745';
            case 'NOT_FOUND': return '#dc3545';
            case 'FOUND_AGAIN': return '#fd7e14';
            case 'FOUND_WRONG_SM': return '#fd7e14';
            default: return '#007bff';
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    Skenování - {getStepLabel()}
                </Text>
                <Text style={styles.modeLabel}>
                    {isOnlineMode ? 'Online' : 'Offline'}
                </Text>
                <Text style={[styles.subHeader, { color: statusColor }]}>{statusMessage}</Text>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.label}>SM: {currentSM || '---'}</Text>
                {scannedItem && (
                    <>
                        <Text style={styles.label}>Ref: {scannedItem.parsedRef}</Text>
                        {scannedItem.dbData && (
                            <Text style={styles.labelSmall}>
                                Artikl: {scannedItem.dbData.part_number} | QAD SM: {scannedItem.dbData.storage_location} | QAD Qty: {scannedItem.dbData.quantity}
                            </Text>
                        )}
                        {matchStatus && (
                            <Text style={[styles.matchBadge, { backgroundColor: getMatchColor() }]}>
                                {getMatchLabel()}
                            </Text>
                        )}
                    </>
                )}
            </View>

            {step !== 'CONFIRM_QTY' && (
                <TextInput
                    ref={inputRef}
                    style={styles.scanInput}
                    placeholder={step === 'SCAN_SM' ? 'Skenujte SM...' : 'Skenujte Referenci...'}
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
                        onSubmitEditing={handleSave}
                    />
                    <View style={styles.actionRow}>
                        <Button title="✓ Uložit" onPress={handleSave} />
                    </View>
                    <View style={styles.actionRow}>
                        <Button title="✗ Zrušit" onPress={handleCancel} style={{backgroundColor: '#dc3545'}} />
                    </View>
                </View>
            )}

            {step !== 'CONFIRM_QTY' && (
                <View style={styles.actionRow}>
                    <Button title="Potvrdit" onPress={() => handleScan(scannedCode)} />
                </View>
            )}

            {step === 'SCAN_ITEM' && (
                <View style={styles.actionRow}>
                    <Button title="Změnit SM" onPress={handleResetSM} style={{backgroundColor: '#17a2b8'}} />
                </View>
            )}

            <View style={styles.bottomBar}>
                <Button title="Zpět do Menu" onPress={() => navigation.goBack()} style={styles.backButton} />
            </View>
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
    modeLabel: { fontSize: 13, color: '#888', marginTop: 2 },
    subHeader: { fontSize: 15, marginTop: 8, textAlign: 'center' },
    infoBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    labelSmall: { fontSize: 13, color: '#555', marginBottom: 5 },
    matchBadge: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        textAlign: 'center',
        overflow: 'hidden',
        marginTop: 5,
    },
    scanInput: { height: 50, backgroundColor: '#fff', borderWidth: 2, borderColor: '#007bff', borderRadius: 8, paddingHorizontal: 15, fontSize: 18, marginBottom: 10 },
    qtyContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 8 },
    qtyInput: { height: 60, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, fontSize: 24, textAlign: 'center', marginBottom: 20, backgroundColor: '#fff' },
    actionRow: {
        marginTop: 10,
    },
    bottomBar: {
        marginTop: 'auto',
        paddingTop: 30,
        paddingBottom: 10,
    },
    backButton: {
        backgroundColor: '#007bff',
    },
});

export default ReaderScreen;
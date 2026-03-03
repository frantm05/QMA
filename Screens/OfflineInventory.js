import React, { useState, useCallback } from "react"; 
import { View, Text, StyleSheet, Alert, FlatList } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import Button from "../Components/Button";
import LoadingButton from "../Components/LoadingButton";
import db from "../Database/Database";
import { exportScansToCSV } from "../utils/exportCSV";
import { StorageService } from "../utils/storage";

const OfflineInventory = ({ navigation }) => {
    const [scans, setScans] = useState([]);
    const [resourceCount, setResourceCount] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isOnline, setIsOnline] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const database = await db;
            const scanResults = await database.getAllAsync('SELECT * FROM inventory_scans ORDER BY scan_date DESC');
            setScans(scanResults);

            const resourceResults = await database.getAllAsync('SELECT COUNT(*) as count FROM resources');
            setResourceCount(resourceResults[0]?.count || 0);

            // Zjistit režim
            const token = await StorageService.loadAccessToken();
            const domain = await StorageService.loadDomainSelection();
            setIsOnline(!!(token && token.length > 0 && domain && domain.length > 0));
        } catch (error) {
            console.error("Error loading data:", error);
            Alert.alert("Chyba", "Nepodařilo se načíst data.");
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const result = await exportScansToCSV();
            Alert.alert("Export dokončen", `Exportováno ${result.rowCount} záznamů do CSV.`);
        } catch (error) {
            Alert.alert("Chyba exportu", error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearScans = () => {
        Alert.alert(
            "Potvrzení",
            "Opravdu chcete smazat všechna naskenovaná data?\n\nTato akce je nevratná.",
            [
                { text: "Zrušit", style: "cancel" },
                { 
                    text: "Smazat", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const database = await db;
                            await database.execAsync('DELETE FROM inventory_scans');
                            setScans([]);
                            Alert.alert("Info", "Skenovaná data byla smazána.");
                        } catch (error) {
                            Alert.alert("Chyba", error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleClearAll = () => {
        Alert.alert(
            "Potvrzení",
            "Opravdu chcete smazat VŠECHNA data (importovaná i naskenovaná)?\n\nTato akce je nevratná.",
            [
                { text: "Zrušit", style: "cancel" },
                { 
                    text: "Smazat vše", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const database = await db;
                            await database.execAsync('DELETE FROM resources');
                            await database.execAsync('DELETE FROM inventory_scans');
                            setScans([]);
                            setResourceCount(0);
                            Alert.alert("Info", "Všechna data smazána.");
                        } catch (error) {
                            Alert.alert("Chyba", error.message);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}.${mm}. ${hh}:${mi}`;
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'FOUND_OK': return '✓ OK';
            case 'NOT_FOUND': return '✗ Nenalezeno';
            case 'FOUND_WRONG_SM': return 'Jiné SM';
            case 'FOUND_AGAIN': return 'Přepsáno';
            case 'NO_CHECK': return 'Neověřeno';
            case 'NEW': return 'Nový';
            default: return status || 'Nový';
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'FOUND_OK': return '#28a745';
            case 'NOT_FOUND': return '#dc3545';
            case 'FOUND_WRONG_SM': return '#fd7e14';
            case 'FOUND_AGAIN': return '#fd7e14';
            default: return '#007bff';
        }
    };

    const getDomainLabel = (domain) => {
        if (!domain || domain === 'OFFLINE') return 'Offline';
        return domain;
    };

    const renderScanItem = ({ item }) => (
        <View style={styles.scanItem}>
            <View style={styles.scanRow}>
                <Text style={styles.scanLabel}>SM:</Text>
                <Text style={styles.scanValue}>{item.location}</Text>
                <Text style={styles.scanLabel}>Ref:</Text>
                <Text style={styles.scanValue}>{item.reference}</Text>
                <Text style={styles.scanLabel}>Qty:</Text>
                <Text style={styles.scanValue}>{item.quantity}</Text>
            </View>
            <View style={styles.scanRow}>
                <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                </Text>
                <Text style={[styles.domainBadge, { 
                    backgroundColor: item.domain === 'OFFLINE' ? '#6c757d' : '#17a2b8' 
                }]}>
                    {getDomainLabel(item.domain)}
                </Text>
                <Text style={styles.scanDate}>{formatDate(item.scan_date)}</Text>
                <Text style={styles.scanUser}>{item.scanned_by}</Text>
            </View>
        </View>
    );

    // Spočítáme offline vs online skeny
    const offlineScans = scans.filter(s => !s.domain || s.domain === 'OFFLINE').length;
    const onlineScans = scans.filter(s => s.domain && s.domain !== 'OFFLINE').length;

    return (
        <View style={styles.container}> 
            <Text style={styles.title}>Offline Data / Export</Text>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                    Data jsou trvale uložena v zařízení. {isOnline 
                        ? 'Můžete exportovat do CSV pro nahrání do QAD.' 
                        : 'Po přihlášení online budou dostupná pro export.'}
                </Text>
            </View>
            
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{resourceCount}</Text>
                    <Text style={styles.statLabel}>Importováno</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{scans.length}</Text>
                    <Text style={styles.statLabel}>Naskenováno</Text>
                </View>
            </View>

            {scans.length > 0 && (offlineScans > 0 || onlineScans > 0) && (
                <View style={styles.originRow}>
                    {offlineScans > 0 && (
                        <Text style={styles.originText}>Offline: {offlineScans}</Text>
                    )}
                    {onlineScans > 0 && (
                        <Text style={styles.originText}>Online: {onlineScans}</Text>
                    )}
                </View>
            )}

            {/* Export CSV */}
            <View style={styles.actionRow}>
                <LoadingButton 
                    title="Exportovat CSV" 
                    onPress={handleExportCSV} 
                    isLoading={isExporting}
                    disabled={scans.length === 0}
                    style={scans.length > 0 ? {backgroundColor: '#17a2b8'} : undefined}
                />
            </View>

            {/* Seznam skenů */}
            {scans.length > 0 && (
                <View style={styles.listContainer}>
                    <Text style={styles.sectionTitle}>Poslední skeny ({scans.length}):</Text>
                    <FlatList
                        data={scans.slice(0, 50)}
                        renderItem={renderScanItem}
                        keyExtractor={(item) => String(item.id)}
                        style={styles.flatList}
                    />
                </View>
            )}

            {scans.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Žádná naskenovaná data.</Text>
                    <Text style={styles.emptyHint}>Použijte Skenování pro zápis zásob.</Text>
                </View>
            )}

            {/* Smazat */}
            <View style={styles.deleteSection}>
                <View style={styles.actionRow}>
                    <Button 
                        title="Smazat skeny" 
                        onPress={handleClearScans} 
                        style={scans.length > 0 ? {backgroundColor: '#dc3545'} : undefined}
                        disabled={scans.length === 0}
                    />
                </View>
                <View style={styles.actionRow}>
                    <Button 
                        title="Smazat vše (i import)" 
                        onPress={handleClearAll} 
                        style={(scans.length > 0 || resourceCount > 0) ? {backgroundColor: '#dc3545'} : undefined}
                        disabled={scans.length === 0 && resourceCount === 0}
                    />
                </View>
            </View>

            {/* Zpět */}
            <View style={styles.bottomBar}>
                <Button title="Zpět do Menu" onPress={() => navigation.goBack()} style={styles.backButton} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: 'center',
    },
    infoBanner: {
        backgroundColor: '#e8f4fd',
        borderWidth: 1,
        borderColor: '#b8daff',
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
    },
    infoBannerText: {
        fontSize: 13,
        color: '#004085',
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    statBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#007bff',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
    },
    originRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 15,
    },
    originText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    actionRow: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    listContainer: {
        flex: 1,
        marginTop: 10,
    },
    flatList: {
        maxHeight: 300,
    },
    scanItem: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
        borderWidth: 1,
        borderColor: '#eee',
    },
    scanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 3,
    },
    scanLabel: {
        fontWeight: 'bold',
        fontSize: 12,
        marginRight: 3,
        color: '#555',
    },
    scanValue: {
        fontSize: 13,
        marginRight: 10,
    },
    statusBadge: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 5,
    },
    domainBadge: {
        color: '#fff',
        fontSize: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 5,
    },
    scanDate: {
        fontSize: 11,
        color: '#888',
        marginRight: 8,
    },
    scanUser: {
        fontSize: 11,
        color: '#888',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 30,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    emptyHint: {
        color: '#bbb',
        fontSize: 13,
        marginTop: 5,
    },
    deleteSection: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 10,
    },
    bottomBar: {
        marginTop: 'auto',
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        backgroundColor: '#007bff',
    },
});

export default OfflineInventory;
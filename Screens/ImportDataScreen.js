import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native';
import Button from '../Components/Button';
import LoadingButton from "../Components/LoadingButton";
import { clearScans, bulkAddScans } from "../Database/Database";
import apiService from '../services/apiService';
import { StorageService } from '../utils/storage';

const ImportDataScreen = ({ navigation }) => {
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [currentAccessToken, setCurrentAccessToken] = useState('');
    
    const [allInventoryData, setAllInventoryData] = useState([]);
    const [sites, setSites] = useState([]);
    
    const [selectedSite, setSelectedSite] = useState(null);
    const [storageLocation, setStorageLocation] = useState('*');
    const [partFilter, setPartFilter] = useState('*');

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [statusMessage, setStatusMessage] = useState("Inicializace...");

    useEffect(() => {
        const init = async () => {
            try {
                const token = await StorageService.loadAccessToken();
                const domain = await StorageService.loadDomainSelection();

                if (!token || !domain) {
                    navigation.goBack();
                    return;
                }

                setCurrentAccessToken(token);
                setSelectedDomain(domain);
                
                loadDomainData(token, domain);

            } catch (error) {
                console.error("Init error:", error);
                navigation.goBack();
            }
        };

        init();
    }, []);

    const loadDomainData = async (token, domain) => {
        setIsLoadingData(true);
        setStatusMessage(`Načítám data pro doménu ${domain}...`);

        try {
            const inventoryData = await apiService.getInventoryDataForDomain(token, domain);

            if (Array.isArray(inventoryData)) {
                const filteredByDomain = inventoryData.filter(item => 
                    item["ld_det.ld_domain"] === domain
                );

                setAllInventoryData(filteredByDomain);
                
                const uniqueSites = apiService.getUniqueSitesFromData(filteredByDomain);
                setSites(uniqueSites);

                if (filteredByDomain.length === 0) {
                    setStatusMessage(`Doména '${domain}' neobsahuje žádná data.`);
                } else {
                    setStatusMessage(`Vyberte Místo (Site)`);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
            setStatusMessage("Chyba při načítání dat: " + error.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSiteSelect = (siteCode) => {
        setSelectedSite(siteCode);
        setStatusMessage(`Vybráno místo: ${siteCode}. Upřesněte filtry.`);
    };

    const handleResetSite = () => {
        setSelectedSite(null);
        setStatusMessage(`Vyberte Místo (Site)`);
    };

    const getFilteredData = () => {
        return allInventoryData.filter(item => {
            const site = item["ld_det.ld_site"] || "";
            const location = item["ld_det.ld_loc"] || "";
            const part = item["ld_det.ld_part"] || "";

            if (selectedSite !== '*' && site !== selectedSite) return false;

            const locationMatch = storageLocation === '*' ||
                (storageLocation.endsWith('*') ?
                    location.startsWith(storageLocation.slice(0, -1)) :
                    location === storageLocation);

            const partMatch = partFilter === '*' ||
                (partFilter.endsWith('*') ?
                    part.startsWith(partFilter.slice(0, -1)) :
                    part === partFilter);

            return locationMatch && partMatch;
        });
    };

    const handleImport = async () => {
        setIsLoading(true);
        try {
            const filteredData = getFilteredData();
            
            if (filteredData.length === 0) {
                Alert.alert("Varování", "Filtru neodpovídají žádná data.");
                setIsLoading(false);
                return;
            }

            await clearScans("resources");

            const itemsToInsert = filteredData.map(item => ({
                domain: item["ld_det.ld_domain"] || "",
                part_number: item["ld_det.ld_part"] || "",
                location: item["ld_det.ld_site"] || "",
                storage_location: item["ld_det.ld_loc"] || "",
                batch: item["ld_det.ld_lot"] || "",
                reference: item["ld_det.ld_ref"] || "",
                quantity: item["ld_det.ld_qty_oh"]?.toString() || "0"
            }));

            await bulkAddScans("resources", itemsToInsert);
            
            navigation.navigate('OfflineInventory', { inventory: filteredData });
        } catch (error) {
            Alert.alert("Chyba importu", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCount = (allInventoryData.length > 0 && selectedSite) ? getFilteredData().length : 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Import Dat</Text>
                <Text style={styles.subtitle}>Doména: {selectedDomain}</Text>
            </View>

            <View style={styles.statusContainer}>
                <Text style={[styles.statusMessage, { color: isLoadingData ? 'blue' : 'black' }]}>
                    {statusMessage}
                </Text>
            </View>

            {isLoadingData && (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            )}

            {!isLoadingData && !selectedSite && sites.length > 0 && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Vyberte Místo (Site):</Text>
                    <View style={styles.gridContainer}>
                        <TouchableOpacity 
                            style={styles.siteButton} 
                            onPress={() => handleSiteSelect('*')}
                        >
                            <Text style={styles.siteButtonText}>VŠECHNA MÍSTA</Text>
                        </TouchableOpacity>

                        {sites.map(site => (
                            <TouchableOpacity 
                                key={site.si_site} 
                                style={styles.siteButton} 
                                onPress={() => handleSiteSelect(site.si_site)}
                            >
                                <Text style={styles.siteButtonText}>{site.si_site}</Text>
                                <Text style={styles.siteButtonDesc}>{site.si_desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {!isLoadingData && selectedSite && (
                <View style={styles.filtersContainer}>
                    <View style={styles.selectedSiteHeader}>
                        <Text style={styles.selectedSiteText}>
                            Vybrané místo: {selectedSite === '*' ? 'Všechna' : selectedSite}
                        </Text>
                        <TouchableOpacity onPress={handleResetSite}>
                            <Text style={{color: '#007bff', textDecorationLine: 'underline'}}>Změnit</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Lokace (začíná na):</Text>
                        <TextInput
                            style={styles.textInput}
                            value={storageLocation}
                            onChangeText={setStorageLocation}
                            placeholder="* pro všechny"
                        />
                    </View>

                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Položka (začíná na):</Text>
                        <TextInput
                            style={styles.textInput}
                            value={partFilter}
                            onChangeText={setPartFilter}
                            placeholder="* pro všechny"
                        />
                    </View>

                    <View style={styles.summaryContainer}>
                        <Text>Nalezeno záznamů: {filteredCount}</Text>
                    </View>

                    <LoadingButton
                        title="Importovat data"
                        onPress={handleImport}
                        disabled={filteredCount === 0}
                        isLoading={isLoading}
                    />
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
        flex: 1,
        padding: 15,
        backgroundColor: '#f5f5f5',
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    statusContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        marginBottom: 15,
        alignItems: 'center',
    },
    statusMessage: {},
    sectionContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    siteButton: {
        width: '48%',
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    siteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    siteButtonDesc: {
        color: '#e0e0e0',
        fontSize: 12,
        marginTop: 2,
    },
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
    },
    selectedSiteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    selectedSiteText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    filterGroup: {
        marginBottom: 15,
    },
    filterLabel: {
        marginBottom: 5,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#fff',
    },
    summaryContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    loader: {
        marginVertical: 20,
    },
    bottomBar: {
        marginTop: 30,
        marginBottom: 30,
    },
    backButton: {
        backgroundColor: '#007bff',
    },
});

export default ImportDataScreen;
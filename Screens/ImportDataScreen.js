import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TextInput } from 'react-native';
import Button from '../Components/Button';
import LoadingButton from "../Components/LoadingButton";
import { clearScans, bulkAddScans } from "../Database/Database";
import apiService from '../services/apiService';
import { StorageService } from '../utils/storage';

const ImportDataScreen = ({ navigation }) => {

    // State for all data and filters
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [allInventoryData, setAllInventoryData] = useState([]);
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('*'); 
    const [storageLocation, setStorageLocation] = useState('*');
    const [partFilter, setPartFilter] = useState('*');
    const [currentAccessToken, setCurrentAccessToken] = useState('');

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Preparing data loading...");

    // useEffect to load token and domain
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const savedToken = await StorageService.loadAccessToken();
                if (!savedToken) {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                    return;
                }
                setCurrentAccessToken(savedToken);

                const savedDomain = await StorageService.loadDomainSelection();
                if (savedDomain) {
                    setSelectedDomain(savedDomain);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            }
        };

        loadInitialData();
    }, []);

    // Load domain data when both token and domain are available
    useEffect(() => {
        const loadDomainData = async () => {
            if (!currentAccessToken || !selectedDomain) {
                return;
            }

            setIsLoadingData(true);
            setStatusMessage("Loading all data for domain " + selectedDomain + "...");

            try {
                const inventoryData = await apiService.getInventoryDataForDomain(currentAccessToken, selectedDomain);

                // Debug: Step 1 - check which domains actually came from API
                console.log("=== DEBUG API RESPONSE ===");
                console.log("API request for domain:", selectedDomain);
                
                if (Array.isArray(inventoryData) && inventoryData.length > 0) {
                    // Debug: Step 2 - check which fields are available
                    console.log("Available fields in first item:", Object.keys(inventoryData[0] || {}));
                    
                    // Debug: Step 1 continuation - which domains actually came
                    const uniqueDomains = [...new Set(inventoryData.map(item => item["ld_det.ld_domain"]))];
                    console.log("Actually received domains:", uniqueDomains);
                    console.log("First 3 items with domain info:", inventoryData.slice(0, 3).map(item => ({
                        domain: item["ld_det.ld_domain"],
                        part: item["ld_det.ld_part"],
                        site: item["ld_det.ld_site"]
                    })));
                }
                console.log("=== END DEBUG ===");

                if (!Array.isArray(inventoryData)) {
                    throw new Error("API did not return array of data");
                }

                // CLIENT-SIDE FILTERING - filter data by selected domain
                const filteredByDomain = inventoryData.filter(item => {
                    const itemDomain = item["ld_det.ld_domain"];
                    return itemDomain === selectedDomain;
                });

                console.log(`Data before filtering: ${inventoryData.length}, after filtering by domain '${selectedDomain}': ${filteredByDomain.length}`);

                setAllInventoryData(filteredByDomain);
                const uniqueSites = apiService.getUniqueSitesFromData(filteredByDomain);
                setSites(uniqueSites);

                if (filteredByDomain.length === 0) {
                    setStatusMessage(`Domain '${selectedDomain}' contains no data. Available domains: ${[...new Set(inventoryData.map(item => item["ld_det.ld_domain"]))].join(', ')}`);
                } else {
                    setStatusMessage(`Loaded ${filteredByDomain.length} records for domain '${selectedDomain}'. Available sites: ${uniqueSites.map(s => s.si_site).join(', ')}`);
                }

            } catch (error) {
                console.error("Error loading domain data:", error);
                setStatusMessage("Error loading data: " + error.message);
                setAllInventoryData([]);
                setSites([]);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadDomainData();
    }, [selectedDomain, currentAccessToken]);

    // Function for filtering data from already loaded data
    const getFilteredData = () => {
        return allInventoryData.filter(item => {
            const site = item["ld_det.ld_site"] || "";
            const location = item["ld_det.ld_loc"] || "";
            const part = item["ld_det.ld_part"] || "";

            // Site filter
            const siteMatch = selectedSite === '*' || site === selectedSite;

            // Storage location filter
            const locationMatch = storageLocation === '*' ||
                (storageLocation.endsWith('*') ?
                    location.startsWith(storageLocation.slice(0, -1)) :
                    location === storageLocation);

            // Parts filter
            const partMatch = partFilter === '*' ||
                (partFilter.endsWith('*') ?
                    part.startsWith(partFilter.slice(0, -1)) :
                    part === partFilter);

            return siteMatch && locationMatch && partMatch;
        });
    };

    // Function for importing filtered data
    const handleImport = async () => {
        if (!selectedDomain) {
            Alert.alert("Error", "Select a domain!");
            return;
        }

        if (allInventoryData.length === 0) {
            Alert.alert("Error", "No data available for import!");
            return;
        }

        setIsLoading(true);
        setStatusMessage("Importing filtered data...");

        try {
            const filteredData = getFilteredData();

            if (filteredData.length === 0) {
                Alert.alert("Warning", "No data matches the set filters!");
                setIsLoading(false);
                return;
            }
            await clearScans("resources");

            // Data for bulk insert
            const itemsToInsert = filteredData.map(item => ({
                domain: item["ld_det.ld_domain"] || "",
                part_number: item["ld_det.ld_part"] || "",
                location: item["ld_det.ld_site"] || "",
                storage_location: item["ld_det.ld_loc"] || "",
                batch: item["ld_det.ld_lot"] || "",
                reference: item["ld_det.ld_ref"] || "",
                quantity: item["ld_det.ld_qty_oh"]?.toString() || "0"
            }));

            // Bulk insert
            await bulkAddScans("resources", itemsToInsert);

            setStatusMessage(`Import completed! Imported records: ${filteredData.length} of ${allInventoryData.length}`);

            await StorageService.saveImportFilters({
                domain: selectedDomain,
                site: selectedSite,
                storageLocation,
                partFilter
            });

            navigation.navigate('OfflineInventory', { inventory: filteredData });
        } catch (error) {
            console.error("Import error details:", error);
            setStatusMessage("IMPORT ERROR: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = selectedDomain && !isLoadingData && currentAccessToken && allInventoryData.length > 0;
    const filteredCount = allInventoryData.length > 0 ? getFilteredData().length : 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Import QAD Data</Text>
                <Text style={styles.subtitle}>Domain: {selectedDomain}</Text>
                <Text style={styles.subtitle}>Token: {currentAccessToken ? 'Available' : 'Unavailable'}</Text>
                {allInventoryData.length > 0 && (
                    <Text style={styles.dataInfo}>
                        Total loaded: {allInventoryData.length} | After filtering: {filteredCount}
                    </Text>
                )}
            </View>

            <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusMessage, { color: (isLoading || isLoadingData) ? 'blue' : 'green' }]}>
                    {statusMessage}
                </Text>
            </View>

            {(isLoading || isLoadingData) && (
                <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            )}

            {!isLoading && allInventoryData.length > 0 && (
                <View style={styles.filtersContainer}>
                    <Text style={styles.filtersTitle}>Import filters:</Text>

                    {/* Site Selection */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Site:</Text>
                        <Picker
                            selectedValue={selectedSite}
                            onValueChange={(itemValue) => setSelectedSite(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="All sites (*)" value="*" />
                            {sites.map(site => (
                                <Picker.Item
                                    key={site.si_site}
                                    label={`${site.si_site} - ${site.si_desc}`}
                                    value={site.si_site}
                                />
                            ))}
                        </Picker>
                    </View>

                    {/* Storage Location Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Storage location (starts with):</Text>
                        <TextInput
                            style={styles.textInput}
                            value={storageLocation}
                            onChangeText={setStorageLocation}
                            placeholder="* for all locations"
                        />
                        <Text style={styles.helpText}>
                            Currently filtered: {filteredCount} records
                        </Text>
                    </View>

                    {/* Part Filter */}
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Parts (starts with):</Text>
                        <TextInput
                            style={styles.textInput}
                            value={partFilter}
                            onChangeText={setPartFilter}
                            placeholder="* for all parts"
                        />
                    </View>

                    <LoadingButton
                        title={`Import ${filteredCount} records to offline mode`}
                        onPress={handleImport}
                        disabled={!isFormValid || filteredCount === 0}
                        isLoading={isLoading}
                        style={styles.importButton}
                    />
                </View>
            )}

            <View style={styles.navigationContainer}>
                <Button
                    title="Back to Home"
                    onPress={() => navigation.goBack()}
                />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    dataInfo: {
        fontSize: 14,
        color: '#007bff',
        marginTop: 5,
        fontWeight: '500',
    },
    statusContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statusMessage: {
        fontSize: 14,
    },
    loader: {
        marginBottom: 20,
    },
    filtersContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
    },
    filtersTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    filterGroup: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    picker: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    helpText: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic',
    },
    importButton: {
        marginTop: 10,
    },
    navigationContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
});

export default ImportDataScreen;
import React, {useState, useRef, useEffect} from "react"; 
import { View, Text, StyleSheet, TextInput } from "react-native";
import Button from "../Components/Button";
import { addScan } from "../Database/Database";
import { validateBarcode } from "../utils/validation";

const ReaderScreen = ({ navigation }) => {
    const [barcode, setBarcode] = useState('');
    const inputRef = useRef(null);

    const handleScanSubmit = (scannedCode) => {
        if (!scannedCode) {
            console.log('No barcode scanned');
            return;
        }

        // Validate barcode
        const validation = validateBarcode(scannedCode);
        if (!validation.isValid) {
            alert(validation.message);
            return;
        }

        const newItem = {
            domain: "DEFAULT",
            partNumber: scannedCode, 
            location: "LOC1",
            storageLocation: "SL1",
            batch: "B1",
            reference: "R1",
            quantity: "1",
        }

        addScan("resources", newItem.domain, newItem.partNumber, newItem.location, newItem.storageLocation, newItem.batch, newItem.reference, newItem.quantity);

        setBarcode('');

        if (inputRef.current) {
            inputRef.current.focus();
        }
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={barcode}
                    onChangeText={setBarcode}
                    placeholder="Scan or enter barcode"
                    onSubmitEditing={(e) => handleScanSubmit(e.nativeEvent.text)}
                />
                <Button title="Add" onPress={() => handleScanSubmit(barcode)} />
            </View>

            <View style={styles.separator} />
            <View>
                <Button title="Home" onPress={() => navigation.goBack()} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  inputContainer: { marginBottom: 20, backgroundColor: '#fff', padding: 15, borderRadius: 8 },
  inputLabel: { fontSize: 16, marginBottom: 5, color: '#333' },
  barcodeInput: { 
    height: 55, 
    fontSize: 20, 
    borderWidth: 1, 
    borderColor: '#007bff', 
    paddingHorizontal: 15, 
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  separator: { height: 1, backgroundColor: '#ddd', marginVertical: 15 },
  logHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  logList: { flex: 1 },
  logItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 2,
  },
  logDetail: {
    fontSize: 14,
    color: 'gray',
    flex: 1,
    textAlign: 'right',
  }
});

export default ReaderScreen;
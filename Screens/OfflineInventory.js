import React from "react"; 
import { View, Text, StyleSheet } from "react-native";
import Button from "../Components/Button";
import db, {clearScans} from "../Database/Database";

const OfflineInventory = ({ navigation }) => {
const getSavedData = async () => {
        try {
            const database = await db;
            const result = await database.getAllAsync('SELECT * FROM resources');
            console.log("Saved data", result);
        } catch (error) {
            console.error("Error loading data:", error);
            alert("Error loading data");
        }
    };

    const clear = async () => {
        try {
            const database = await db;
            await database.execAsync('DELETE FROM resources');
            await database.execAsync('DELETE FROM inventory_scans');
            console.log("Database cleared");
        } catch (error) {
            console.error('Error clearing database:', error);
        }
    };

    return (
        <View style={styles.container}> 
            <Text style={styles.title}>Offline Inventory Screen</Text>
            <View style={styles.buttonContainer}>
                <Button title="Home" onPress={() => navigation.goBack()} /> 
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Load local Data" onPress={getSavedData} />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Clear Storage" onPress={clear} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
    },
    buttonContainer: {
        marginTop: 20,
    },
});

export default OfflineInventory;
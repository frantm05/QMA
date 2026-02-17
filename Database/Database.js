import * as SQLite from 'expo-sqlite';
import { DATABASE_CONFIG } from '../constants/config';

const db = SQLite.openDatabaseAsync(DATABASE_CONFIG.DB_NAME);

export default db;

class DatabaseService {
    async initDB() {
        console.log("Initializing database...");
        const database = await db;

        await database.execAsync(`DROP TABLE IF EXISTS ${DATABASE_CONFIG.TABLES.RESOURCES};`);
        await database.execAsync(`DROP TABLE IF EXISTS ${DATABASE_CONFIG.TABLES.INVENTORY_SCANS};`);

        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS ${DATABASE_CONFIG.TABLES.RESOURCES} (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                domain TEXT,
                part_number TEXT,
                location TEXT, 
                storage_location TEXT, 
                batch TEXT, 
                reference TEXT, 
                quantity TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS ${DATABASE_CONFIG.TABLES.INVENTORY_SCANS} (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                domain TEXT,
                site TEXT,              -- Přidáno: Site (Místo)
                part_number TEXT,
                location TEXT,          -- Toto je Skladové místo (SM)
                original_location_scan TEXT, -- Původní sken SM s prefixem
                batch TEXT, 
                reference TEXT, 
                original_reference_scan TEXT, -- Původní sken Reference s prefixem
                quantity REAL,          -- Změněno na REAL pro počty
                scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                scanned_by TEXT,        -- Uživatel (přihlášený nebo 'Spočetl')
                is_manual_qty BOOLEAN DEFAULT 0,
                status TEXT             -- 'NEW', 'MATCH_OK', 'MATCH_FAIL', atd.
            );
        `);
    }

    async addScan(tableName, domain, partNumber, location, storageLocation, batch, reference, quantity) {
        try {
            const database = await db;
            const result = await database.runAsync(
                `INSERT INTO ${tableName} (domain, part_number, location, storage_location, batch, reference, quantity) VALUES (?, ?, ?, ?, ?, ?, ?);`, 
                [domain, partNumber, location, storageLocation, batch, reference, quantity]
            );
            console.log("Scan added successfully with ID:", result.lastInsertRowId);
            return result.lastInsertRowId;
        } catch (error) {
            console.error("Error adding scan:", error);
            throw error;
        }
    }

    async bulkAddScans(tableName, items) {
        try {
            const database = await db;
            
            await database.execAsync('BEGIN TRANSACTION;');
            
            try {
                const statement = await database.prepareAsync(
                    `INSERT INTO ${tableName} (domain, part_number, location, storage_location, batch, reference, quantity) VALUES (?, ?, ?, ?, ?, ?, ?);`
                );
                
                for (const item of items) {
                    await statement.executeAsync([
                        item.domain, item.part_number, item.location, item.storage_location, item.batch, item.reference, item.quantity
                    ]);
                }
                
                await statement.finalizeAsync();
                await database.execAsync('COMMIT;');
                
                console.log(`Successfully inserted ${items.length} items`);
            } catch (error) {
                await database.execAsync('ROLLBACK;');
                throw error;
            }
        } catch (error) {
            console.error("Error in bulk insert:", error);
            throw error;
        }
    }

    async getScans(tableName) {
        try {
            const database = await db;
            return await database.getAllAsync(`SELECT * FROM ${tableName} ORDER BY created_at DESC;`);
        } catch (error) {
            console.error("Error fetching scans:", error);
            throw error;
        }
    }

    async deleteScan(tableName, id) {
        try {
            const database = await db;
            await database.runAsync(`DELETE FROM ${tableName} WHERE id = ?;`, [id]);
            console.log("Scan deleted successfully");
        } catch (error) {
            console.error("Error deleting scan:", error);
            throw error;
        }
    }

    async clearScans(tableName) {
        try {
            const database = await db;
            await database.execAsync(`DELETE FROM ${tableName};`);
            console.log(`All scans cleared from ${tableName}`);
        } catch (error) {
            console.error("Error clearing scans:", error);
            throw error;
        }
    }
}

export const databaseService = new DatabaseService();
export const initDB = databaseService.initDB.bind(databaseService);
export const addScan = databaseService.addScan.bind(databaseService);
export const bulkAddScans = databaseService.bulkAddScans.bind(databaseService);
export const getScans = databaseService.getScans.bind(databaseService);
export const deleteScan = databaseService.deleteScan.bind(databaseService);
export const clearScans = databaseService.clearScans.bind(databaseService);

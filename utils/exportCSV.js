// utils/exportCSV.js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import db from '../Database/Database';

/**
 * Exportuje naskenovaná data z tabulky inventory_scans do CSV souboru.
 * Formát: SM;Ref;Množství;Spočetl;Datum;Čas  (odděleno středníkem)
 * Data SM a Ref jsou BEZ prefixu (jsou uloženy v DB již bez prefixu).
 */
export const exportScansToCSV = async () => {
    const database = await db;
    const rows = await database.getAllAsync(
        `SELECT location, reference, quantity, scanned_by, scan_date FROM inventory_scans ORDER BY scan_date ASC`
    );

    if (!rows || rows.length === 0) {
        throw new Error('Žádná data k exportu.');
    }

    // Hlavička CSV
    const header = 'SM;Ref;Množství;Spočetl;Datum;Čas';

    const lines = rows.map(row => {
        // SM a Ref jsou uloženy v DB již bez prefixu
        const sm = (row.location || '').replace(/;/g, ',');  // Escape středníku
        const ref = (row.reference || '').replace(/;/g, ',');
        const qty = row.quantity != null ? String(row.quantity) : '0';
        const scannedBy = (row.scanned_by || '').replace(/;/g, ',');

        let datum = '';
        let cas = '';
        if (row.scan_date) {
            const d = new Date(row.scan_date);
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                datum = `${dd}.${mm}.${yyyy}`;

                const hh = String(d.getHours()).padStart(2, '0');
                const mi = String(d.getMinutes()).padStart(2, '0');
                const ss = String(d.getSeconds()).padStart(2, '0');
                cas = `${hh}:${mi}:${ss}`;
            } else {
                const parts = row.scan_date.split(' ');
                datum = parts[0] || '';
                cas = parts[1] || '';
            }
        }

        return `${sm};${ref};${qty};${scannedBy};${datum};${cas}`;
    });

    // BOM pro správné zobrazení diakritiky v Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [header, ...lines].join('\r\n');

    // Název souboru s timestampem
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const fileName = `inventura_export_${timestamp}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
    });

    // Sdílení
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(filePath, {
            mimeType: 'text/csv',
            dialogTitle: 'Exportovat inventuru (CSV)',
            UTI: 'public.comma-separated-values-text',
        });
    }

    return { filePath, rowCount: rows.length };
};
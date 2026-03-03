// utils/barcodeParser.js

/**
 * Rozparsuje naskenovaný kód podle nastavení a pravidel Etapy 2.
 * @param {string} scan - Naskenovaný řetězec
 * @param {string} type - Typ skenu: 'LOCATION' (SM) nebo 'ITEM' (Reference)
 * @param {object} settings - Nastavení prefixů { smPrefix: string, itemPrefix: string }
 */
export const parseBarcode = (scan, type, settings = {}) => {
    const result = {
        original: scan,
        parsed: scan,
        isValid: true,
        error: null,
        metadata: {}
    };

    if (!scan || scan.trim().length === 0) {
        result.isValid = false;
        result.error = 'CHYBA: Prázdný kód';
        return result;
    }

    // --- Logika pro Skladové Místo (SM) ---
    if (type === 'LOCATION') {
        const prefix = (settings.smPrefix !== undefined && settings.smPrefix !== null) 
            ? settings.smPrefix 
            : '';
        
        if (prefix && prefix.length > 0) {
            if (scan.startsWith(prefix)) {
                result.parsed = scan.substring(prefix.length);
                if (result.parsed.length === 0) {
                    result.isValid = false;
                    result.error = `CHYBA: Sken obsahuje pouze prefix "${prefix}", chybí hodnota SM`;
                    return result;
                }
            } else {
                result.isValid = false;
                result.error = `CHYBA: Očekáván prefix "${prefix}" pro SM`;
                return result;
            }
        }
        return result;
    }

    // --- Logika pro Referenci / Položku ---
    if (type === 'ITEM') {
        // Důležité: používáme přesně to co je v nastavení, NEPOUŽÍVÁME fallback na 'R'
        const prefix = (settings.itemPrefix !== undefined && settings.itemPrefix !== null) 
            ? settings.itemPrefix 
            : '';

        // Scénář 2: Složený kód s oddělovačem #
        if (scan.includes('#')) {
            if (prefix && prefix.length > 0) {
                const parts = scan.split('#');
                const refPart = parts.find(p => p.startsWith(prefix));
                
                if (refPart) {
                    result.parsed = refPart.substring(prefix.length);
                    result.metadata.full_composite = scan;
                    if (result.parsed.length === 0) {
                        result.isValid = false;
                        result.error = `CHYBA: Nalezen prefix "${prefix}" ve složeném kódu, ale chybí hodnota Reference`;
                    }
                } else {
                    result.isValid = false;
                    result.error = `CHYBA: Očekáván prefix "${prefix}" pro Referenci ve složeném kódu`;
                }
            } else {
                // Bez prefixu – vezmeme první část složeného kódu
                const parts = scan.split('#');
                result.parsed = parts[0];
                result.metadata.full_composite = scan;
            }
            return result;
        }

        // Scénář 1: Jednoduchý kód
        if (prefix && prefix.length > 0) {
            if (scan.startsWith(prefix)) {
                result.parsed = scan.substring(prefix.length);
                if (result.parsed.length === 0) {
                    result.isValid = false;
                    result.error = `CHYBA: Sken obsahuje pouze prefix "${prefix}", chybí hodnota Reference`;
                    return result;
                }
            } else {
                result.isValid = false;
                result.error = `CHYBA: Očekáván prefix "${prefix}" pro Referenci`;
                return result;
            }
        }
        // Pokud prefix je prázdný, bereme celý sken jako referenci (result.parsed = scan, už nastaveno výše)
        
        return result;
    }

    return result;
};
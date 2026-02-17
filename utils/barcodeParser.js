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
        metadata: {} // Pro extra data ze složených kódů
    };

    if (!scan) {
        result.isValid = false;
        return result;
    }

    // --- Logika pro Skladové Místo (SM) ---
    if (type === 'LOCATION') {
        const prefix = settings.smPrefix || ''; // Např. "L" nebo "SM"
        
        if (prefix && scan.startsWith(prefix)) {
            result.parsed = scan.substring(prefix.length);
        } else if (prefix && !scan.startsWith(prefix)) {
            // PDF Str 7: Pokud prefix zadán, musí začínat na prefix, jinak chyba
            result.isValid = false;
            result.error = `Chybný prefix SM, očekáváno "${prefix}"`;
        }
        return result;
    }

    // --- Logika pro Referenci / Položku ---
    if (type === 'ITEM') {
        // Scénář 2 (PDF Str 8): Složený kód s oddělovačem #
        // Příklad: PF3G_1260_1000#SSO123478_999#RM0000078
        if (scan.includes('#')) {
            const parts = scan.split('#');
            // Hledáme část začínající na R (Reference)
            const refPart = parts.find(p => p.startsWith('R'));
            
            if (refPart) {
                result.parsed = refPart.substring(1); // Odstraníme 'R'
                result.metadata.full_composite = scan;
                // Zde bychom mohli vytáhnout i šarži nebo artikl, pokud bychom znali logiku jejich prefixů
                // Prozatím bereme, že hlavní je Reference
            } else {
                // Fallback pokud tam není jasné R-ko, vezmeme první část? 
                // Dle zadání je tam vždy prefix, předpokládejme standardní chování
                result.parsed = parts[0]; 
            }
            return result;
        }

        // Scénář 1 (PDF Str 8): Reference s prefixem "R"
        const prefix = settings.itemPrefix || 'R'; // Default dle zadání je často R
        
        if (prefix && scan.startsWith(prefix)) {
            result.parsed = scan.substring(prefix.length);
        } else if (prefix && !scan.startsWith(prefix)) {
            // Scénář 3 (PDF Str 8): Reference bez prefixu (ruční zadání) - povolíme to?
            // Pokud je to striktní nastavení:
            // result.isValid = false;
            // result.error = `Chybný prefix, očekáváno "${prefix}"`;
            
            // Ale PDF zmiňuje Scénář 3 "Reference bez prefixu", takže pokud kontrola selže, 
            // můžeme to považovat za čistý kód (např. ruční zadání M0000078)
            result.parsed = scan; 
        }
        
        return result;
    }

    return result;
};
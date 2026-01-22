export const validateBarcode = (barcode) => {
    if (!barcode || barcode.trim().length === 0) {
        return { isValid: false, message: 'Barcode cannot be empty' };
    }
    
    if (barcode.length < 3) {
        return { isValid: false, message: 'Barcode must be at least 3 characters' };
    }
    
    return { isValid: true, message: '' };
};

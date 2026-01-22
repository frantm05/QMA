import axios from 'axios';
import { API_CONFIG } from '../constants/config';

class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.clientId = API_CONFIG.CLIENT_ID;
    }

    async authenticate(username, password) {
        try {
            const response = await axios.post(
                `${this.baseURL}${API_CONFIG.ENDPOINTS.TOKEN}`,
                new URLSearchParams({
                    grant_type: 'password',
                    username,
                    password,
                    client_id: this.clientId
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );
            return response.data.access_token;
        } catch (error) {
            throw new Error('Authentication failed');
        }
    }

    // Method for getting unique sites from loaded data
    getUniqueSitesFromData(inventoryData) {
        
        const sites = [...new Set(inventoryData.map(item => item["ld_det.ld_site"]))];
        
        const filteredSites = sites.filter(site => site); // Remove empty/null values
        
        const sortedSites = filteredSites.sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a.localeCompare(b);
        });
        
        const result = sortedSites.map(site => ({
            si_site: site,
            si_desc: `Site ${site}`
        }));

        return result;
    }

    async getDomains(accessToken) {
        try {
            const response = await axios.get(
                `${this.baseURL}${API_CONFIG.ENDPOINTS.USER_CONTEXT}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            );
            
            const data = response.data;
            console.log("Raw domains response:", data);
            
            // Extract domains from qad-qracore structure
            if (data["qad-qracore"] && Array.isArray(data["qad-qracore"])) {
                const domains = data["qad-qracore"].map(domain => {
                    // Extract clean domain code (before underscore)
                    const domainCode = domain.name.split('_')[0];
                    
                    return {
                        key: domain.key,
                        name: domainCode, // Use extracted code instead of full name
                        fullName: domain.name, // Keep original full name for possible use
                        description: domain.description,
                        isDefault: domain.default || false
                    };
                });
                
                console.log("Processed domains:", domains);
                return domains;
            }
            
            console.warn("Unexpected domains response format");
            return [];
        } catch (error) {
            console.error('Error fetching domains:', error);
            throw new Error('Error loading domains: ' + error.message);
        }
    }

    async getInventoryDataForDomain(accessToken, domain) {
        try {
            // Now domain already contains clean code (e.g. "CZ01")
            const filters = `ld_det.ld_domain EQ '${domain}'`;
            
            console.log("=== API REQUEST DEBUG ===");
            console.log("Requesting domain:", domain);
            console.log("Filter string:", filters);
            console.log("Full URL:", `${this.baseURL}${API_CONFIG.ENDPOINTS.INVENTORY_BROWSE}`);

            const response = await axios.get(
                `${this.baseURL}${API_CONFIG.ENDPOINTS.INVENTORY_BROWSE}`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    params: { 
                        filters,
                        fields: "ld_det.ld_domain,ld_det.ld_site,ld_det.ld_loc,ld_det.ld_part,ld_det.ld_lot,ld_det.ld_status,ld_det.ld_grade,ld_det.ld_assay,ld_det.ld_expire,ld_det.ld_qty_oh,ld_det.ld_qty_all,ld_det.ld_ref,pt_mstr.pt_desc1,pt_mstr.pt_desc2,pt_mstr.pt_um",
                        pageSize: 1000
                    }
                }
            );
            
            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);
            console.log("=== END API REQUEST DEBUG ===");
            
            const data = response.data.data || response.data;
            return data;
        } catch (error) {
            console.error('Error fetching inventory data for domain:', error);
            console.error('Error response:', error.response?.data);
        }
    }
}

export default new ApiService();
export const API_CONFIG = {
    BASE_URL: "http://global25-a5032001.ee22:22000/qad-central",
    CLIENT_ID: "f6ad14cbb12eb5a6e114189480a357fb",
    ENDPOINTS: {
        TOKEN: "/oauth/token",
        ROLES: "/api/qracore/roles",
        USER_CONTEXT: "/api/webshell/workspaces",
        INVENTORY_BROWSE: "/api/qracore/browses?browseId=urn:browse:mfg:aa800"
    }
};

export const DATABASE_CONFIG = {
    DB_NAME: 'inventory.db', // Changed from 'inventura.db'
    TABLES: {
        RESOURCES: 'resources', // Changed from 'zasoby'
        INVENTORY_SCANS: 'inventory_scans' // Changed from 'inventura_skeny'
    }
};
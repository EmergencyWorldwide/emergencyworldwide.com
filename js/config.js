const CONFIG = {
    // Map settings
    MAP: {
        CENTER: [-37.8136, 144.9631], // Melbourne, Victoria
        ZOOM: 12,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors'
    },

    // Game settings
    GAME: {
        INITIAL_BUDGET: 100000,
        MISSION_INTERVAL: 30000, // 30 seconds
        SAVE_INTERVAL: 60000     // 60 seconds
    },

    // Prices
    PRICES: {
        BUILDINGS: {
            fire_station: 50000,
            medical_center: 40000,
            hazmat_unit: 60000
        },
        VEHICLES: {
            fire_truck: 20000,
            ambulance: 15000,
            cfa_pumper: 25000,
            frv_pumper: 30000
        }
    },

    // Mission types and their descriptions
    MISSION_TYPES: {
        bush_fire: {
            description: 'Bush fire reported in the area. Requires immediate response.',
            color: 'danger'
        },
        structure_fire: {
            description: 'Structure fire reported. Building evacuation in progress.',
            color: 'danger'
        },
        medical: {
            description: 'Medical emergency reported. Ambulance required.',
            color: 'warning'
        },
        hazmat: {
            description: 'Hazardous materials incident reported.',
            color: 'warning'
        }
    },

    // Vehicle types and their capabilities
    VEHICLE_TYPES: {
        fire_truck: ['bush_fire', 'structure_fire'],
        ambulance: ['medical'],
        cfa_pumper: ['bush_fire', 'structure_fire', 'hazmat'],
        frv_pumper: ['structure_fire', 'hazmat']
    },

    // Building types
    BUILDING_TYPES: [
        {
            id: 'fire_station',
            name: 'Fire Station',
            description: 'Standard fire station for urban and rural fire response',
            cost: 50000,
            allowedVehicles: ['fire_truck', 'cfa_pumper', 'frv_pumper']
        },
        {
            id: 'medical_center',
            name: 'Medical Center',
            description: 'Emergency medical response center',
            cost: 40000,
            allowedVehicles: ['ambulance']
        },
        {
            id: 'hazmat_unit',
            name: 'HAZMAT Unit',
            description: 'Specialized hazardous materials response unit',
            cost: 60000,
            allowedVehicles: ['cfa_pumper', 'frv_pumper']
        }
    ]
};

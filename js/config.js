const CONFIG = {
    // Map settings
    MAP: {
        CENTER_LAT: -33.8688,  // Sydney, Australia
        CENTER_LNG: 151.2093,
        ZOOM: 13,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },

    // Game settings
    GAME: {
        INITIAL_BUDGET: 1000000,  // Start with $1 million
        MISSION_INTERVAL: 10000,    // 10 seconds between missions
        SAVE_INTERVAL: 5000,       // 5 seconds between saves
        MISSION_DURATION: 30000,   // 30 seconds for mission completion
        AUTO_COMPLETE: true         // Automatically complete missions after duration
    },

    // Prices
    PRICES: {
        BUILDINGS: {
            FIRE_STATION: 500000,  // $500k for a fire station
        },
        VEHICLES: {
            FIRE_ENGINE: 100000,   // $100k for a fire engine
            LADDER_TRUCK: 200000,     // $200k for a ladder truck
            RESCUE_UNIT: 150000,     // $150k for a rescue unit
            HAZMAT_UNIT: 250000,      // $250k for a hazmat unit
            FRV_HEAVY_PUMPER: 300000  // $300k for a FRV Heavy Pumper
        }
    },

    // Building types
    BUILDING_TYPES: {
        FIRE_STATION: {
            name: 'Fire Station',
            icon: 'bi-building',
            color: '#dc3545',
            allowedVehicles: ['FIRE_ENGINE', 'LADDER_TRUCK', 'RESCUE_UNIT', 'HAZMAT_UNIT', 'FRV_HEAVY_PUMPER']
        }
    },

    // Vehicle types and their capabilities
    VEHICLE_TYPES: {
        FIRE_ENGINE: {
            name: 'Fire Engine',
            icon: 'bi-truck',
            color: '#dc3545',
            missionTypes: ['FIRE', 'HAZMAT']
        },
        LADDER_TRUCK: {
            name: 'Ladder Truck',
            icon: 'bi-ladder',
            color: '#ffc107',
            missionTypes: ['FIRE', 'RESCUE']
        },
        RESCUE_UNIT: {
            name: 'Rescue Unit',
            icon: 'bi-heart-pulse',
            color: '#28a745',
            missionTypes: ['RESCUE', 'MEDICAL']
        },
        HAZMAT_UNIT: {
            name: 'HAZMAT Unit',
            icon: 'bi-exclamation-triangle',
            color: '#fd7e14',
            missionTypes: ['HAZMAT']
        },
        FRV_HEAVY_PUMPER: {
            name: 'FRV Heavy Pumper',
            icon: 'bi-water',
            color: '#0d6efd',
            missionTypes: ['FIRE', 'HAZMAT', 'INDUSTRIAL']
        }
    },

    // Mission types and their descriptions
    MISSION_TYPES: {
        FIRE: {
            name: 'Fire',
            icon: 'bi-fire',
            color: '#dc3545',
            description: 'Building fire reported',
            reward: 50000,
            failPenalty: 25000
        },
        RESCUE: {
            name: 'Rescue',
            icon: 'bi-person-heart',
            color: '#28a745',
            description: 'Person needs rescue',
            reward: 40000,
            failPenalty: 20000
        },
        MEDICAL: {
            name: 'Medical',
            icon: 'bi-heart-pulse',
            color: '#0dcaf0',
            description: 'Medical emergency',
            reward: 30000,
            failPenalty: 15000
        },
        HAZMAT: {
            name: 'HAZMAT',
            icon: 'bi-exclamation-triangle',
            color: '#fd7e14',
            description: 'Hazardous materials incident',
            reward: 60000,
            failPenalty: 30000
        },
        INDUSTRIAL: {
            name: 'Industrial',
            icon: 'bi-building-gear',
            color: '#6c757d',
            description: 'Industrial emergency',
            reward: 70000,
            failPenalty: 35000
        }
    }
};

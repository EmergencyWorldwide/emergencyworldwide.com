class GameState {
    constructor() {
        this.budget = CONFIG.INITIAL_BUDGET;
        this.buildings = new Map();
        this.vehicles = new Map();
        this.missions = new Map();
        this.nextBuildingId = 1;
        this.nextVehicleId = 1;
        this.nextMissionId = 1;
    }

    canAfford(cost) {
        return this.budget >= cost;
    }

    addBuilding(type, lat, lng) {
        const cost = CONFIG.PRICES.BUILDINGS[type];
        if (!this.canAfford(cost)) {
            return null;
        }

        const building = {
            id: `b${this.nextBuildingId++}`,
            type,
            lat,
            lng,
            vehicles: new Set()
        };

        this.buildings.set(building.id, building);
        this.budget -= cost;
        return building;
    }

    removeBuilding(id) {
        const building = this.buildings.get(id);
        if (!building) return false;

        // Remove all vehicles from this building
        for (const vehicleId of building.vehicles) {
            this.removeVehicle(vehicleId);
        }

        this.buildings.delete(id);
        return true;
    }

    addVehicle(type, buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return null;

        const cost = CONFIG.PRICES.VEHICLES[type];
        if (!this.canAfford(cost)) return null;

        const vehicle = {
            id: `v${this.nextVehicleId++}`,
            type,
            buildingId,
            assignedMissionId: null,
            lat: building.lat,
            lng: building.lng
        };

        this.vehicles.set(vehicle.id, vehicle);
        building.vehicles.add(vehicle.id);
        this.budget -= cost;
        return vehicle;
    }

    removeVehicle(id) {
        const vehicle = this.vehicles.get(id);
        if (!vehicle || vehicle.assignedMissionId) return false;

        const building = this.buildings.get(vehicle.buildingId);
        if (building) {
            building.vehicles.delete(vehicle.id);
        }

        this.vehicles.delete(id);
        return true;
    }

    addMission(type, lat, lng) {
        const missionType = CONFIG.MISSION_TYPES[type];
        if (!missionType) return null;

        const mission = {
            id: `m${this.nextMissionId++}`,
            type,
            lat,
            lng,
            status: 'active',
            description: this.generateMissionDescription(type),
            reward: this.calculateMissionReward(type),
            failPenalty: this.calculateMissionPenalty(type),
            createdAt: new Date().toISOString(),
            assignedVehicleId: null
        };

        this.missions.set(mission.id, mission);
        return mission;
    }

    assignVehicleToMission(vehicleId, missionId) {
        const vehicle = this.vehicles.get(vehicleId);
        const mission = this.missions.get(missionId);

        if (!vehicle || !mission) return false;
        if (vehicle.assignedMissionId || mission.assignedVehicleId) return false;
        if (mission.status !== 'active') return false;

        const vehicleType = CONFIG.VEHICLE_TYPES[vehicle.type];
        if (!vehicleType.missionTypes.includes(mission.type)) return false;

        vehicle.assignedMissionId = mission.id;
        mission.assignedVehicleId = vehicle.id;
        mission.status = 'assigned';
        return true;
    }

    completeMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission || mission.status !== 'assigned') return false;

        const vehicle = this.vehicles.get(mission.assignedVehicleId);
        if (!vehicle) return false;

        // Clear assignments
        vehicle.assignedMissionId = null;
        mission.status = 'completed';

        // Add reward
        this.budget += mission.reward;

        return true;
    }

    failMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission || mission.status !== 'active') return false;

        mission.status = 'failed';
        this.budget -= mission.failPenalty;
        return true;
    }

    generateMissionDescription(type) {
        const descriptions = {
            FIRE: [
                'Building fire reported! Immediate response required.',
                'Fire emergency at residential complex.',
                'Commercial building ablaze, multiple floors affected.',
                'Forest fire spreading rapidly, containment needed.',
                'Industrial facility fire with hazardous materials.'
            ],
            MEDICAL: [
                'Medical emergency requiring immediate attention.',
                'Multiple casualties reported at accident scene.',
                'Critical patient needs urgent transport.',
                'Mass casualty incident at public event.',
                'Emergency medical response needed at workplace.'
            ]
        };

        const options = descriptions[type] || ['Emergency response required.'];
        return options[Math.floor(Math.random() * options.length)];
    }

    calculateMissionReward(type) {
        const baseReward = CONFIG.MISSION_TYPES[type].baseReward || 5000;
        return Math.floor(baseReward * (0.8 + Math.random() * 0.4));
    }

    calculateMissionPenalty(type) {
        const basePenalty = CONFIG.MISSION_TYPES[type].basePenalty || 2500;
        return Math.floor(basePenalty * (0.8 + Math.random() * 0.4));
    }
}

// Create global game state instance
const gameState = new GameState();

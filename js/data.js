class GameState {
    constructor() {
        this.budget = CONFIG.GAME.INITIAL_BUDGET;
        this.buildings = new Map();
        this.vehicles = new Map();
        this.missions = new Map();
        this.nextId = 1;
    }

    generateId(prefix) {
        return `${prefix}_${this.nextId++}`;
    }

    addBuilding(type, lat, lng) {
        const id = this.generateId('b');
        const building = {
            id,
            type,
            lat,
            lng,
            vehicles: new Set()
        };
        this.buildings.set(id, building);
        return building;
    }

    addVehicle(type, buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return null;

        const id = this.generateId('v');
        const vehicle = {
            id,
            type,
            buildingId,
            assignedMissionId: null
        };
        this.vehicles.set(id, vehicle);
        building.vehicles.add(id);
        return vehicle;
    }

    addMission(type, lat, lng) {
        const id = this.generateId('m');
        const mission = {
            id,
            type,
            lat,
            lng,
            status: 'active',
            description: CONFIG.MISSION_TYPES[type].description,
            createdAt: new Date(),
            assignedVehicleId: null,
            assignedAt: null,
            completedAt: null
        };
        this.missions.set(id, mission);
        return mission;
    }

    assignVehicleToMission(vehicleId, missionId) {
        const vehicle = this.vehicles.get(vehicleId);
        const mission = this.missions.get(missionId);
        
        if (!vehicle || !mission) return false;
        if (vehicle.assignedMissionId || mission.assignedVehicleId) return false;
        if (!CONFIG.VEHICLE_TYPES[vehicle.type].includes(mission.type)) return false;

        vehicle.assignedMissionId = missionId;
        mission.assignedVehicleId = vehicleId;
        mission.status = 'assigned';
        mission.assignedAt = new Date();
        return true;
    }

    completeMission(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission || mission.status !== 'assigned') return false;

        const vehicle = this.vehicles.get(mission.assignedVehicleId);
        if (vehicle) {
            vehicle.assignedMissionId = null;
        }

        mission.status = 'completed';
        mission.completedAt = new Date();
        return true;
    }

    canAfford(cost) {
        return this.budget >= cost;
    }

    purchase(cost) {
        if (!this.canAfford(cost)) return false;
        this.budget -= cost;
        return true;
    }

    refund(cost) {
        this.budget += Math.floor(cost * 0.7); // 70% refund
    }

    removeBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return false;

        // Refund vehicles first
        for (const vehicleId of building.vehicles) {
            const vehicle = this.vehicles.get(vehicleId);
            if (vehicle) {
                this.refund(CONFIG.PRICES.VEHICLES[vehicle.type]);
                this.vehicles.delete(vehicleId);
            }
        }

        // Refund building
        this.refund(CONFIG.PRICES.BUILDINGS[building.type]);
        this.buildings.delete(buildingId);
        return true;
    }

    removeVehicle(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle || vehicle.assignedMissionId) return false;

        const building = this.buildings.get(vehicle.buildingId);
        if (building) {
            building.vehicles.delete(vehicleId);
        }

        this.refund(CONFIG.PRICES.VEHICLES[vehicle.type]);
        this.vehicles.delete(vehicleId);
        return true;
    }

    save() {
        const data = {
            budget: this.budget,
            nextId: this.nextId,
            buildings: Array.from(this.buildings.entries()),
            vehicles: Array.from(this.vehicles.entries()),
            missions: Array.from(this.missions.entries())
        };
        localStorage.setItem('gameState', JSON.stringify(data));
    }

    load() {
        const data = localStorage.getItem('gameState');
        if (!data) return false;

        try {
            const parsed = JSON.parse(data);
            this.budget = parsed.budget;
            this.nextId = parsed.nextId;
            this.buildings = new Map(parsed.buildings);
            this.vehicles = new Map(parsed.vehicles);
            this.missions = new Map(parsed.missions);

            // Convert dates from strings back to Date objects
            for (const mission of this.missions.values()) {
                mission.createdAt = new Date(mission.createdAt);
                if (mission.assignedAt) mission.assignedAt = new Date(mission.assignedAt);
                if (mission.completedAt) mission.completedAt = new Date(mission.completedAt);
            }

            // Restore Set objects for building vehicles
            for (const building of this.buildings.values()) {
                building.vehicles = new Set(building.vehicles);
            }

            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }
}

// Create global game state instance
const gameState = new GameState();

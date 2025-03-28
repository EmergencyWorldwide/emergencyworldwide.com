class Game {
    constructor() {
        this.ui = new UI();
        this.missionGenerator = null;
        this.init();
    }

    init() {
        // Start mission generator
        this.startMissionGenerator();
    }

    startMissionGenerator() {
        if (this.missionGenerator) {
            clearInterval(this.missionGenerator);
        }

        this.missionGenerator = setInterval(() => {
            // 10% chance each interval to generate a mission
            if (Math.random() < 0.1) {
                this.generateRandomMission();
            }
        }, 5000); // Check every 5 seconds
    }

    generateRandomMission() {
        // Pick a random mission type
        const types = Object.keys(CONFIG.MISSION_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        // Generate random coordinates within map bounds
        const lat = CONFIG.MAP.CENTER_LAT + (Math.random() - 0.5) * 0.1;
        const lng = CONFIG.MAP.CENTER_LNG + (Math.random() - 0.5) * 0.1;

        // Create the mission
        const mission = gameState.addMission(type, lat, lng);
        if (mission) {
            this.ui.showMission(mission);
        }
    }

    handleBuildingPlacement(latlng) {
        this.ui.handleBuildingPlacement(latlng);
    }

    showBuildingPurchase() {
        this.ui.showBuildingPurchase();
    }

    showVehiclesPage() {
        this.ui.showVehiclesPage();
    }

    purchaseVehicle(type, buildingId) {
        const vehicle = gameState.addVehicle(type, buildingId);
        if (vehicle) {
            this.ui.updateBudget();
            this.ui.showAlert('Vehicle purchased successfully!', 'success');
            // Refresh the vehicles page to show the new vehicle
            this.ui.showVehiclesPage();
        } else {
            this.ui.showAlert('Failed to purchase vehicle!', 'danger');
        }
    }

    removeVehicle(id) {
        if (gameState.removeVehicle(id)) {
            this.ui.updateBudget();
            this.ui.showAlert('Vehicle removed successfully!', 'success');
            // Refresh the vehicles page
            this.ui.showVehiclesPage();
        } else {
            this.ui.showAlert('Cannot remove vehicle on mission!', 'danger');
        }
    }

    removeBuilding(id) {
        if (gameState.removeBuilding(id)) {
            this.ui.updateBudget();
            this.ui.showAlert('Building removed successfully!', 'success');
        } else {
            this.ui.showAlert('Failed to remove building!', 'danger');
        }
    }

    assignVehicleToMission(vehicleId, missionId) {
        if (gameState.assignVehicleToMission(vehicleId, missionId)) {
            this.ui.showAlert('Vehicle assigned to mission!', 'success');
            this.ui.updateMDT();
        } else {
            this.ui.showAlert('Failed to assign vehicle to mission!', 'danger');
        }
    }

    completeMission(missionId) {
        if (gameState.completeMission(missionId)) {
            this.ui.updateBudget();
            this.ui.showAlert('Mission completed successfully!', 'success');
            this.ui.updateMDT();
        } else {
            this.ui.showAlert('Failed to complete mission!', 'danger');
        }
    }
}

// Initialize game state and game instance
const gameState = new GameState();
const game = new Game();

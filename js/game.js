class Game {
    constructor() {
        this.missionInterval = null;
        this.saveInterval = null;
        this.init();
    }

    init() {
        // Load saved state or start new game
        if (!gameState.load()) {
            this.showAlert('Starting new game', 'info');
        }

        // Start mission generation
        this.startMissionGeneration();

        // Start auto-save
        this.startAutoSave();

        // Initial UI update
        ui.updateBudget();
        ui.updateMDT();
    }

    startMissionGeneration() {
        this.missionInterval = setInterval(() => this.generateMission(), CONFIG.GAME.MISSION_INTERVAL);
    }

    startAutoSave() {
        this.saveInterval = setInterval(() => gameState.save(), CONFIG.GAME.SAVE_INTERVAL);
    }

    generateMission() {
        // Only generate new mission if there are available vehicles
        let hasAvailableVehicles = false;
        for (const vehicle of gameState.vehicles.values()) {
            if (!vehicle.assignedMissionId) {
                hasAvailableVehicles = true;
                break;
            }
        }

        if (!hasAvailableVehicles) return;

        // Get random coordinates near a random building
        const buildings = Array.from(gameState.buildings.values());
        if (buildings.length === 0) return;

        const building = buildings[Math.floor(Math.random() * buildings.length)];
        const lat = building.lat + (Math.random() - 0.5) * 0.1;
        const lng = building.lng + (Math.random() - 0.5) * 0.1;

        // Select random mission type
        const missionTypes = Object.keys(CONFIG.MISSION_TYPES);
        const type = missionTypes[Math.floor(Math.random() * missionTypes.length)];

        // Create mission
        const mission = gameState.addMission(type, lat, lng);
        ui.updateMDT();
        ui.updateMissionMarkers();
        ui.showAlert(`New ${type.replace('_', ' ')} mission!`, 'info');
    }

    purchaseVehicle(type, buildingId) {
        const cost = CONFIG.PRICES.VEHICLES[type];
        if (!gameState.canAfford(cost)) {
            ui.showAlert('Insufficient funds', 'danger');
            return false;
        }

        const vehicle = gameState.addVehicle(type, buildingId);
        if (!vehicle) {
            ui.showAlert('Failed to add vehicle', 'danger');
            return false;
        }

        gameState.purchase(cost);
        ui.updateBudget();
        ui.updateBuildingMarker(gameState.buildings.get(buildingId));
        ui.showAlert('Vehicle purchased successfully', 'success');
        return true;
    }

    removeBuilding(buildingId) {
        if (gameState.removeBuilding(buildingId)) {
            const marker = ui.buildings.get(buildingId);
            if (marker) {
                marker.remove();
                ui.buildings.delete(buildingId);
            }
            ui.updateBudget();
            ui.showAlert('Building sold successfully', 'success');
        }
    }

    removeVehicle(vehicleId) {
        const vehicle = gameState.vehicles.get(vehicleId);
        if (!vehicle) return;

        if (gameState.removeVehicle(vehicleId)) {
            const building = gameState.buildings.get(vehicle.buildingId);
            if (building) {
                ui.updateBuildingMarker(building);
            }
            ui.updateBudget();
            ui.showAlert('Vehicle sold successfully', 'success');
        }
    }

    assignVehicleToMission(vehicleId, missionId) {
        if (gameState.assignVehicleToMission(vehicleId, missionId)) {
            ui.updateMDT();
            return true;
        }
        return false;
    }

    completeMission(missionId) {
        if (gameState.completeMission(missionId)) {
            ui.updateMDT();
            ui.updateMissionMarkers();
            ui.showAlert('Mission completed successfully', 'success');
        }
    }

    showVehiclePurchase() {
        // Get available buildings
        const buildings = Array.from(gameState.buildings.values());
        if (buildings.length === 0) {
            ui.showAlert('Build a station first', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Purchase Vehicle</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Select Station</label>
                            <select class="form-select" id="building-select">
                                ${buildings.map(b => `
                                    <option value="${b.id}">
                                        ${b.type.replace('_', ' ').toUpperCase()}
                                        (${b.vehicles.size} vehicles)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="row">
                            ${Object.entries(CONFIG.VEHICLE_TYPES).map(([type, capabilities]) => `
                                <div class="col-md-6 mb-3">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h5 class="card-title">${type.replace('_', ' ').toUpperCase()}</h5>
                                            <p class="card-text">
                                                Can handle: ${capabilities.map(c => c.replace('_', ' ')).join(', ')}
                                            </p>
                                            <p class="card-text">
                                                <small class="text-muted">
                                                    Cost: $${CONFIG.PRICES.VEHICLES[type].toLocaleString()}
                                                </small>
                                            </p>
                                            <button class="btn btn-primary" onclick="game.purchaseVehicle('${type}', document.getElementById('building-select').value)">
                                                Purchase
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }
}

// Create global game instance
const game = new Game();

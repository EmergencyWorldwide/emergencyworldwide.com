class UI {
    constructor() {
        this.map = null;
        this.buildings = new Map();
        this.missionMarkers = new Map();
        this.selectedBuilding = null;
        this.isMDTMinimized = false;
        this.setupMap();
        this.setupEventListeners();
    }

    setupMap() {
        this.map = L.map('map').setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION
        }).addTo(this.map);

        this.map.on('click', (e) => {
            if (this.selectedBuilding) {
                this.placeBuildingAtLocation(e.latlng);
            }
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedBuilding) {
                this.cancelBuildingPlacement();
            }
        });
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.getElementById('alert-container').appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }

    updateBudget() {
        document.getElementById('budget').textContent = gameState.budget.toLocaleString();
    }

    toggleMDT() {
        const mdt = document.getElementById('mdt');
        const content = document.getElementById('mdt-content');
        const button = mdt.querySelector('button i');
        
        this.isMDTMinimized = !this.isMDTMinimized;
        content.style.display = this.isMDTMinimized ? 'none' : 'block';
        button.className = this.isMDTMinimized ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    }

    updateMDT() {
        const mdt = document.getElementById('mdt-content');
        mdt.innerHTML = '';
        
        const missions = Array.from(gameState.missions.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        missions.forEach(mission => {
            const missionType = mission.type.replace('_', ' ').toUpperCase();
            const card = document.createElement('div');
            card.className = `card mission-card ${CONFIG.MISSION_TYPES[mission.type].color} mb-2`;
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title mb-1">${missionType}</h6>
                            <p class="card-text small mb-1">${mission.description}</p>
                            <div class="text-muted small">
                                <i class="bi bi-geo-alt"></i> ${mission.lat.toFixed(4)}, ${mission.lng.toFixed(4)}
                            </div>
                        </div>
                        <div class="text-end">
                            ${mission.status === 'active' ? `
                                <button class="btn btn-sm btn-primary" onclick="ui.showVehicleSelection('${mission.id}', '${mission.type}')">
                                    <i class="bi bi-truck"></i> Assign Vehicle
                                </button>
                            ` : mission.status === 'assigned' ? `
                                <button class="btn btn-sm btn-success" onclick="game.completeMission('${mission.id}')">
                                    <i class="bi bi-check-lg"></i> Complete
                                </button>
                            ` : `
                                <span class="badge bg-secondary">Completed</span>
                            `}
                        </div>
                    </div>
                </div>
            `;
            mdt.appendChild(card);
        });
    }

    showBuildingPurchase() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Select Building Type</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${CONFIG.BUILDING_TYPES.map(building => `
                                <div class="col-12 mb-3">
                                    <div class="card h-100">
                                        <div class="card-body">
                                            <h5 class="card-title">${building.name}</h5>
                                            <p class="card-text">${building.description}</p>
                                            <p class="card-text">
                                                <small class="text-muted">
                                                    Cost: $${building.cost.toLocaleString()}
                                                </small>
                                            </p>
                                            <button class="btn btn-primary" onclick="ui.selectBuilding('${building.id}')">
                                                Select
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

    selectBuilding(buildingType) {
        const cost = CONFIG.PRICES.BUILDINGS[buildingType];
        if (!gameState.canAfford(cost)) {
            this.showAlert('Insufficient funds', 'danger');
            return;
        }

        this.selectedBuilding = buildingType;
        bootstrap.Modal.getInstance(document.querySelector('.modal')).hide();
        this.showAlert('Click on the map to place the building', 'info');
    }

    async placeBuildingAtLocation(latlng) {
        if (!this.selectedBuilding) return;

        const cost = CONFIG.PRICES.BUILDINGS[this.selectedBuilding];
        if (!gameState.canAfford(cost)) {
            this.showAlert('Insufficient funds', 'danger');
            return;
        }

        const building = gameState.addBuilding(this.selectedBuilding, latlng.lat, latlng.lng);
        gameState.purchase(cost);
        
        const marker = L.marker([latlng.lat, latlng.lng]).addTo(this.map);
        this.buildings.set(building.id, marker);
        
        this.updateBuildingMarker(building);
        this.updateBudget();
        this.cancelBuildingPlacement();
        this.showAlert('Building placed successfully', 'success');
    }

    cancelBuildingPlacement() {
        this.selectedBuilding = null;
        document.body.style.cursor = 'default';
    }

    updateBuildingMarker(building) {
        const marker = this.buildings.get(building.id);
        if (!marker) return;

        const vehicles = Array.from(building.vehicles)
            .map(id => gameState.vehicles.get(id))
            .filter(v => v);

        const popupContent = `
            <div class="popup-content">
                <strong>${building.type.replace('_', ' ').toUpperCase()}</strong>
                <div class="vehicle-list">
                    ${vehicles.length ? vehicles.map(vehicle => `
                        <div class="vehicle-item">
                            <span>${vehicle.type.replace('_', ' ').toUpperCase()}</span>
                            <button class="btn btn-sm btn-danger" onclick="game.removeVehicle('${vehicle.id}')">
                                Sell
                            </button>
                        </div>
                    `).join('') : 'No vehicles'}
                </div>
                <button class="btn btn-danger btn-sm mt-2" onclick="game.removeBuilding('${building.id}')">
                    Sell Building (70% refund)
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);
    }

    showVehicleSelection(missionId, missionType) {
        const modal = document.createElement('div');
        modal.className = 'modal vehicle-select-modal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Select Vehicle for ${missionType.replace('_', ' ').toUpperCase()}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            Select a vehicle capable of handling this type of mission.
                        </div>
                        <div id="vehicle-list">
                            <div class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <p class="mt-2">Loading vehicles...</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="ui.confirmVehicleAssignment('${missionId}')" disabled id="confirm-assignment">
                            Assign Vehicle
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        this.loadVehiclesForMission(missionId, missionType);

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async loadVehiclesForMission(missionId, missionType) {
        const vehicleList = document.getElementById('vehicle-list');
        let hasVehicles = false;
        let vehicleHtml = '';

        try {
            for (const [buildingId, building] of gameState.buildings) {
                const vehicles = Array.from(building.vehicles)
                    .map(id => gameState.vehicles.get(id))
                    .filter(v => v);

                if (vehicles.length > 0) {
                    hasVehicles = true;
                    vehicleHtml += `
                        <div class="building-section mb-3">
                            <h6 class="mb-2">
                                <i class="bi bi-building"></i> ${building.type.replace('_', ' ').toUpperCase()}
                            </h6>
                            <div class="vehicles-container">
                                ${vehicles.map(vehicle => `
                                    <div class="vehicle-card ${vehicle.assignedMissionId ? 'assigned' : ''}" 
                                         data-vehicle-id="${vehicle.id}" 
                                         onclick="ui.selectVehicle(this, '${missionType}')"
                                         data-capabilities='${JSON.stringify(CONFIG.VEHICLE_TYPES[vehicle.type])}'>
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>${vehicle.type.replace('_', ' ').toUpperCase()}</strong>
                                                <span class="status ${vehicle.assignedMissionId ? 'assigned' : 'available'}">
                                                    ${vehicle.assignedMissionId ? 'On Mission' : 'Available'}
                                                </span>
                                                <div class="text-muted small">ID: ${vehicle.id}</div>
                                                <div class="capabilities">
                                                    <i class="bi bi-gear"></i> Can handle: ${CONFIG.VEHICLE_TYPES[vehicle.type].map(c => c.replace('_', ' ')).join(', ')}
                                                </div>
                                                ${vehicle.assignedMissionId ? `
                                                    <div class="mission-info">
                                                        <i class="bi bi-exclamation-triangle"></i>
                                                        Assigned to Mission #${vehicle.assignedMissionId}
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <i class="bi bi-truck"></i>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>`;
                }
            }

            vehicleList.innerHTML = hasVehicles ? vehicleHtml : `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    No vehicles available. Purchase vehicles from the control panel.
                </div>`;
        } catch (error) {
            vehicleList.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading vehicles: ${error.message}
                </div>`;
        }
    }

    selectVehicle(card, missionType) {
        if (card.classList.contains('assigned')) {
            this.showAlert('This vehicle is already assigned to a mission', 'warning');
            return;
        }

        const capabilities = JSON.parse(card.dataset.capabilities);
        if (!capabilities.includes(missionType)) {
            this.showAlert(`This vehicle cannot handle ${missionType.replace('_', ' ')} missions`, 'warning');
            return;
        }

        document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('confirm-assignment').disabled = false;
    }

    async confirmVehicleAssignment(missionId) {
        const selectedCard = document.querySelector('.vehicle-card.selected');
        if (!selectedCard) {
            this.showAlert('Please select a vehicle first', 'warning');
            return;
        }

        const vehicleId = selectedCard.dataset.vehicleId;
        if (game.assignVehicleToMission(vehicleId, missionId)) {
            this.showAlert('Vehicle assigned successfully', 'success');
            bootstrap.Modal.getInstance(document.querySelector('.modal')).hide();
            this.updateMDT();
        } else {
            this.showAlert('Failed to assign vehicle', 'danger');
        }
    }

    updateMissionMarkers() {
        // Remove completed mission markers
        for (const [id, marker] of this.missionMarkers) {
            const mission = gameState.missions.get(id);
            if (!mission || mission.status === 'completed') {
                marker.remove();
                this.missionMarkers.delete(id);
            }
        }

        // Add/update active mission markers
        for (const mission of gameState.missions.values()) {
            if (mission.status === 'completed') continue;

            if (!this.missionMarkers.has(mission.id)) {
                const marker = L.marker([mission.lat, mission.lng], {
                    icon: L.divIcon({
                        className: 'mission-icon',
                        html: '🚨',
                        iconSize: [25, 25]
                    })
                }).addTo(this.map);
                this.missionMarkers.set(mission.id, marker);
            }
        }
    }
}

// Create global UI instance
const ui = new UI();

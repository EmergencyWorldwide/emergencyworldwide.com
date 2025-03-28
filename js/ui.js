class UI {
    constructor() {
        // Initialize map
        this.map = L.map('map').setView([CONFIG.MAP.CENTER_LAT, CONFIG.MAP.CENTER_LNG], CONFIG.MAP.ZOOM);
        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION
        }).addTo(this.map);

        // Initialize collections
        this.buildings = new Map();
        this.missions = new Map();
        this.isPlacingBuilding = false;

        // Initialize modals
        this.vehiclesModal = null;
        this.mdtVisible = false;

        // Set up map click handler
        this.map.on('click', (e) => {
            if (this.isPlacingBuilding) {
                game.handleBuildingPlacement(e.latlng);
            }
        });

        // Load existing buildings and missions
        this.loadExistingBuildings();
        this.loadExistingMissions();
    }

    loadExistingBuildings() {
        for (const building of gameState.buildings.values()) {
            this.addBuildingMarker(building);
        }
    }

    loadExistingMissions() {
        for (const mission of gameState.missions.values()) {
            if (mission.status === 'active' || mission.status === 'assigned') {
                this.showMission(mission);
            }
        }
    }

    updateBudget() {
        const budgetElement = document.getElementById('budget');
        if (budgetElement) {
            budgetElement.textContent = gameState.budget.toLocaleString();
        }
    }

    showAlert(message, type = 'info', duration = 3000) {
        const container = document.getElementById('alert-container');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(alert);

        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, duration);
    }

    showBuildingPurchase() {
        this.isPlacingBuilding = true;
        document.body.classList.add('cursor-crosshair');
        this.showAlert('Click on the map to place a fire station', 'info');
    }

    handleBuildingPlacement(latlng) {
        const building = gameState.addBuilding('FIRE_STATION', latlng.lat, latlng.lng);
        if (building) {
            this.addBuildingMarker(building);
            this.updateBudget();
            this.showAlert('Fire station placed successfully!', 'success');
        } else {
            this.showAlert('Cannot afford fire station!', 'danger');
        }
        
        this.isPlacingBuilding = false;
        document.body.classList.remove('cursor-crosshair');
    }

    addBuildingMarker(building) {
        const marker = L.marker([building.lat, building.lng], {
            icon: L.divIcon({
                className: 'building-marker',
                html: `<div class="building-icon" style="color: ${CONFIG.BUILDING_TYPES[building.type].color}">
                    <i class="bi ${CONFIG.BUILDING_TYPES[building.type].icon}"></i>
                </div>`
            })
        });

        marker.bindPopup(this.createBuildingPopup(building));
        marker.addTo(this.map);
        this.buildings.set(building.id, marker);
    }

    createBuildingPopup(building) {
        const buildingType = CONFIG.BUILDING_TYPES[building.type];
        let vehicleList = '';

        // Get vehicles at this building
        const buildingVehicles = Array.from(building.vehicles)
            .map(id => gameState.vehicles.get(id))
            .filter(v => v); // Filter out any undefined vehicles

        if (buildingVehicles.length > 0) {
            vehicleList = buildingVehicles.map(vehicle => {
                const vehicleType = CONFIG.VEHICLE_TYPES[vehicle.type];
                const status = vehicle.assignedMissionId ? 
                    '<span class="badge bg-warning">On Mission</span>' : 
                    '<span class="badge bg-success">Available</span>';
                
                return `
                    <div class="vehicle-card p-2 mb-2 ${vehicle.assignedMissionId ? 'assigned' : ''}"
                         style="border-left: 4px solid ${vehicleType.color}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi ${vehicleType.icon}"></i>
                                ${vehicleType.name}
                            </div>
                            <div>
                                ${status}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            vehicleList = `
                <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle"></i>
                    No vehicles stationed here
                </div>
            `;
        }

        const popup = L.popup({
            className: 'building-popup',
            maxWidth: 300,
            minWidth: 200,
        });

        popup.setContent(`
            <div class="p-3">
                <h5 class="mb-3">
                    <i class="bi ${buildingType.icon}"></i>
                    ${buildingType.name}
                </h5>
                <div class="mb-3">
                    <strong>Location:</strong><br>
                    ${building.lat.toFixed(4)}, ${building.lng.toFixed(4)}
                </div>
                <div class="mb-3">
                    <strong>Vehicles:</strong>
                    ${vehicleList}
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-danger" onclick="game.removeBuilding('${building.id}')">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                </div>
            </div>
        `);

        return popup;
    }

    showMission(mission) {
        // Create or update mission marker
        const marker = this.missions.get(mission.id) || L.marker([mission.lat, mission.lng], {
            icon: L.divIcon({
                className: 'mission-marker',
                html: `<div class="mission-icon" style="color: ${CONFIG.MISSION_TYPES[mission.type].color}">
                    <i class="bi ${CONFIG.MISSION_TYPES[mission.type].icon}"></i>
                </div>`
            })
        });

        // Update popup content
        marker.bindPopup(this.createMissionPopup(mission));

        // Add to map if new
        if (!this.missions.has(mission.id)) {
            marker.addTo(this.map);
            this.missions.set(mission.id, marker);
        }

        // Update MDT
        this.updateMDT();
    }

    createMissionPopup(mission) {
        const missionType = CONFIG.MISSION_TYPES[mission.type];
        const popup = L.popup({
            className: 'mission-popup',
            maxWidth: 300,
            minWidth: 200,
        });

        let statusBadge = '';
        switch (mission.status) {
            case 'active':
                statusBadge = '<span class="badge bg-danger">Active</span>';
                break;
            case 'assigned':
                statusBadge = '<span class="badge bg-warning">In Progress</span>';
                break;
            case 'completed':
                statusBadge = '<span class="badge bg-success">Completed</span>';
                break;
            case 'failed':
                statusBadge = '<span class="badge bg-secondary">Failed</span>';
                break;
        }

        popup.setContent(`
            <div class="p-3">
                <h5 class="mb-3">
                    <i class="bi ${missionType.icon}"></i>
                    ${missionType.name} Mission
                    ${statusBadge}
                </h5>
                <div class="mb-3">
                    ${mission.description}
                </div>
                <div class="mb-3">
                    <strong>Location:</strong><br>
                    ${mission.lat.toFixed(4)}, ${mission.lng.toFixed(4)}
                </div>
                <div class="mb-3">
                    <strong>Reward:</strong> $${mission.reward.toLocaleString()}<br>
                    <strong>Penalty:</strong> $${mission.failPenalty.toLocaleString()}
                </div>
                ${mission.status === 'active' ? `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        Requires immediate response!
                    </div>
                ` : ''}
            </div>
        `);

        return popup;
    }

    toggleMDT() {
        const mdt = document.getElementById('mdt');
        if (!mdt) return;

        this.mdtVisible = !this.mdtVisible;
        mdt.style.display = this.mdtVisible ? 'block' : 'none';
        this.updateMDT();
    }

    updateMDT() {
        if (!this.mdtVisible) return;

        const mdt = document.getElementById('missions');
        if (!mdt) return;

        mdt.innerHTML = '';

        // Sort missions by status and time
        const missions = Array.from(gameState.missions.values())
            .filter(m => m.status === 'active' || m.status === 'assigned')
            .sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

        if (missions.length === 0) {
            mdt.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    No active missions
                </div>
            `;
            return;
        }

        for (const mission of missions) {
            const missionType = CONFIG.MISSION_TYPES[mission.type];
            const card = document.createElement('div');
            card.className = `card mission-card mb-3 ${mission.status === 'active' ? 'border-danger' : 'border-warning'}`;
            
            let assignedVehicle = null;
            if (mission.assignedVehicleId) {
                assignedVehicle = gameState.vehicles.get(mission.assignedVehicleId);
            }

            card.innerHTML = `
                <div class="card-body">
                    <h6 class="card-title d-flex justify-content-between align-items-center">
                        <span>
                            <i class="bi ${missionType.icon}"></i>
                            ${missionType.name}
                        </span>
                        <span class="badge ${mission.status === 'active' ? 'bg-danger' : 'bg-warning'}">
                            ${mission.status === 'active' ? 'Active' : 'In Progress'}
                        </span>
                    </h6>
                    <p class="card-text">
                        ${mission.description}<br>
                        <small class="text-muted">
                            Location: ${mission.lat.toFixed(4)}, ${mission.lng.toFixed(4)}
                        </small>
                    </p>
                    ${assignedVehicle ? `
                        <div class="alert alert-info mb-0">
                            <i class="bi ${CONFIG.VEHICLE_TYPES[assignedVehicle.type].icon}"></i>
                            ${CONFIG.VEHICLE_TYPES[assignedVehicle.type].name} responding
                        </div>
                    ` : ''}
                </div>
            `;

            mdt.appendChild(card);
        }
    }

    showVehiclesPage() {
        // Get the modal element
        const modalEl = document.getElementById('vehiclesPageModal');
        if (!modalEl) {
            console.error('Vehicles modal not found');
            return;
        }

        // Update purchase tab
        const purchaseList = document.getElementById('vehiclePurchaseList');
        if (purchaseList) {
            purchaseList.innerHTML = '';

            // Group vehicles by building
            const buildingGroups = new Map();
            for (const building of gameState.buildings.values()) {
                const buildingType = CONFIG.BUILDING_TYPES[building.type];
                if (buildingType && buildingType.allowedVehicles) {
                    for (const vehicleType of buildingType.allowedVehicles) {
                        if (!buildingGroups.has(vehicleType)) {
                            buildingGroups.set(vehicleType, new Set());
                        }
                        buildingGroups.get(vehicleType).add(building);
                    }
                }
            }

            // Create purchase cards for each vehicle type
            for (const [type, vehicle] of Object.entries(CONFIG.VEHICLE_TYPES)) {
                const buildings = buildingGroups.get(type);
                if (!buildings || buildings.size === 0) {
                    // Skip if no buildings can house this vehicle
                    continue;
                }

                const cost = CONFIG.PRICES.VEHICLES[type];
                const canAfford = gameState.canAfford(cost);

                const card = document.createElement('div');
                card.className = 'col-md-6 col-lg-4';
                card.innerHTML = `
                    <div class="card h-100 ${canAfford ? '' : 'opacity-50'}" 
                         style="border-left: 4px solid ${vehicle.color}">
                        <div class="card-body">
                            <h5 class="card-title">
                                <i class="bi ${vehicle.icon}"></i> 
                                ${vehicle.name}
                            </h5>
                            <div class="card-text">
                                <div class="mb-2">
                                    <strong>Cost:</strong> $${cost.toLocaleString()}
                                    ${canAfford ? 
                                        '<span class="badge bg-success ms-2">Available</span>' : 
                                        '<span class="badge bg-danger ms-2">Cannot afford</span>'
                                    }
                                </div>
                                <div class="mb-2">
                                    <strong>Missions:</strong><br>
                                    ${vehicle.missionTypes.map(type => {
                                        const mission = CONFIG.MISSION_TYPES[type];
                                        return `
                                            <span class="badge" style="background-color: ${mission.color}">
                                                <i class="bi ${mission.icon}"></i> 
                                                ${mission.name}
                                            </span>
                                        `;
                                    }).join(' ')}
                                </div>
                                ${canAfford ? `
                                    <div class="form-group">
                                        <label class="form-label">Station:</label>
                                        <select class="form-select form-select-sm" 
                                                onchange="if(this.value) game.purchaseVehicle('${type}', this.value)">
                                            <option value="">Select station...</option>
                                            ${Array.from(buildings).map(building => `
                                                <option value="${building.id}">
                                                    Fire Station at (${building.lat.toFixed(4)}, ${building.lng.toFixed(4)})
                                                </option>
                                            `).join('')}
                                        </select>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
                purchaseList.appendChild(card);
            }

            // Show message if no vehicles available
            if (purchaseList.children.length === 0) {
                purchaseList.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            No vehicles available. Build a fire station first!
                        </div>
                    </div>
                `;
            }
        }

        // Update fleet tab
        const fleetList = document.getElementById('fleetList');
        if (fleetList) {
            fleetList.innerHTML = '';

            // Group vehicles by building
            const buildingVehicles = new Map();
            for (const vehicle of gameState.vehicles.values()) {
                if (!buildingVehicles.has(vehicle.buildingId)) {
                    buildingVehicles.set(vehicle.buildingId, []);
                }
                buildingVehicles.get(vehicle.buildingId).push(vehicle);
            }

            // Create fleet list
            if (buildingVehicles.size === 0) {
                fleetList.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> 
                        No vehicles in your fleet yet. Purchase vehicles from the Purchase tab.
                    </div>
                `;
            } else {
                for (const [buildingId, vehicles] of buildingVehicles) {
                    const building = gameState.buildings.get(buildingId);
                    if (!building) continue;

                    const buildingCard = document.createElement('div');
                    buildingCard.className = 'card mb-3';
                    buildingCard.innerHTML = `
                        <div class="card-header bg-light">
                            <h6 class="mb-0">
                                <i class="bi bi-building"></i> 
                                Fire Station at (${building.lat.toFixed(4)}, ${building.lng.toFixed(4)})
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                ${vehicles.map(vehicle => {
                                    const vehicleType = CONFIG.VEHICLE_TYPES[vehicle.type];
                                    return `
                                        <div class="col-md-6">
                                            <div class="vehicle-item p-2 rounded" 
                                                 style="border-left: 4px solid ${vehicleType.color}">
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <div>
                                                        <i class="bi ${vehicleType.icon}"></i>
                                                        ${vehicleType.name}
                                                    </div>
                                                    ${!vehicle.assignedMissionId ? `
                                                        <button class="btn btn-sm btn-outline-danger" 
                                                                onclick="game.removeVehicle('${vehicle.id}')">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                                ${vehicle.assignedMissionId ? `
                                                    <div class="text-warning">
                                                        <i class="bi bi-exclamation-triangle"></i>
                                                        On mission: ${vehicle.assignedMissionId}
                                                    </div>
                                                ` : `
                                                    <div class="text-success">
                                                        <i class="bi bi-check-circle"></i>
                                                        Available
                                                    </div>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                    fleetList.appendChild(buildingCard);
                }
            }
        }

        // Show the modal using Bootstrap 5.3 Modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// Create global UI instance
const ui = new UI();

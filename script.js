// Game state
let gameState = {
    budget: 500000,
    rank: 1,
    xp: 0,
    season_pass: false,
    season_level: 1,
    season_xp: 0
};

// Constants
const VEHICLES = {
    'TFS Support': 25000,
    'TFS Light Tanker': 35000,
    'TFS Command Support': 40000,
    'TFS Medium Tanker': 45000,
    'TFS Medium Pumper': 50000,
    'TFS Rescue': 60000,
    'TFS Heavy Tanker': 65000,
    'TFS CAFS Tanker': 70000,
    'TFS Heavy Pumper': 75000,
    'TFS HazMat': 80000,
    'TFS Heavy Tanker/Pumper': 85000,
    'TFS Heavy Tanker/Pumper/Rescue': 95000,
    'TFS Hydraulic Platform': 120000
};

// Map setup
const map = L.map('map').setView([-41.4545, 147.1714], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

// Markers
const buildingMarkers = {};
const missionMarkers = {};
let selectedBuilding = null;
let selectedMission = null;

// Notification system
function showNotification(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        className: `toast-${type}`,
        stopOnFocus: true
    }).showToast();
}

function loadGameState() {
    fetch('/api/game_state')
        .then(response => response.json())
        .then(state => {
            gameState = state;
            
            // Update UI
            document.getElementById('budget').textContent = state.budget.toLocaleString();
            document.getElementById('rank-name').textContent = state.rank_name;
            document.getElementById('season-level').textContent = state.season_level;
            
            // Update XP progress bar
            const xpProgress = document.getElementById('xp-progress');
            if (state.next_rank_xp) {
                const progress = (state.xp / state.next_rank_xp) * 100;
                xpProgress.style.width = `${progress}%`;
                xpProgress.setAttribute('aria-valuenow', progress);
            }
            
            // Update season progress bar
            const seasonProgress = document.getElementById('season-progress');
            const seasonProgressPercent = (state.season_xp / state.xp_to_next_season_level) * 100;
            seasonProgress.style.width = `${seasonProgressPercent}%`;
            seasonProgress.setAttribute('aria-valuenow', seasonProgressPercent);
            
            // Update season pass button
            const seasonPassBtn = document.getElementById('season-pass-btn');
            if (state.season_pass) {
                seasonPassBtn.style.display = 'none';
            }
        });
}

function loadBuildings() {
    fetch('/api/buildings')
        .then(response => response.json())
        .then(buildings => {
            // Remove old building markers
            Object.values(buildingMarkers).forEach(marker => marker.remove());
            
            buildings.forEach(building => {
                if (!buildingMarkers[building.id]) {
                    const marker = L.marker([building.lat, building.lon], {
                        icon: L.divIcon({
                            className: 'building-marker',
                            html: '🏢',
                            iconSize: [24, 24]
                        })
                    }).addTo(map);
                    
                    buildingMarkers[building.id] = marker;
                    
                    // Create building popup
                    const popupContent = document.createElement('div');
                    popupContent.innerHTML = `
                        <h6>Fire Station #${building.id}</h6>
                        <div id="vehicles-${building.id}"></div>
                        <div class="mt-2">
                            <select id="vehicle-type-${building.id}" class="form-select form-select-sm mb-2">
                                ${Object.entries(VEHICLES).map(([type, cost]) => `
                                    <option value="${type}">${type} ($${cost.toLocaleString()})</option>
                                `).join('')}
                            </select>
                            <button class="btn btn-sm btn-success mb-2" onclick="purchaseVehicle(${building.id})">
                                Purchase Vehicle
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="refundBuilding(${building.id})">
                                Refund Station
                            </button>
                        </div>
                    `;
                    marker.bindPopup(popupContent);
                    
                    // Load vehicles when popup opens
                    marker.on('popupopen', () => loadVehicles(building.id));
                }
            });
            
            // Remove markers for buildings that no longer exist
            Object.keys(buildingMarkers).forEach(id => {
                if (!buildings.find(b => b.id === parseInt(id))) {
                    buildingMarkers[id].remove();
                    delete buildingMarkers[id];
                }
            });
        });
}

function loadVehicles(buildingId) {
    fetch('/api/vehicles')
        .then(response => response.json())
        .then(vehicles => {
            const vehiclesList = document.getElementById(`vehicles-${buildingId}`);
            const stationVehicles = vehicles.filter(v => v.station_id === buildingId);
            
            if (stationVehicles.length === 0) {
                vehiclesList.innerHTML = '<p class="text-muted">No vehicles at this station</p>';
                return;
            }
            
            vehiclesList.innerHTML = `
                <h6 class="mb-2">Vehicles:</h6>
                ${stationVehicles.map(vehicle => `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span>${vehicle.type} (${vehicle.status})</span>
                        ${vehicle.status === 'available' ? `
                            <button class="btn btn-sm btn-danger" onclick="refundVehicle(${vehicle.id})">
                                Refund
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            `;
        });
}

function selectBuilding(type) {
    selectedBuilding = type;
    showNotification('Click on the map to place the fire station', 'info');
}

map.on('click', function(e) {
    if (selectedBuilding) {
        fetch('/api/buildings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: selectedBuilding,
                lat: e.latlng.lat,
                lon: e.latlng.lng
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification('Fire station placed successfully!', 'success');
                selectedBuilding = null;
                loadGameState();
                loadBuildings();
            }
        })
        .catch(error => {
            showNotification('Failed to place building', 'error');
            console.error('Error:', error);
        });
    }
});

function purchaseVehicle(buildingId) {
    const vehicleType = document.getElementById(`vehicle-type-${buildingId}`).value;
    
    fetch('/api/vehicles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: vehicleType,
            station_id: buildingId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Vehicle purchased successfully!', 'success');
            loadGameState();
            loadVehicles(buildingId);
        }
    })
    .catch(error => {
        showNotification('Failed to purchase vehicle', 'error');
        console.error('Error:', error);
    });
}

function purchaseSeasonPass() {
    fetch('/api/purchase_season_pass', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification('Season Pass purchased! You now earn 2x XP!', 'success');
            loadGameState();
        }
    })
    .catch(error => {
        showNotification('Failed to purchase Season Pass', 'error');
        console.error('Error:', error);
    });
}

function loadMissions() {
    fetch('/api/missions')
        .then(response => response.json())
        .then(missions => {
            // Remove old mission markers
            Object.values(missionMarkers).forEach(marker => marker.remove());
            
            missions.forEach(mission => {
                if (!missionMarkers[mission.id]) {
                    const marker = L.marker([mission.lat, mission.lon], {
                        icon: L.divIcon({
                            className: 'mission-marker',
                            html: '🔥',
                            iconSize: [24, 24]
                        })
                    }).addTo(map);
                    
                    missionMarkers[mission.id] = marker;
                    
                    // Create popup content
                    const popupContent = document.createElement('div');
                    popupContent.innerHTML = `
                        <h6>Fire Emergency</h6>
                        <p>XP Reward: ${mission.xp_reward}</p>
                        <div id="dispatch-panel-${mission.id}"></div>
                        <button class="btn btn-sm btn-primary" onclick="startDispatch(${mission.id})">
                            Dispatch Vehicles
                        </button>
                    `;
                    marker.bindPopup(popupContent);
                }
            });
            
            // Remove markers for missions that no longer exist
            Object.keys(missionMarkers).forEach(id => {
                if (!missions.find(m => m.id === parseInt(id))) {
                    missionMarkers[id].remove();
                    delete missionMarkers[id];
                }
            });
        });
}

function startDispatch(missionId) {
    selectedMission = missionId;
    
    // Get all available vehicles
    fetch('/api/vehicles')
        .then(response => response.json())
        .then(vehicles => {
            const availableVehicles = vehicles.filter(v => v.status === 'available');
            const dispatchPanel = document.getElementById(`dispatch-panel-${missionId}`);
            
            if (availableVehicles.length === 0) {
                dispatchPanel.innerHTML = '<p class="text-danger">No available vehicles!</p>';
                return;
            }
            
            dispatchPanel.innerHTML = `
                <div class="mb-2">
                    <h6>Select Vehicles:</h6>
                    ${availableVehicles.map(vehicle => `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="${vehicle.id}" id="vehicle-${vehicle.id}" name="vehicle-${missionId}">
                            <label class="form-check-label" for="vehicle-${vehicle.id}">
                                ${vehicle.type}
                            </label>
                        </div>
                    `).join('')}
                    <button class="btn btn-sm btn-success mt-2" onclick="dispatchVehicles(${missionId})">
                        Send Vehicles
                    </button>
                    <button class="btn btn-sm btn-secondary mt-2" onclick="cancelDispatch()">
                        Cancel
                    </button>
                </div>
            `;
        });
}

function cancelDispatch() {
    selectedMission = null;
    loadMissions();
}

function dispatchVehicles(missionId) {
    const selectedVehicles = Array.from(document.querySelectorAll(`input[name="vehicle-${missionId}"]:checked`))
        .map(checkbox => parseInt(checkbox.value));
    
    if (selectedVehicles.length === 0) {
        showNotification('Please select at least one vehicle', 'error');
        return;
    }
    
    fetch(`/api/missions/${missionId}/dispatch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            vehicle_ids: selectedVehicles
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            showNotification(`Mission completed! Earned ${data.xp_gained} XP`, 'success');
            cancelDispatch();
            loadGameState();
            loadMissions();
            loadBuildings();
        }
    })
    .catch(error => {
        showNotification('Failed to dispatch vehicles', 'error');
        console.error('Error:', error);
    });
}

function refundBuilding(buildingId) {
    if (confirm('Are you sure you want to refund this building? You will receive 50% of the original cost.')) {
        fetch(`/api/buildings/${buildingId}/refund`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(`Building refunded! Received $${data.refund.toLocaleString()}`, 'success');
                loadGameState();
                loadBuildings();
            }
        })
        .catch(error => {
            showNotification('Failed to refund building', 'error');
            console.error('Error:', error);
        });
    }
}

function refundVehicle(vehicleId) {
    if (confirm('Are you sure you want to refund this vehicle? You will receive 50% of the original cost.')) {
        fetch(`/api/vehicles/${vehicleId}/refund`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'error');
            } else {
                showNotification(`Vehicle refunded! Received $${data.refund.toLocaleString()}`, 'success');
                loadGameState();
                loadBuildings();
            }
        })
        .catch(error => {
            showNotification('Failed to refund vehicle', 'error');
            console.error('Error:', error);
        });
    }
}

// Auto-refresh missions every 30 seconds
setInterval(loadMissions, 30000);

// Auto-refresh game state every 10 seconds
setInterval(loadGameState, 10000);

// Auto-save by refreshing game state every minute
setInterval(loadGameState, 60000);

// Initial load
loadGameState();
loadBuildings();
loadMissions();

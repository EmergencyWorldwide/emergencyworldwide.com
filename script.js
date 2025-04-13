let map;
let markers = [];
let assets = {
    funds: 2000000,
    buildings: [],
    vehicles: []
};

let missions = [];
const missionTypes = {
    medical: { icon: '🚨', requiredAsset: 'ambulance', description: 'Medical Emergency', reward: 50000 },
    fire: { icon: '🔥', requiredAsset: 'fire_truck', description: 'Fire Emergency', reward: 75000 },
    crime: { icon: '🚔', requiredAsset: 'police_car', description: 'Police Emergency', reward: 45000 },
    rescue: { icon: '🆘', requiredAsset: 'ses_rescue', description: 'Rescue Operation', reward: 60000 }
};

let selectedVehicle = null;
let selectedMission = null;

// Generate a random mission
function generateMission() {
    if (assets.buildings.length === 0) return; // No buildings to generate missions for
    
    const missionTypeKeys = Object.keys(missionTypes);
    const randomType = missionTypeKeys[Math.floor(Math.random() * missionTypeKeys.length)];
    const randomBuilding = assets.buildings[Math.floor(Math.random() * assets.buildings.length)];
    
    // Create mission at a location near the building
    const radius = 0.01; // Approximately 1km radius
    const randomAngle = Math.random() * Math.PI * 2;
    const lat = randomBuilding.position.lat + radius * Math.cos(randomAngle);
    const lng = randomBuilding.position.lng + radius * Math.sin(randomAngle);
    
    const mission = {
        type: randomType,
        position: { lat, lng },
        createdAt: Date.now(),
        status: 'active',
        marker: null,
        assignedVehicle: null,
        completionTime: null
    };
    
    // Create marker for mission
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: missionTypes[randomType].icon,
            className: 'mission-icon',
            iconSize: [25, 25]
        })
    }).addTo(map);
    
    // Add click handler for mission details
    marker.on('click', () => {
        selectedMission = mission;
        const details = `
            <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 10px 0; color: #333;">${missionTypes[randomType].description}</h3>
                <p style="margin: 5px 0;"><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${mission.status === 'active' ? '#ff9800' : '#4CAF50'};">${mission.status.charAt(0).toUpperCase() + mission.status.slice(1)}</span></p>
                <p style="margin: 5px 0;"><strong>Required:</strong> ${missionTypes[randomType].requiredAsset.replace('_', ' ')}</p>
                <p style="margin: 5px 0;"><strong>Reward:</strong> $${missionTypes[randomType].reward.toLocaleString()}</p>
                ${mission.status === 'active' ? '<button onclick="dispatchVehicle()" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Dispatch Vehicle</button>' : ''}
            </div>
        `;
        L.popup()
            .setLatLng([lat, lng])
            .setContent(details)
            .openOn(map);
    });
    
    mission.marker = marker;
    missions.push(mission);
    
    // Remove mission after 5 minutes if not completed
    setTimeout(() => {
        if (mission.status === 'active') {
            map.removeLayer(marker);
            missions = missions.filter(m => m !== mission);
        }
    }, 300000); // 5 minutes
}

// Start mission generation
setInterval(generateMission, 60000); // Generate new mission every minute

// Load saved state
function loadSavedState() {
    const savedState = localStorage.getItem('emergencySimState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        assets.funds = parsedState.funds;
        assets.buildings = [];
        assets.vehicles = [];
        
        // Recreate markers from saved state
        parsedState.buildings.forEach(b => {
            window.selectedAsset = b.type;
            placeAsset({ lat: b.position.lat, lng: b.position.lng });
        });
        parsedState.vehicles.forEach(v => {
            window.selectedAsset = v.type;
            placeAsset({ lat: v.position.lat, lng: v.position.lng });
        });
    }
}

// Save state
function saveState() {
    const state = {
        funds: assets.funds,
        buildings: assets.buildings.map(b => ({
            type: b.type,
            position: b.position
        })),
        vehicles: assets.vehicles.map(v => ({
            type: v.type,
            position: v.position
        }))
    };
    localStorage.setItem('emergencySimState', JSON.stringify(state));
}

// Initialize the map
function initMap() {
    map = L.map('map').setView([-33.8688, 151.2093], 13); // Sydney coordinates
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to map for placing buildings
    map.on('click', function(e) {
        if (window.selectedAsset) {
            placeAsset(e.latlng);
        }
    });
}

// Asset management
function buyAsset(type) {
    const costs = {
        ambulance_station: 500000,
        fire_station: 750000,
        police_station: 600000,
        ses_station: 450000,
        ambulance: 100000,
        fire_truck: 200000,
        police_car: 75000,
        ses_vehicle: 150000,
        ses_rescue: 175000
    };

    if (assets.funds >= costs[type]) {
        assets.funds -= costs[type];
        window.selectedAsset = type;
        alert(`Select a location on the map to place your ${type.replace('_', ' ')}`);
    } else {
        alert('Insufficient funds!');
    }
}

// Place asset on map
function placeAsset(latlng) {
    const icons = {
        ambulance_station: '🏥',
        fire_station: '🚒',
        police_station: '👮',
        ses_station: '🏗️',
        ambulance: '🚑',
        fire_truck: '🚒',
        police_car: '🚓',
        ses_vehicle: '🚛',
        ses_rescue: '🚁'
    };

    const marker = L.marker(latlng, {
        icon: L.divIcon({
            html: icons[window.selectedAsset],
            className: 'asset-icon',
            iconSize: [25, 25]
        })
    }).addTo(map);

    // Add click handler for details
    marker.on('click', () => {
        const costs = {
            ambulance_station: 500000,
            fire_station: 750000,
            police_station: 600000,
            ses_station: 450000,
            ambulance: 100000,
            fire_truck: 200000,
            police_car: 75000,
            ses_vehicle: 150000,
            ses_rescue: 175000
        };
        if (!window.selectedAsset && asset.type.indexOf('station') === -1) {
            selectedVehicle = asset;
            if (selectedMission && selectedMission.status === 'active') {
                dispatchVehicle();
            }
        }
        const details = `
            <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 10px 0; color: #333;">${asset.type.replace('_', ' ').toUpperCase()}</h3>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${asset.type.includes('station') ? 'Building' : 'Vehicle'}</p>
                <p style="margin: 5px 0;"><strong>Cost:</strong> $${costs[asset.type].toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Location:</strong> ${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4CAF50;">Active</span></p>
                ${!asset.type.includes('station') ? '<button onclick="selectVehicle(asset)" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Select Vehicle</button>' : ''}
            </div>
        `;
        L.popup()
            .setLatLng(latlng)
            .setContent(details)
            .openOn(map);
    });

    const asset = {
        type: window.selectedAsset,
        position: latlng,
        marker: marker
    };

    if (window.selectedAsset.includes('station')) {
        assets.buildings.push(asset);
    } else {
        assets.vehicles.push(asset);
    }

    window.selectedAsset = null;
    updateDisplay();
    saveState();
}

// Update display
function selectVehicle(vehicle) {
    selectedVehicle = vehicle;
    if (selectedMission && selectedMission.status === 'active') {
        dispatchVehicle();
    }
}

function dispatchVehicle() {
    if (!selectedVehicle || !selectedMission || selectedMission.status !== 'active') return;
    
    if (selectedVehicle.type !== missionTypes[selectedMission.type].requiredAsset) {
        alert('Wrong vehicle type for this mission!');
        return;
    }

    selectedMission.status = 'in_progress';
    selectedMission.assignedVehicle = selectedVehicle;

    // Complete mission after 30 seconds
    setTimeout(() => {
        selectedMission.status = 'completed';
        selectedMission.completionTime = Date.now();
        
        // Calculate reward based on response time
        const responseTime = (selectedMission.completionTime - selectedMission.createdAt) / 1000; // in seconds
        let reward = missionTypes[selectedMission.type].reward;
        if (responseTime < 60) { // Bonus for quick response
            reward *= 1.5;
        }
        
        assets.funds += reward;
        alert(`Mission completed! Earned $${reward.toLocaleString()}`);
        updateDisplay();
    }, 30000);

    selectedVehicle = null;
    selectedMission = null;
    updateDisplay();
}

function updateDisplay() {
    document.querySelector('.control-panel').innerHTML = `
        <h2>Emergency Assets (Funds: $${assets.funds.toLocaleString()})</h2>
        ${generateAssetsList()}
        <h2>Active Missions</h2>
        <div class="missions-list" style="padding: 20px;">
            ${missions.map(mission => `
                <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; background: white;">
                    <h3>${missionTypes[mission.type].icon} ${missionTypes[mission.type].description}</h3>
                    <p><strong>Location:</strong> ${mission.position.lat.toFixed(4)}, ${mission.position.lng.toFixed(4)}</p>
                    <p><strong>Required:</strong> ${missionTypes[mission.type].requiredAsset.replace('_', ' ')}</p>
                    <p><strong>Time:</strong> ${new Date(mission.createdAt).toLocaleTimeString()}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Generate assets list HTML
function generateAssetsList() {
    return `
        <div class="assets">
            <div class="asset-card">
                <h3>Ambulance Station</h3>
                <p>Cost: $500,000</p>
                <button class="buy-button" onclick="buyAsset('ambulance_station')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>Fire Station</h3>
                <p>Cost: $750,000</p>
                <button class="buy-button" onclick="buyAsset('fire_station')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>Police Station</h3>
                <p>Cost: $600,000</p>
                <button class="buy-button" onclick="buyAsset('police_station')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>Ambulance Vehicle</h3>
                <p>Cost: $100,000</p>
                <button class="buy-button" onclick="buyAsset('ambulance')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>Fire Truck</h3>
                <p>Cost: $200,000</p>
                <button class="buy-button" onclick="buyAsset('fire_truck')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>Police Car</h3>
                <p>Cost: $75,000</p>
                <button class="buy-button" onclick="buyAsset('police_car')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>SES Station</h3>
                <p>Cost: $450,000</p>
                <button class="buy-button" onclick="buyAsset('ses_station')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>SES Vehicle</h3>
                <p>Cost: $150,000</p>
                <button class="buy-button" onclick="buyAsset('ses_vehicle')">Buy</button>
            </div>
            <div class="asset-card">
                <h3>SES Rescue</h3>
                <p>Cost: $175,000</p>
                <button class="buy-button" onclick="buyAsset('ses_rescue')">Buy</button>
            </div>
        </div>
    `;
}

// Initialize when page loads
window.onload = function() {
    initMap();
    loadSavedState();
    updateDisplay();
    // Start generating missions
    generateMission(); // Generate first mission immediately
    setInterval(generateMission, 60000); // Generate new mission every minute
};
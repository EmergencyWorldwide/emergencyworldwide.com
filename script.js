let map;
let markers = [];
let funds = 1000000;
let purchasedAssets = [];
let activeMissions = [];

const assets = {
    buildings: [
        { id: 'fire_station', name: 'Fire Station', cost: 200000, icon: '🏛️', missionTypes: ['fire'] },
        { id: 'police_station', name: 'Police Station', cost: 180000, icon: '🏢', missionTypes: ['crime'] },
        { id: 'hospital', name: 'Hospital', cost: 300000, icon: '🏥', missionTypes: ['medical'] },
        { id: 'ses_station', name: 'SES Station', cost: 250000, icon: '🏗️', missionTypes: ['flood', 'storm'] }
    ],
    vehicles: [
        { id: 'fire_truck', name: 'Fire Truck', cost: 100000, icon: '🚒', missionTypes: ['fire'] },
        { id: 'police_car', name: 'Police Car', cost: 50000, icon: '🚓', missionTypes: ['crime'] },
        { id: 'ambulance', name: 'Ambulance', cost: 75000, icon: '🚑', missionTypes: ['medical'] },
        { id: 'ses_truck', name: 'SES Truck', cost: 80000, icon: '🚛', missionTypes: ['flood', 'storm'] }
    ]
};

const missionTypes = {
    fire: { icon: '🔥', name: 'Fire Emergency' },
    crime: { icon: '🚨', name: 'Crime Incident' },
    medical: { icon: '⚕️', name: 'Medical Emergency' },
    flood: { icon: '💧', name: 'Flood Emergency' },
    storm: { icon: '⛈️', name: 'Storm Emergency' }
};

// Initialize map
function initMap() {
    map = L.map('map', {
        tap: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true
    }).setView([-33.8688, 151.2093], 13); // Sydney coordinates
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', onMapClick);
    populateAssetsList();
    updateFunds();
    startMissionGeneration();
}

// Handle map clicks for asset placement
function onMapClick(e) {
    if (window.selectedAsset) {
        const asset = window.selectedAsset;
        if (funds >= asset.cost) {
            placeAsset(asset, e.latlng);
            funds -= asset.cost;
            updateFunds();
        } else {
            alert('Insufficient funds!');
        }
        window.selectedAsset = null;
    }
}

// Place asset on map
function placeAsset(asset, latlng) {
    const marker = L.marker(latlng, {
        icon: L.divIcon({
            html: asset.icon,
            className: 'asset-marker',
            iconSize: [40, 40]
        })
    }).addTo(map);

    const purchasedAsset = {
        ...asset,
        marker: marker,
        location: latlng,
        status: 'available'
    };

    purchasedAssets.push(purchasedAsset);
    markers.push(marker);

    const handleAssetInteraction = () => {
        if (purchasedAsset.status === 'available') {
            const response = confirm(`Dispatch ${asset.name} to emergency?`);
            if (response) {
                dispatchAsset(purchasedAsset);
            }
        } else {
            alert(`${asset.name} is currently ${purchasedAsset.status}`);
        }
    };

    marker.on('click', handleAssetInteraction);
    marker.on('touchend', (e) => {
        L.DomEvent.preventDefault(e);
        handleAssetInteraction();
    });
}

// Generate missions periodically
function startMissionGeneration() {
    setInterval(generateMission, 60000); // Generate mission every minute
}

function generateMission() {
    const buildings = purchasedAssets.filter(asset => assets.buildings.some(b => b.id === asset.id));
    if (buildings.length === 0) return;

    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const missionType = building.missionTypes[Math.floor(Math.random() * building.missionTypes.length)];
    const missionInfo = missionTypes[missionType];

    // Generate mission within 1km of the building
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 1000; // Up to 1km
    const missionLat = building.location.lat + (distance * Math.cos(angle) / 111111);
    const missionLng = building.location.lng + (distance * Math.sin(angle) / (111111 * Math.cos(building.location.lat)));

    const missionMarker = L.marker([missionLat, missionLng], {
        icon: L.divIcon({
            html: missionInfo.icon,
            className: 'mission-marker',
            iconSize: [30, 30]
        })
    }).addTo(map);

    const mission = {
        type: missionType,
        location: { lat: missionLat, lng: missionLng },
        marker: missionMarker,
        status: 'active',
        building: building
    };

    activeMissions.push(mission);
    missionMarker.bindPopup(`${missionInfo.name} near ${building.name}`);

    // Remove mission after 5 minutes if not responded to
    setTimeout(() => {
        if (mission.status === 'active') {
            mission.marker.remove();
            activeMissions = activeMissions.filter(m => m !== mission);
        }
    }, 300000);
}

// Dispatch asset to emergency
function dispatchAsset(asset) {
    const availableMissions = activeMissions.filter(m => 
        m.status === 'active' && 
        asset.missionTypes.includes(m.type)
    );

    if (availableMissions.length === 0) {
        alert('No suitable missions available!');
        return;
    }

    const mission = availableMissions[0];
    asset.status = 'responding';
    asset.marker.setOpacity(0.5);
    mission.status = 'responding';
    
    // Draw response line
    const line = L.polyline([asset.location, mission.location], {
        color: '#ff0000',
        dashArray: '10, 10'
    }).addTo(map);

    // Simulate response time
    setTimeout(() => {
        asset.status = 'available';
        asset.marker.setOpacity(1);
        mission.marker.remove();
        line.remove();
        activeMissions = activeMissions.filter(m => m !== mission);
    }, 10000); // 10 seconds response time
}

// Update available funds display
function updateFunds() {
    document.getElementById('funds').textContent = `Available Funds: $${funds.toLocaleString()}`;
}

// Populate assets list in sidebar
function populateAssetsList() {
    const assetsList = document.getElementById('assets-list');
    
    // Add buildings
    const buildingsSection = document.createElement('div');
    buildingsSection.innerHTML = '<h4>Buildings</h4>';
    assets.buildings.forEach(asset => {
        buildingsSection.appendChild(createAssetElement(asset));
    });
    assetsList.appendChild(buildingsSection);

    // Add vehicles
    const vehiclesSection = document.createElement('div');
    vehiclesSection.innerHTML = '<h4>Vehicles</h4>';
    assets.vehicles.forEach(asset => {
        vehiclesSection.appendChild(createAssetElement(asset));
    });
    assetsList.appendChild(vehiclesSection);
}

// Create asset element for sidebar
function createAssetElement(asset) {
    const div = document.createElement('div');
    div.className = 'asset-item';
    const button = document.createElement('button');
    button.textContent = 'Purchase';
    button.dataset.assetId = asset.id;
    button.dataset.assetType = asset.cost >= 150000 ? 'buildings' : 'vehicles';
    button.onclick = () => {
        const assetType = button.dataset.assetType;
        const assetId = button.dataset.assetId;
        const selectedAsset = assets[assetType].find(a => a.id === assetId);
        selectAsset(selectedAsset);
    };
    div.innerHTML = `
        ${asset.icon} ${asset.name}<br>
        Cost: $${asset.cost.toLocaleString()}
    `;
    div.appendChild(button);
    return div;
}

// Select asset for placement
function selectAsset(asset) {
    if (funds >= asset.cost) {
        window.selectedAsset = asset;
        alert(`Click on the map to place ${asset.name}`);
    } else {
        alert('Insufficient funds!');
    }
}

// Initialize the map when the page loads
window.onload = initMap;
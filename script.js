// Game state
let gameState = {
    budget: 1000000,
    buildings: [],
    vehicles: [],
    missions: [],
    selectedItem: null,
    selectedItemType: null
};

// Initialize map centered on Australia
const map = L.map('map').setView([-25.2744, 133.7751], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Building and vehicle costs
const COSTS = {
    fireStation: 500000,
    ambulanceStation: 300000,
    fireTruck: 200000,
    ambulance: 100000
};

// Australian cities for mission spawns
const CITIES = [
    { name: "Sydney", lat: -33.8688, lng: 151.2093 },
    { name: "Melbourne", lat: -37.8136, lng: 144.9631 },
    { name: "Brisbane", lat: -27.4698, lng: 153.0251 },
    { name: "Perth", lat: -31.9505, lng: 115.8605 },
    { name: "Adelaide", lat: -34.9285, lng: 138.6007 }
];

// Item selection
function selectBuilding(type) {
    gameState.selectedItem = type;
    gameState.selectedItemType = 'building';
}

function selectVehicle(type) {
    gameState.selectedItem = type;
    gameState.selectedItemType = 'vehicle';
}

// Place items on map
map.on('click', function(e) {
    if (!gameState.selectedItem) return;

    const cost = COSTS[gameState.selectedItem];
    if (gameState.budget < cost) {
        alert("Not enough budget!");
        return;
    }

    const item = {
        type: gameState.selectedItem,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        id: Date.now()
    };

    if (gameState.selectedItemType === 'building') {
        const icon = L.divIcon({
            className: 'building-icon',
            html: gameState.selectedItem === 'fireStation' ? '🚒' : '🚑',
            iconSize: [30, 30]
        });
        L.marker([item.lat, item.lng], { icon }).addTo(map);
        gameState.buildings.push(item);
    } else {
        const icon = L.divIcon({
            className: 'vehicle-icon',
            html: gameState.selectedItem === 'fireTruck' ? '🚒' : '🚑',
            iconSize: [25, 25]
        });
        L.marker([item.lat, item.lng], { icon }).addTo(map);
        gameState.vehicles.push(item);
    }

    gameState.budget -= cost;
    updateUI();
    saveGame();
});

// Mission generation
function generateMission() {
    if (gameState.buildings.length === 0) return;

    const nearestBuilding = gameState.buildings[Math.floor(Math.random() * gameState.buildings.length)];
    const missionTypes = ['Fire', 'Medical Emergency', 'Rescue'];
    const mission = {
        type: missionTypes[Math.floor(Math.random() * missionTypes.length)],
        lat: nearestBuilding.lat + (Math.random() - 0.5) * 0.1,
        lng: nearestBuilding.lng + (Math.random() - 0.5) * 0.1,
        id: Date.now()
    };

    const icon = L.divIcon({
        className: 'mission-icon',
        html: mission.type === 'Fire' ? '🔥' : '⚕️',
        iconSize: [20, 20]
    });
    L.marker([mission.lat, mission.lng], { icon }).addTo(map);

    gameState.missions.push(mission);
    updateMissionLog(mission);
}

// Update UI
function updateUI() {
    document.getElementById('budget').textContent = gameState.budget.toLocaleString();
    document.getElementById('activeMissions').textContent = gameState.missions.length;
}

// Mission log
function updateMissionLog(mission) {
    const missionList = document.getElementById('missionList');
    const missionItem = document.createElement('div');
    missionItem.className = 'list-group-item';
    missionItem.textContent = `${mission.type} near (${mission.lat.toFixed(2)}, ${mission.lng.toFixed(2)})`;
    missionList.prepend(missionItem);
}

// Save/Load game
function saveGame() {
    localStorage.setItem('aussieFireChief', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('aussieFireChief');
    if (saved) {
        gameState = JSON.parse(saved);
        updateUI();
        
        // Restore buildings and vehicles on map
        gameState.buildings.forEach(building => {
            const icon = L.divIcon({
                className: 'building-icon',
                html: building.type === 'fireStation' ? '🚒' : '🚑',
                iconSize: [30, 30]
            });
            L.marker([building.lat, building.lng], { icon }).addTo(map);
        });

        gameState.vehicles.forEach(vehicle => {
            const icon = L.divIcon({
                className: 'vehicle-icon',
                html: vehicle.type === 'fireTruck' ? '🚒' : '🚑',
                iconSize: [25, 25]
            });
            L.marker([vehicle.lat, vehicle.lng], { icon }).addTo(map);
        });
    }
}

// Start game
loadGame();
setInterval(generateMission, 60000); // Generate new mission every minute
setInterval(saveGame, 30000); // Auto-save every 30 seconds

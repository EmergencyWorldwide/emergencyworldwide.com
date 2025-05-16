let map;
let vehicles = [];
let buildings = [];
let missions = [];
let leaderboard = [];
let selectedItem = null; // To store the selected item for placement

function initMap() {
    // Initialize the map and set the view to a default location (San Francisco)
    map = L.map('map').setView([37.7749, -122.4194], 13);

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Handle tile load error
    map.on('tileerror', function (error) {
        console.error('Tile error:', error);
        alert('Error loading map tiles. Please check your internet connection.');
    });

    loadGameData();
    loadLeaderboard(); // Load leaderboard data on map initialization

    // Add click event to the map for placing vehicles/buildings
    map.on('click', function (e) {
        if (selectedItem) {
            placeItemOnMap(selectedItem, e.latlng);
        }
    });
}

function buyVehicle(vehicleType) {
    vehicles.push(vehicleType);
    alert(vehicleType + ' purchased!');
    saveGameData(); // Save data after purchase
}

function buyBuilding(buildingType) {
    buildings.push(buildingType);
    alert(buildingType + ' purchased!');
    saveGameData(); // Save data after purchase
}

function selectItem(itemType) {
    selectedItem = itemType;
    alert(itemType + ' selected. Click on the map to place it.');
}

function placeItemOnMap(itemType, latlng) {
    let marker;
    if (itemType.includes('ambulance') || itemType.includes('firetruck')) {
        marker = L.marker(latlng).addTo(map).bindPopup(itemType);
    } else {
        // Assuming buildings have a different icon (you can change the icon URL)
        marker = L.marker(latlng, { icon: L.icon({ iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Building_icon.svg', iconSize: [32, 32] }) }).addTo(map).bindPopup(itemType);
    }
    marker.openPopup();
}

function createMission(missionName) {
    missions.push(missionName);
    document.getElementById('missionList').innerHTML += `<div>${missionName}</div>`;
    saveGameData(); // Save data after creating a mission
}

// Save and load functions
function saveGameData() {
    localStorage.setItem('dial911GameData', JSON.stringify({ vehicles, buildings, missions }));
}

function loadGameData() {
    const savedData = localStorage.getItem('dial911GameData');
    if (savedData) {
        const data = JSON.parse(savedData);
        vehicles = data.vehicles || [];
        buildings = data.buildings || [];
        missions = data.missions || [];
        updateMissionList();
    }
}

function updateMissionList() {
    const missionListDiv = document.getElementById('missionList');
    missionListDiv.innerHTML = ''; // Clear existing missions
    missions.forEach(mission => {
        missionListDiv.innerHTML += `<div>${mission}</div>`;
    });
}

// Leaderboard Functions
function saveLeaderboard() {
    localStorage.setItem('dial911Leaderboard', JSON.stringify(leaderboard));
}

function loadLeaderboard() {
    const savedLeaderboard = localStorage.getItem('dial911Leaderboard');
    if (savedLeaderboard) {
        leaderboard = JSON.parse(savedLeaderboard);
        updateLeaderboardDisplay();
    }
}

function updateLeaderboardDisplay() {
    const leaderboardDiv = document.getElementById('leaderboard');
    leaderboardDiv.innerHTML = ''; // Clear existing leaderboard
    leaderboard.forEach(entry => {
        leaderboardDiv.innerHTML += `<div>${entry.name}: ${entry.score}</div>`;
    });
}

function addToLeaderboard(name, score) {
    leaderboard.push({ name: name, score: score });
    saveLeaderboard();
    updateLeaderboardDisplay();
}

// Call this function when a mission is completed
function completeMission(missionName) {
    // Assume each mission gives a score of 10
    addToLeaderboard('Player', 10); // Replace 'Player' with the actual player's name
}

// Initialize the map when the window loads
window.onload = initMap;
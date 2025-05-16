let map;
let vehicles = [];
let buildings = [];
let missions = [];

// Set default location in America (New York City)
const defaultLocation = [40.7128, -74.0060]; // Latitude and Longitude of NYC

function initMap() {
    map = L.map('map').setView(defaultLocation, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    loadGameData(); // Load saved data on map initialization
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

function createMission(missionName) {
    missions.push(missionName);
    document.getElementById('missionList').innerHTML += `<div>${missionName}</div>`;
    saveGameData(); // Save data after creating a mission
}

function saveGameData() {
    const gameData = {
        vehicles: vehicles,
        buildings: buildings,
        missions: missions
    };
    localStorage.setItem('dial911SimulatorData', JSON.stringify(gameData));
}

function loadGameData() {
    const savedData = localStorage.getItem('dial911SimulatorData');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        vehicles = gameData.vehicles || [];
        buildings = gameData.buildings || [];
        missions = gameData.missions || [];
        
        // Update the mission list display
        document.getElementById('missionList').innerHTML = missions.map(m => `<div>${m}</div>`).join('');
    }
}

window.onload = initMap;
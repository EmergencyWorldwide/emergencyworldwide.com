let map;
let buildings = [];
let vehicles = [];
let isPlacingBuilding = false;
let buildingType = null;

function initMap() {
    try {
        map = L.map('map', {
            center: [-33.8688, 151.2093], // Sydney, Australia
            zoom: 13
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add building markers
        buildings.forEach(building => {
            addBuildingMarker(building);
        });

        // Add vehicle markers
        vehicles.forEach(vehicle => {
            addVehicleMarker(vehicle);
        });

        // Handle building placement
        map.on('click', handleMapClick);

        // Listen for messages from buildings.js
        window.addEventListener('message', handleMessage);
    } catch (error) {
        console.error('Error initializing map:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = 'Error initializing map. Please refresh the page.';
        document.getElementById('map').appendChild(errorDiv);
    }
}

function handleMapClick(e) {
    if (isPlacingBuilding) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Send building placement data to buildings.js
        window.parent.postMessage({
            type: 'buildingPlaced',
            data: {
                lat: lat,
                lng: lng
            }
        }, '*');
    }
}

function handleMessage(event) {
    const message = event.data;
    
    switch(message.type) {
        case 'enableBuildingPlacement':
            isPlacingBuilding = true;
            buildingType = message.data;
            break;
        case 'disableBuildingPlacement':
            isPlacingBuilding = false;
            buildingType = null;
            break;
        case 'addBuildingMarker':
            const building = message.data;
            addBuildingMarker(building);
            buildings.push(building);
            break;
        case 'budgetUpdate':
            // Update budget display if we have it
            const budgetDisplay = document.querySelector('.budget-info p span');
            if (budgetDisplay) {
                budgetDisplay.textContent = message.data;
            }
            break;
    }
}

function addBuildingMarker(building) {
    const marker = L.marker([building.lat, building.lng]).addTo(map);
    marker.bindPopup(`
        <h5>${building.type}</h5>
        <p>Capacity: ${building.capacity}</p>
        <p>Vehicles: ${building.vehicles.length}</p>
    `);
}

function addVehicleMarker(vehicle) {
    const icon = L.icon({
        iconUrl: getVehicleIcon(vehicle.type),
        iconSize: [32, 32]
    });
    
    const marker = L.marker([vehicle.lat, vehicle.lng], {icon: icon}).addTo(map);
    marker.bindPopup(`
        <h5>${vehicle.type}</h5>
        <p>Status: ${vehicle.status}</p>
    `);
}

function getVehicleIcon(type) {
    switch(type) {
        case 'fire_truck':
            return 'icons/fire_truck.png';
        case 'ambulance':
            return 'icons/ambulance.png';
        case 'police_car':
            return 'icons/police_car.png';
        default:
            return 'icons/default_vehicle.png';
    }
}

function showBuildingMenu() {
    // Implementation for showing building purchase menu
    // This would typically open a modal or sidebar
}

function showVehicleMenu() {
    // Implementation for showing vehicle purchase menu
    // This would typically open a modal or sidebar
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', initMap);

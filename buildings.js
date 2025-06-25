let ownedBuildings = [];

// Import budget functions
const { getBudget, updateBudget } = window.parent.budget;

// Listen for budget updates
window.addEventListener('message', (event) => {
    if (event.data.type === 'budgetUpdate') {
        const budgetDisplay = document.querySelector('.budget-info span');
        if (budgetDisplay) {
            budgetDisplay.textContent = event.data.data;
        }
    }
});

function getBudget() {
    return getBudget();
}

let selectedBuildingType = null;

function purchaseBuilding(type) {
    const buildingCosts = {
        'fire_station': 50000,
        'ambulance_station': 45000,
        'police_station': 60000
    };

    const cost = buildingCosts[type];
    
    // Check budget
    const currentBudget = getBudget();
    if (currentBudget < cost) {
        const message = document.createElement('div');
        message.className = 'alert alert-danger';
        message.innerHTML = `
            <strong>Insufficient Funds!</strong> You need $${(cost - currentBudget).toLocaleString()} more to purchase ${type}.
        `;
        document.body.appendChild(message);
        setTimeout(() => {
            message.remove();
        }, 3000);
        return;
    }

    // Update budget
    const success = updateBudget(-cost, `Purchased ${type}`);
    if (!success) {
        const message = document.createElement('div');
        message.className = 'alert alert-danger';
        message.innerHTML = `
            <strong>Purchase Failed!</strong> Please try again.
        `;
        document.body.appendChild(message);
        setTimeout(() => {
            message.remove();
        }, 3000);
        return;
    }
    
    // Add building to owned buildings
    const building = {
        type: type,
        cost: cost,
        capacity: getBuildingCapacity(type),
        vehicles: [],
        status: 'unplaced'
    };
    ownedBuildings.push(building);
    
    // Show building in list
    addBuildingToDisplay(building);
    
    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'alert alert-success';
    successMessage.innerHTML = `
        Successfully purchased ${type} for $${cost.toLocaleString()}!
        <p class="small">Current budget: ${getBudget().toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</p>
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
    
    // Show placement instructions
    const instructions = document.createElement('div');
    instructions.className = 'alert alert-info';
    instructions.innerHTML = `
        <strong>Select Location:</strong> Click on the map to place your ${type}.
        <button class="btn btn-sm btn-danger" onclick="cancelPlacement(this)">Cancel</button>
    `;
    document.body.appendChild(instructions);
    
    // Enable building placement mode
    selectedBuildingType = type;
    enableBuildingPlacement();
}

function enableBuildingPlacement() {
    // Send message to map.js to enable building placement mode
    window.parent.postMessage({
        type: 'enableBuildingPlacement',
        data: selectedBuildingType
    }, '*');
    
    // Add event listener for building placement
    window.addEventListener('message', (event) => {
        if (event.data.type === 'buildingPlaced') {
            const { lat, lng } = event.data.data;
            placeBuilding(lat, lng);
        }
    });
}

function cancelPlacement() {
    selectedBuildingType = null;
    // Remove placement instructions
    const instructions = document.querySelector('.alert');
    if (instructions) {
        instructions.remove();
    }
    // Send message to map.js to disable placement mode
    window.parent.postMessage({
        type: 'disableBuildingPlacement',
        data: null
    }, '*');
}

function placeBuilding(lat, lng) {
    if (selectedBuildingType) {
        const building = {
            type: selectedBuildingType,
            cost: buildingCosts[selectedBuildingType],
            capacity: getBuildingCapacity(selectedBuildingType),
            vehicles: [],
            lat: lat,
            lng: lng
        };
        ownedBuildings.push(building);
        addBuildingToDisplay(building);
        
        // Send building data to map.js
        window.parent.postMessage({
            type: 'addBuildingMarker',
            data: building
        }, '*');
        
        cancelPlacement();
    }
}

function getBuildingCapacity(type) {
    const capacities = {
        'fire_station': 10,
        'ambulance_station': 8,
        'police_station': 12
    };
    return capacities[type];
}

function addBuildingToDisplay(building) {
    const buildingDiv = document.createElement('div');
    buildingDiv.className = 'col-md-6';
    buildingDiv.innerHTML = `
        <div class="building-info">
            <h5>${building.type}</h5>
            <p>Capacity: ${building.capacity}</p>
            <p>Vehicles: ${building.vehicles.length}</p>
            <button class="btn btn-success" onclick="addVehicleToBuilding('${building.type}')">Add Vehicle</button>
        </div>
    `;
    document.getElementById('ownedBuildings').appendChild(buildingDiv);
}

function addVehicleToBuilding(buildingType) {
    // Implementation for adding vehicles to buildings
    // This would typically open a modal to select vehicle type
    alert('Select vehicle type to add to ' + buildingType);
}

function updateBudgetDisplay() {
    document.getElementById('budgetAmount').textContent = budget;
}

// Initialize budget display
document.addEventListener('DOMContentLoaded', () => {
    updateBudgetDisplay();
});

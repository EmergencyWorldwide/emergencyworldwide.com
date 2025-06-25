let ownedVehicles = [];

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

function purchaseVehicle(type) {
    const vehicleCosts = {
        'tanker_class_1': 150000,
        'ambulance': 80000,
        'police_car': 50000
    };

    const cost = vehicleCosts[type];
    
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
    
    // Add vehicle to owned vehicles
    const vehicle = {
        type: type,
        cost: cost,
        capacity: getVehicleCapacity(type),
        status: 'available'
    };
    ownedVehicles.push(vehicle);
    
    // Show vehicle in list
    addVehicleToDisplay(vehicle);
    
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
    
    // Update building capacity if needed
    updateBuildingCapacity(vehicle);
}

function updateBuildingCapacity(vehicle) {
    // Find a building that can accommodate this vehicle
    const compatibleBuildings = ownedBuildings.filter(building => {
        return building.capacity > building.vehicles.length;
    });
    
    if (compatibleBuildings.length > 0) {
        // Add vehicle to the first compatible building
        compatibleBuildings[0].vehicles.push(vehicle);
        vehicle.status = 'assigned';
        vehicle.assignedBuilding = compatibleBuildings[0];
        
        // Update building display
        updateBuildingDisplay(compatibleBuildings[0]);
    }
}

function updateBuildingDisplay(building) {
    // Find and update the building's display element
    const buildingElement = document.querySelector(`.building-info[data-id="${building.type}"]`);
    if (buildingElement) {
        const vehiclesCount = building.vehicles.length;
        const capacity = building.capacity;
        const vehiclesSpan = buildingElement.querySelector('.vehicles-count');
        if (vehiclesSpan) {
            vehiclesSpan.textContent = `${vehiclesCount}/${capacity}`;
        }
    }
}

function getVehicleCapacity(type) {
    const capacities = {
        'tanker_class_1': 4,
        'ambulance': 2,
        'police_car': 2
    };
    return capacities[type];
}

function addVehicleToDisplay(vehicle) {
    const vehicleDiv = document.createElement('div');
    vehicleDiv.className = 'col-md-6';
    vehicleDiv.innerHTML = `
        <div class="vehicle-info">
            <h5>${vehicle.type}</h5>
            <p>Cost: $${vehicle.cost}</p>
            <p>Capacity: ${vehicle.capacity}</p>
            <p>Status: ${vehicle.status}</p>
        </div>
    `;
    document.getElementById('ownedVehicles').appendChild(vehicleDiv);
}

function updateBudgetDisplay() {
    // Update budget display on the main page
    // This would typically involve communication with the main page
    // For now, we'll just update the local budget
    console.log('Budget updated:', budget);
}

// Initialize budget display
document.addEventListener('DOMContentLoaded', () => {
    updateBudgetDisplay();
});

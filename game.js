// Game state
let gameState = {
    budget: 1000000,
    buildings: [],
    vehicles: [],
    missions: [],
    selectedType: null,
    selectedItem: null,
    refundMode: false,
    totalRewards: 0,
    trainingBonus: 0
};

// Initialize map centered on Australia
const map = L.map('map').setView([-25.2744, 133.7751], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

// Prices and rewards
const PRICES = {
    firestation: 200000,
    hospital: 500000,
    training: 150000,
    firetruck: 100000,
    heavypumper: 150000,
    ambulance: 80000
};

const REWARDS = {
    Fire: 75000,
    'Medical Emergency': 50000
};

// Building and vehicle details
const DETAILS = {
    firestation: {
        name: 'Fire Station',
        description: 'Base for fire trucks and firefighters',
        capacity: '4 vehicles',
        staff: '20 firefighters',
        response: 'Fire emergencies',
        assignedVehicles: []
    },
    hospital: {
        name: 'Hospital',
        description: 'Medical emergency center',
        capacity: '6 vehicles',
        staff: '50 medical staff',
        response: 'Medical emergencies',
        assignedVehicles: []
    },
    training: {
        name: 'Training Ground',
        description: 'Facility for training emergency responders',
        capacity: '30 trainees',
        bonus: '+10% mission rewards',
        training: 'Both medical and fire response'
    },
    firetruck: {
        name: 'Fire Truck',
        description: 'Standard fire response vehicle',
        crew: '4-6 firefighters',
        equipment: 'Water tank, hoses, ladders',
        response: 'Fire emergencies',
        station: 'Unassigned'
    },
    heavypumper: {
        name: 'TFS Heavy Pumper',
        description: 'Advanced firefighting vehicle with high-capacity pump',
        crew: '5-7 firefighters',
        equipment: 'Large water tank, high-pressure pump, rescue equipment',
        response: 'Major fire emergencies',
        station: 'Unassigned'
    },
    ambulance: {
        name: 'Ambulance',
        description: 'Emergency medical response vehicle',
        crew: '2-3 paramedics',
        equipment: 'Medical supplies, stretcher',
        response: 'Medical emergencies',
        station: 'Unassigned'
    }
};

// Australian cities for mission spawns
const CITIES = [
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
    { name: 'Perth', lat: -31.9505, lng: 115.8605 },
    { name: 'Adelaide', lat: -34.9285, lng: 138.6007 }
];

// Custom mission markers
const MISSION_ICONS = {
    Fire: L.divIcon({
        className: 'mission-marker',
        html: '<div style="font-size: 24px; color: red;">🔥</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }),
    'Medical Emergency': L.divIcon({
        className: 'mission-marker',
        html: '<div style="font-size: 24px;">🚑</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    })
};

// Building icons
const BUILDING_ICONS = {
    firestation: L.divIcon({
        className: 'building-marker',
        html: '<div style="font-size: 24px;">🚒</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }),
    hospital: L.divIcon({
        className: 'building-marker',
        html: '<div style="font-size: 24px;">🏥</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }),
    training: L.divIcon({
        className: 'building-marker',
        html: '<div style="font-size: 24px;">🎯</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    })
};

// Vehicle assignment modal
const assignmentModal = new bootstrap.Modal(document.getElementById('assignmentModal'));
let vehicleToAssign = null;

// Selection handlers
function selectBuilding(type) {
    gameState.selectedType = 'building';
    gameState.selectedItem = type;
    gameState.refundMode = false;
}

function selectVehicle(type) {
    gameState.selectedType = 'vehicle';
    gameState.selectedItem = type;
    gameState.refundMode = false;
}

function unselectItem() {
    gameState.selectedType = null;
    gameState.selectedItem = null;
    gameState.refundMode = false;
}

function toggleRefundMode() {
    gameState.refundMode = !gameState.refundMode;
    gameState.selectedType = null;
    gameState.selectedItem = null;
}

// Show assignment modal
function showAssignmentModal(vehicle) {
    vehicleToAssign = vehicle;
    const stationList = document.getElementById('stationList');
    stationList.innerHTML = '';

    const appropriateStations = gameState.buildings.filter(b => 
        (vehicle.type === 'ambulance' && b.type === 'hospital') ||
        ((vehicle.type === 'firetruck' || vehicle.type === 'heavypumper') && b.type === 'firestation')
    );

    appropriateStations.forEach(station => {
        const assignedCount = station.assignedVehicles ? station.assignedVehicles.length : 0;
        const maxCapacity = station.type === 'hospital' ? 6 : 4;
        
        const button = document.createElement('button');
        button.className = 'list-group-item list-group-item-action';
        button.innerHTML = `${DETAILS[station.type].name} (${assignedCount}/${maxCapacity} vehicles)`;
        
        if (assignedCount >= maxCapacity) {
            button.disabled = true;
            button.classList.add('disabled');
        } else {
            button.onclick = () => assignVehicleToStation(vehicle, station);
        }
        
        stationList.appendChild(button);
    });

    assignmentModal.show();
}

// Assign vehicle to station
function assignVehicleToStation(vehicle, station) {
    // Remove from previous station if any
    if (vehicle.assignedStation) {
        const oldStation = gameState.buildings.find(b => b === vehicle.assignedStation);
        if (oldStation && oldStation.assignedVehicles) {
            oldStation.assignedVehicles = oldStation.assignedVehicles.filter(v => v !== vehicle);
        }
    }

    // Assign to new station
    vehicle.assignedStation = station;
    if (!station.assignedVehicles) station.assignedVehicles = [];
    station.assignedVehicles.push(vehicle);

    // Update vehicle details
    vehicle.details.station = DETAILS[station.type].name;

    assignmentModal.hide();
    showDetails(vehicle.type, vehicle);
    saveGame();
}

// Show details for an item
function showDetails(type, item) {
    const details = DETAILS[type];
    if (!details) return;

    const detailsContent = document.getElementById('details-content');
    let html = `<h5>${details.name}</h5>
                <p>${details.description}</p>
                <ul class="list-unstyled">`;
    
    for (const [key, value] of Object.entries(details)) {
        if (key !== 'name' && key !== 'description' && key !== 'assignedVehicles') {
            html += `<li><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</li>`;
        }
    }

    if (type === 'firestation' || type === 'hospital') {
        const assignedVehicles = item.assignedVehicles || [];
        html += `<li><strong>Assigned Vehicles:</strong> ${assignedVehicles.length}</li>`;
        assignedVehicles.forEach(vehicle => {
            html += `<li>- ${DETAILS[vehicle.type].name}</li>`;
        });
    }

    if (type === 'firetruck' || type === 'heavypumper' || type === 'ambulance') {
        html += `<button class="btn btn-sm btn-primary mt-2" onclick="showAssignmentModal(${JSON.stringify(item)})">
                    Assign to Station
                </button>`;
    }

    html += '</ul>';
    detailsContent.innerHTML = html;
}

// Place or remove item on map
map.on('click', function(e) {
    if (gameState.refundMode) {
        handleRefund(e.latlng);
        return;
    }

    if (!gameState.selectedItem) return;

    const price = PRICES[gameState.selectedItem];
    if (gameState.budget < price) {
        alert('Not enough budget!');
        return;
    }

    const position = { lat: e.latlng.lat, lng: e.latlng.lng };
    
    if (gameState.selectedType === 'building') {
        const marker = L.marker(position, {
            icon: BUILDING_ICONS[gameState.selectedItem]
        }).addTo(map);
        
        const building = {
            type: gameState.selectedItem,
            position: position,
            marker: marker,
            assignedVehicles: []
        };
        
        marker.on('click', () => showDetails(building.type, building));
        gameState.buildings.push(building);
        
        if (gameState.selectedItem === 'training') {
            gameState.trainingBonus += 0.1;
        }
    } else {
        const marker = L.circleMarker(position, {
            radius: 8,
            fillColor: gameState.selectedItem === 'ambulance' ? 'white' : 'red',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);
        
        const vehicle = {
            type: gameState.selectedItem,
            position: position,
            marker: marker,
            details: { ...DETAILS[gameState.selectedItem] }
        };
        
        marker.on('click', () => showDetails(vehicle.type, vehicle));
        gameState.vehicles.push(vehicle);
    }

    gameState.budget -= price;
    updateBudget();
    saveGame();
});

// Handle refund of items
function handleRefund(latlng) {
    const radius = 0.1;
    let refunded = false;

    // Check buildings
    for (let i = gameState.buildings.length - 1; i >= 0; i--) {
        const building = gameState.buildings[i];
        if (isNearby(building.position, latlng, radius)) {
            // Reassign vehicles if it's a station
            if (building.assignedVehicles) {
                building.assignedVehicles.forEach(vehicle => {
                    if (vehicle.details) {
                        vehicle.details.station = 'Unassigned';
                    }
                    vehicle.assignedStation = null;
                });
            }

            gameState.budget += PRICES[building.type];
            building.marker.remove();
            
            if (building.type === 'training') {
                gameState.trainingBonus -= 0.1;
            }
            
            gameState.buildings.splice(i, 1);
            refunded = true;
            break;
        }
    }

    // Check vehicles
    if (!refunded) {
        for (let i = gameState.vehicles.length - 1; i >= 0; i--) {
            const vehicle = gameState.vehicles[i];
            if (isNearby(vehicle.position, latlng, radius)) {
                // Remove from assigned station
                if (vehicle.assignedStation) {
                    vehicle.assignedStation.assignedVehicles = 
                        vehicle.assignedStation.assignedVehicles.filter(v => v !== vehicle);
                }

                gameState.budget += PRICES[vehicle.type];
                vehicle.marker.remove();
                gameState.vehicles.splice(i, 1);
                refunded = true;
                break;
            }
        }
    }

    if (refunded) {
        updateBudget();
        saveGame();
    }
}

// Helper function to check if a point is nearby
function isNearby(pos1, pos2, radius) {
    const dx = pos1.lng - pos2.lng;
    const dy = pos1.lat - pos2.lat;
    return dx * dx + dy * dy < radius * radius;
}

// Generate missions near buildings
function generateMission() {
    // Get all valid mission locations (buildings)
    const validLocations = gameState.buildings.filter(b => 
        b.type === 'firestation' || b.type === 'hospital'
    );

    if (validLocations.length === 0) return; // No valid locations for missions

    const selectedBuilding = validLocations[Math.floor(Math.random() * validLocations.length)];
    const missionTypes = ['Fire', 'Medical Emergency'];
    const missionType = missionTypes[Math.floor(Math.random() * missionTypes.length)];
    
    // Generate mission within 1 degree (roughly 111km) of the selected building
    const mission = {
        type: missionType,
        location: {
            lat: selectedBuilding.position.lat + (Math.random() - 0.5) * 2,
            lng: selectedBuilding.position.lng + (Math.random() - 0.5) * 2
        },
        city: findNearestCity(selectedBuilding.position),
        active: true
    };

    // Create marker with custom icon
    mission.marker = L.marker([mission.location.lat, mission.location.lng], {
        icon: MISSION_ICONS[missionType]
    }).addTo(map);

    gameState.missions.push(mission);
    updateMissionsList();
}

// Find nearest city to a position
function findNearestCity(position) {
    let nearestCity = CITIES[0];
    let shortestDist = getDistance(position, CITIES[0]);

    CITIES.forEach(city => {
        const dist = getDistance(position, city);
        if (dist < shortestDist) {
            shortestDist = dist;
            nearestCity = city;
        }
    });

    return nearestCity.name;
}

// Update missions display
function updateMissionsList() {
    const missionsList = document.getElementById('missions-list');
    missionsList.innerHTML = gameState.missions
        .filter(mission => mission.active)
        .map(mission => {
            const baseReward = REWARDS[mission.type];
            const totalReward = Math.round(baseReward * (1 + gameState.trainingBonus));
            return `
                <div class="mission-alert">
                    ${mission.type} near ${mission.city}
                    <div class="text-success">Reward: $${totalReward.toLocaleString()}</div>
                    <button class="btn btn-sm btn-primary float-end" onclick="dispatchToMission(${mission.location.lat}, ${mission.location.lng})">
                        Dispatch
                    </button>
                </div>
            `;
        }).join('');
}

// Dispatch to mission
function dispatchToMission(lat, lng) {
    const radius = 0.5;
    const targetPos = { lat, lng };
    
    const mission = gameState.missions.find(m => 
        isNearby(m.location, targetPos, 0.1) && m.active
    );

    if (!mission) return;

    const vehicleType = mission.type === 'Fire' ? ['firetruck', 'heavypumper'] : ['ambulance'];
    let nearestVehicle = null;
    let shortestDist = Infinity;

    gameState.vehicles.forEach(vehicle => {
        if (vehicleType.includes(vehicle.type)) {
            const dist = getDistance(vehicle.position, targetPos);
            if (dist < shortestDist) {
                shortestDist = dist;
                nearestVehicle = vehicle;
            }
        }
    });

    if (nearestVehicle) {
        // Animate vehicle movement
        const startPos = nearestVehicle.position;
        const steps = 20;
        let step = 0;

        const animate = () => {
            if (step <= steps) {
                const progress = step / steps;
                const newLat = startPos.lat + (targetPos.lat - startPos.lat) * progress;
                const newLng = startPos.lng + (targetPos.lng - startPos.lng) * progress;
                nearestVehicle.marker.setLatLng([newLat, newLng]);
                nearestVehicle.position = { lat: newLat, lng: newLng };
                step++;
                setTimeout(animate, 50);
            } else {
                // Complete mission and give reward
                mission.active = false;
                mission.marker.remove();
                const baseReward = REWARDS[mission.type];
                const totalReward = Math.round(baseReward * (1 + gameState.trainingBonus));
                gameState.budget += totalReward;
                gameState.totalRewards += totalReward;
                updateBudget();
                updateMissionsList();
                saveGame();
                
                // Return vehicle to original position after delay
                setTimeout(() => {
                    const returnAnimate = () => {
                        if (step > 0) {
                            const progress = step / steps;
                            const newLat = targetPos.lat + (startPos.lat - targetPos.lat) * (1 - progress);
                            const newLng = targetPos.lng + (startPos.lng - targetPos.lng) * (1 - progress);
                            nearestVehicle.marker.setLatLng([newLat, newLng]);
                            nearestVehicle.position = { lat: newLat, lng: newLng };
                            step--;
                            setTimeout(returnAnimate, 50);
                        }
                    };
                    step = steps;
                    returnAnimate();
                }, 2000);
            }
        };
        animate();
    } else {
        alert('No available ' + (mission.type === 'Fire' ? 'fire truck or heavy pumper' : 'ambulance') + ' nearby!');
    }
}

// Calculate distance between two points
function getDistance(pos1, pos2) {
    const dx = pos1.lng - pos2.lng;
    const dy = pos1.lat - pos2.lat;
    return Math.sqrt(dx * dx + dy * dy);
}

// Update budget display
function updateBudget() {
    document.getElementById('budget').textContent = gameState.budget.toLocaleString();
    document.getElementById('rewards').textContent = gameState.totalRewards.toLocaleString();
}

// Save game state
function saveGame() {
    const saveData = {
        budget: gameState.budget,
        totalRewards: gameState.totalRewards,
        trainingBonus: gameState.trainingBonus,
        buildings: gameState.buildings.map(b => ({
            type: b.type,
            position: b.position,
            assignedVehicles: b.assignedVehicles ? b.assignedVehicles.map(v => ({
                type: v.type,
                position: v.position,
                details: v.details
            })) : []
        })),
        vehicles: gameState.vehicles.map(v => ({
            type: v.type,
            position: v.position,
            details: v.details,
            assignedStation: v.assignedStation ? {
                type: v.assignedStation.type,
                position: v.assignedStation.position
            } : null
        }))
    };
    localStorage.setItem('aussieFireChief', JSON.stringify(saveData));
}

// Load game state
function loadGame() {
    const savedData = localStorage.getItem('aussieFireChief');
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.budget = data.budget;
        gameState.totalRewards = data.totalRewards || 0;
        gameState.trainingBonus = data.trainingBonus || 0;
        
        // Load buildings first
        data.buildings.forEach(b => {
            const marker = L.marker([b.position.lat, b.position.lng], {
                icon: BUILDING_ICONS[b.type]
            }).addTo(map);
            
            const building = {
                type: b.type,
                position: b.position,
                marker: marker,
                assignedVehicles: []
            };
            
            marker.on('click', () => showDetails(b.type, building));
            gameState.buildings.push(building);
        });

        // Then load vehicles and restore assignments
        data.vehicles.forEach(v => {
            const marker = L.circleMarker([v.position.lat, v.position.lng], {
                radius: 8,
                fillColor: v.type === 'ambulance' ? 'white' : 'red',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            const vehicle = {
                type: v.type,
                position: v.position,
                marker: marker,
                details: v.details || { ...DETAILS[v.type] }
            };
            
            // Restore station assignment if any
            if (v.assignedStation) {
                const station = gameState.buildings.find(b => 
                    b.type === v.assignedStation.type && 
                    b.position.lat === v.assignedStation.position.lat &&
                    b.position.lng === v.assignedStation.position.lng
                );
                if (station) {
                    vehicle.assignedStation = station;
                    station.assignedVehicles.push(vehicle);
                }
            }
            
            marker.on('click', () => showDetails(v.type, vehicle));
            gameState.vehicles.push(vehicle);
        });

        updateBudget();
    }
}

// Start game
loadGame();
setInterval(generateMission, 60000); // Generate new mission every minute

// Map styles configuration
const MAP_STYLES = {
    default: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    dark: {
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
    }
};

// Global state for building placement
let placementMode = false;
let selectedBuildingType = null;

// Load saved game state when the page loads
window.addEventListener('load', loadGameState);

// Initialize the map centered on Sydney, Australia with proper configuration
const map = L.map('map', {
    center: [-33.8688, 151.2093],
    zoom: 13,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [[-90, -180], [90, 180]], // Restrict map bounds to world coordinates
    zoomControl: true,
    attributionControl: true
});

// Add click handler for building placement
map.on('click', function(e) {
    if (placementMode && selectedBuildingType) {
        const position = [e.latlng.lat, e.latlng.lng];
        addBuilding(selectedBuildingType, position);
        // Exit placement mode after placing building
        placementMode = false;
        selectedBuildingType = null;
        map.getContainer().style.cursor = '';
    }
});

// Add default OpenStreetMap tiles with error handling
let currentTileLayer = L.tileLayer(MAP_STYLES.default.url, {
    attribution: MAP_STYLES.default.attribution,
    maxZoom: 18,
    minZoom: 3,
    errorTileUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-grey.png',
    crossOrigin: true
}).addTo(map);

// Handle tile loading errors
currentTileLayer.on('tileerror', function(error) {
    console.warn('Failed to load map tile:', error);
});

// Simulation speed multiplier
let simulationSpeedMultiplier = 1;

// Update simulation speed
function updateSimulationSpeed() {
    simulationSpeedMultiplier = parseFloat(document.getElementById('simSpeed').value);
}

// Update map style
function updateMapStyle() {
    const style = document.getElementById('mapStyle').value;
    const newStyle = MAP_STYLES[style];
    
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
    
    currentTileLayer = L.tileLayer(newStyle.url, {
        attribution: newStyle.attribution,
        maxZoom: 18,
        minZoom: 3,
        errorTileUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-grey.png',
        crossOrigin: true
    }).addTo(map);

    currentTileLayer.on('tileerror', function(error) {
        console.warn('Failed to load map tile:', error);
    });
}

// Check notification settings before adding message
function shouldShowNotification(type) {
    const notificationSettings = {
        DISPATCH: document.getElementById('notifyDispatch').checked,
        ARRIVAL: document.getElementById('notifyArrival').checked,
        COMPLETION: document.getElementById('notifyCompletion').checked
    };
    return notificationSettings[type];
}

// Store units, incidents, buildings, messages and game state
let units = [];
let incidents = [];
let buildings = [];
let messages = [];
let unitCounter = 1;
let incidentCounter = 1;
let funds = 10000;

// Autosave configuration
const AUTOSAVE_INTERVAL = 60000; // Save every minute

// Save game state to localStorage
function saveGameState() {
    const gameState = {
        units: units.map(unit => ({
            id: unit.id,
            position: unit.position,
            type: unit.type,
            status: unit.status,
            basePosition: unit.basePosition,
            isTransportOnly: unit.isTransportOnly
        })),
        buildings: buildings.map(building => ({
            type: building.type,
            position: building.position,
            units: building.units.map(unit => unit.id)
        })),
        funds: funds,
        unitCounter: unitCounter,
        incidentCounter: incidentCounter
    };
    localStorage.setItem('emergencyDispatchState', JSON.stringify(gameState));
    console.log('Game state saved:', new Date().toLocaleTimeString());
}

// Load game state from localStorage
function loadGameState() {
    const savedState = localStorage.getItem('emergencyDispatchState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        
        // Clear existing state
        units.forEach(unit => unit.marker.remove());
        buildings.forEach(building => building.marker.remove());
        units = [];
        buildings = [];
        
        // Restore buildings first
        gameState.buildings.forEach(buildingData => {
            const building = new EmergencyBuilding(buildingData.type, buildingData.position);
            buildings.push(building);
        });
        
        // Restore units
        gameState.units.forEach(unitData => {
            const unit = new EmergencyUnit(unitData.id, unitData.position, unitData.type);
            unit.status = unitData.status;
            unit.basePosition = unitData.basePosition;
            unit.isTransportOnly = unitData.isTransportOnly;
            units.push(unit);
            
            // Reassign unit to building
            const building = buildings.find(b => 
                b.type === Object.keys(BUILDING_TYPES).find(key => 
                    BUILDING_TYPES[key].unitType === unit.type
                )
            );
            if (building) building.units.push(unit);
        });
        
        funds = gameState.funds;
        unitCounter = gameState.unitCounter;
        incidentCounter = gameState.incidentCounter;
        
        // Update UI
        document.getElementById('funds').textContent = funds;
        updateUnitsList();
        console.log('Game state loaded:', new Date().toLocaleTimeString());
    }
}

// Set up autosave
setInterval(saveGameState, AUTOSAVE_INTERVAL);

// Save on important events
window.addEventListener('beforeunload', saveGameState);

// Message types and their configurations
const MESSAGE_TYPES = {
    DISPATCH: { color: '#007bff', icon: '🚨' },
    ARRIVAL: { color: '#28a745', icon: '✅' },
    COMPLETION: { color: '#6c757d', icon: '🏁' },
    RETURN: { color: '#17a2b8', icon: '🏠' }
};

// Add a message to the message feed
function addMessage(type, content) {
    if (!shouldShowNotification(type)) return;
    
    const messageConfig = MESSAGE_TYPES[type];
    const message = {
        id: Date.now(),
        type,
        content,
        timestamp: new Date().toLocaleTimeString()
    };
    messages.unshift(message);
    if (messages.length > 50) messages.pop(); // Keep only last 50 messages
    updateMessagePanel();
}

// Update the message panel in the UI
function updateMessagePanel() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = messages.map(message => {
        const config = MESSAGE_TYPES[message.type];
        return `
            <div class="message" style="border-left-color: ${config.color};">
                <small>${message.timestamp}</small><br>
                ${config.icon} ${message.content}
            </div>
        `;
    }).join('');
}

// Vehicle costs
const VEHICLE_COSTS = {
    AMBULANCE: 2000,
    FIRE_TRUCK: 3000,
    POLICE_CAR: 1500,
    SES_TRUCK: 2500,
    SES_TRANSPORT: 2000
};

// Building types and their configurations
const BUILDING_TYPES = {
    HOSPITAL: {
        name: 'Hospital',
        color: '#dc3545',
        icon: '🏥',
        unitType: 'AMBULANCE',
        capacity: 5,
        description: 'Main medical facility'
    },
    MEDICAL_CENTER: {
        name: 'Medical Center',
        color: '#e83e8c',
        icon: '⚕️',
        unitType: 'AMBULANCE',
        capacity: 3,
        description: 'Smaller medical facility'
    },
    FIRE_STATION: {
        name: 'Fire Station',
        color: '#fd7e14',
        icon: '🏢',
        unitType: 'FIRE_TRUCK',
        capacity: 4,
        description: 'Main fire response facility'
    },
    FIRE_SUBSTATION: {
        name: 'Fire Substation',
        color: '#ffc107',
        icon: '🚒',
        unitType: 'FIRE_TRUCK',
        capacity: 2,
        description: 'Auxiliary fire response point'
    },
    POLICE_STATION: {
        name: 'Police Station',
        color: '#0056b3',
        icon: '🏤',
        unitType: 'POLICE_CAR',
        capacity: 4,
        description: 'Main law enforcement facility'
    },
    POLICE_OUTPOST: {
        name: 'Police Outpost',
        color: '#17a2b8',
        icon: '👮',
        unitType: 'POLICE_CAR',
        capacity: 2,
        description: 'Small police presence point'
    },
    SES_HQ: {
        name: 'SES Headquarters',
        color: '#ff6b00',
        icon: '🏛️',
        unitType: 'SES_TRUCK',
        capacity: 4,
        description: 'Main SES response facility'
    },
    SES_UNIT: {
        name: 'SES Unit',
        color: '#ff8c00',
        icon: '🏪',
        unitType: 'SES_TRUCK',
        capacity: 2,
        description: 'Local SES response unit'
    },
    COMMAND_CENTER: {
        name: 'Command Center',
        color: '#6f42c1',
        icon: '🎮',
        unitType: null,
        capacity: 0,
        description: 'Central coordination facility'
    },
    TRAINING_FACILITY: {
        name: 'Training Facility',
        color: '#20c997',
        icon: '🎓',
        unitType: null,
        capacity: 0,
        description: 'Emergency services training center'
    }
};

// Building class
class EmergencyBuilding {
    constructor(type, position) {
        this.type = type;
        this.position = position;
        this.units = [];
        const buildingConfig = BUILDING_TYPES[type];
        
        this.marker = L.marker(position, {
            icon: L.divIcon({
                className: 'building-marker',
                html: `<div style="background-color: ${buildingConfig.color}; color: white; padding: 8px; border-radius: 4px;">${buildingConfig.icon}</div>`
            })
        }).addTo(map);
    }

    addUnit() {
        const buildingConfig = BUILDING_TYPES[this.type];
        if (!buildingConfig.unitType) {
            alert(`${buildingConfig.name} cannot house emergency units!`);
            return null;
        }
        if (this.units.length >= buildingConfig.capacity) {
            alert(`${buildingConfig.name} has reached its capacity of ${buildingConfig.capacity} units!`);
            return null;
        }
        const unit = new EmergencyUnit(unitCounter++, [...this.position], buildingConfig.unitType);
        this.units.push(unit);
        units.push(unit);
        return unit;
    }
}

// Unit types and their configurations
const UNIT_TYPES = {
    AMBULANCE: {
        name: 'Ambulance',
        color: '#dc3545',
        icon: '🚑',
        responseTypes: ['medical']
    },
    FIRE_TRUCK: {
        name: 'Fire Truck',
        color: '#fd7e14',
        icon: '🚒',
        responseTypes: ['fire']
    },
    POLICE_CAR: {
        name: 'Police Car',
        color: '#0056b3',
        icon: '🚓',
        responseTypes: ['crime']
    },
    SES_TRUCK: {
        name: 'SES Response Vehicle',
        color: '#ff6b00',
        icon: '🚛',
        responseTypes: ['flood', 'storm']
    },
    SES_TRANSPORT: {
        name: 'SES Transport Vehicle',
        color: '#ff8c00',
        icon: '🚚',
        responseTypes: [],
        isTransportOnly: true,
        description: 'Equipment transport vehicle - Not for emergency response'
    }
};

// Unit class
class EmergencyUnit {
    constructor(id, position, type) {
        this.id = id;
        this.position = position;
        this.type = type;
        this.status = 'available';
        this.basePosition = [...position]; // Store the original position as the base
        this.isTransportOnly = UNIT_TYPES[type]?.isTransportOnly || false;
        
        const unitConfig = UNIT_TYPES[type];
        this.marker = L.marker(position, {
            icon: L.divIcon({
                className: 'unit-marker',
                html: `<div style="background-color: ${unitConfig.color}; color: white; padding: 5px; border-radius: 50%;">${unitConfig.icon}${id}</div>`
            })
        }).addTo(map);
    }
}

// Emergency types and their configurations
const EMERGENCY_TYPES = {
    BUSHFIRE: {
        name: 'Bushfire Emergency',
        color: '#fd7e14',
        icon: '🔥',
        requiredUnit: 'FIRE_TRUCK',
        reward: 334,
        description: 'A bushfire is threatening nearby properties. Fire truck response required!',
        responseTime: 300 // 5 minutes in seconds
    },
    medical: {
        name: 'Medical Emergency',
        color: '#dc3545',
        icon: '🚨',
        requiredUnit: 'AMBULANCE',
        reward: 250,
        description: 'Medical assistance needed!',
        responseTime: 180
    },
    crime: {
        name: 'Crime in Progress',
        color: '#0056b3',
        icon: '🚔',
        requiredUnit: 'POLICE_CAR',
        reward: 300,
        description: 'Law enforcement response needed!',
        responseTime: 240
    },
    flood: {
        name: 'Flood Emergency',
        color: '#17a2b8',
        icon: '🌊',
        requiredUnit: 'SES_TRUCK',
        reward: 400,
        description: 'Flooding reported, immediate assistance required!',
        responseTime: 360
    },
    storm: {
        name: 'Storm Emergency',
        color: '#6c757d',
        icon: '⛈️',
        requiredUnit: 'SES_TRUCK',
        reward: 350,
        description: 'Storm damage reported!',
        responseTime: 300
    }
};

// Mission types (alias for EMERGENCY_TYPES for backward compatibility)
const MISSION_TYPES = EMERGENCY_TYPES;

let activeMission = null;
let missionTimer = null;
let responseStartTime = null;
// Play sound effects for different events
function playSound(type) {
    const audio = new Audio();
    switch(type) {
        case 'EMERGENCY_CALL':
            audio.src = 'sounds/emergency.mp3';
            break;
        case 'DISPATCH':
            audio.src = 'sounds/dispatch.mp3';
            break;
        case 'ARRIVAL':
            audio.src = 'sounds/arrival.mp3';
            break;
        case 'COMPLETION':
            audio.src = 'sounds/complete.mp3';
            break;
        default:
            return;
    }
    audio.play().catch(err => console.warn('Audio playback failed:', err));
}
// Incident class
class Emergency {
    constructor(id, position) {
        this.id = id;
        this.position = position;
        this.status = 'pending';
        this.assignedUnit = null;
        
        // Randomly select emergency type
        const types = Object.keys(EMERGENCY_TYPES);
        this.type = types[Math.floor(Math.random() * types.length)];
        const emergencyConfig = EMERGENCY_TYPES[this.type];
        
        this.marker = L.marker(position, {
            icon: L.divIcon({
                className: 'incident-marker',
                html: `<div style="background-color: ${emergencyConfig.color}; color: white; padding: 5px; border-radius: 50%;">${emergencyConfig.icon}${id}</div>`
            })
        }).addTo(map);
    }
}

// Building costs
const BUILDING_COSTS = {
    HOSPITAL: 5000,
    MEDICAL_CENTER: 3000,
    FIRE_STATION: 4000,
    FIRE_SUBSTATION: 2500,
    POLICE_STATION: 4000,
    POLICE_OUTPOST: 2500,
    SES_HQ: 4500,
    SES_UNIT: 2500,
    COMMAND_CENTER: 6000,
    TRAINING_FACILITY: 3500
};

// Add a new emergency building
function startBuildingPlacement(type) {
    if (placementMode) {
        // Cancel current placement
        placementMode = false;
        selectedBuildingType = null;
        map.getContainer().style.cursor = '';
        return;
    }
    
    const cost = BUILDING_COSTS[type];
    if (funds >= cost) {
        placementMode = true;
        selectedBuildingType = type;
        map.getContainer().style.cursor = 'crosshair';
        addMessage('DISPATCH', `Select a location to place ${BUILDING_TYPES[type].name}`);
    } else {
        alert('Insufficient funds!');
    }
}

function addBuilding(type, position) {
    const cost = BUILDING_COSTS[type];
    if (funds >= cost) {
        const building = new EmergencyBuilding(type, position);
        buildings.push(building);
        funds -= cost;
        document.getElementById('funds').textContent = funds;
        addMessage('DISPATCH', `${BUILDING_TYPES[type].icon} New ${BUILDING_TYPES[type].name} constructed`);
        updateUnitsList();
        saveGameState(); // Save after building construction
    } else {
        alert('Insufficient funds!');
    }
}

function purchaseVehicle(type) {
    const cost = VEHICLE_COSTS[type];
    if (funds >= cost) {
        // Find the corresponding building type for this vehicle
        const buildingType = Object.keys(BUILDING_TYPES).find(key => BUILDING_TYPES[key].unitType === type);
        if (buildingType) {
            // Find an existing building of the correct type
            const building = buildings.find(b => b.type === buildingType);
            if (building) {
                funds -= cost;
                building.addUnit();
                document.getElementById('funds').textContent = funds;
                updateUnitsList();
                saveGameState(); // Save after vehicle purchase
            } else {
                alert('Please build a ' + BUILDING_TYPES[buildingType].name + ' first!');
            }
        }
    } else {
        alert('Insufficient funds!');
    }
}

// Add initial buildings and their units
function initializeEmergencyServices() {
    addBuilding('HOSPITAL');
    addBuilding('MEDICAL_CENTER');
    addBuilding('FIRE_STATION');
    addBuilding('FIRE_SUBSTATION');
    addBuilding('POLICE_STATION');
    addBuilding('POLICE_OUTPOST');
    addBuilding('COMMAND_CENTER');
    addBuilding('TRAINING_FACILITY');
}

// Start the Bushfire mission
function startBushfireMission() {
    if (activeMission) {
        alert('There is already an active mission!');
        return;
    }

    const randomLat = map.getCenter().lat + (Math.random() - 0.5) * 0.1;
    const randomLng = map.getCenter().lng + (Math.random() - 0.5) * 0.1;
    const mission = new Emergency(incidentCounter++, [randomLat, randomLng]);
    mission.type = 'BUSHFIRE';
    mission.reward = MISSION_TYPES.BUSHFIRE.reward;
    mission.responseTime = MISSION_TYPES.BUSHFIRE.responseTime;

    incidents.push(mission);
    activeMission = mission;
    responseStartTime = Date.now();

    // Play emergency call sound
    try {
        playSound('EMERGENCY_CALL');
    } catch (error) {
        console.warn('Failed to play emergency sound:', error);
    }

    // Start the response timer
    startResponseTimer(mission);

    updateIncidentsList();
    assignNearestUnit(mission);
}

// Handle the response timer
function startResponseTimer(mission) {
    const timerElement = document.createElement('div');
    timerElement.className = 'response-timer';
    document.querySelector('.incident-list').insertBefore(timerElement, document.getElementById('incidents'));

    missionTimer = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - responseStartTime) / 1000);
        const remainingTime = mission.responseTime - elapsedTime;

        if (remainingTime <= 0) {
            clearInterval(missionTimer);
            failMission(mission);
        } else {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            timerElement.textContent = `Response Time Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// Handle mission failure
function failMission(mission) {
    clearInterval(missionTimer);
    document.querySelector('.response-timer')?.remove();

    mission.status = 'failed';
    mission.marker.remove();
    incidents = incidents.filter(i => i.id !== mission.id);
    activeMission = null;

    alert('Mission failed! Response time exceeded.');
    updateIncidentsList();
}

// Find and assign the nearest available unit to an incident
function assignNearestUnit(incident) {
    if (!incident || !incident.type || !EMERGENCY_TYPES[incident.type]) {
        console.error('Invalid incident or incident type');
        return;
    }

    const requiredUnitType = EMERGENCY_TYPES[incident.type].requiredUnit;
    const availableUnits = units.filter(unit => 
        unit.status === 'available' && 
        unit.type === requiredUnitType && 
        !unit.isTransportOnly
    );
    
    if (availableUnits.length === 0) {
        addMessage('DISPATCH', `⚠️ No available ${UNIT_TYPES[requiredUnitType].name} units for Emergency ${incident.id}`);
        return;
    }

    let nearestUnit = availableUnits[0];
    let shortestDistance = getDistance(incident.position, nearestUnit.position);

    availableUnits.forEach(unit => {
        const distance = getDistance(incident.position, unit.position);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestUnit = unit;
        }
    });

    nearestUnit.status = 'responding';
    incident.status = 'in_progress';
    incident.assignedUnit = nearestUnit;

    // Add dispatch message
    addMessage('DISPATCH', `${UNIT_TYPES[nearestUnit.type].icon} Unit ${nearestUnit.id} dispatched to Emergency ${incident.id}`);

    try {
        playSound('DISPATCH');
    } catch (error) {
        console.warn('Failed to play dispatch sound:', error);
    }

    // Draw a line between unit and incident
    const unitConfig = UNIT_TYPES[nearestUnit.type];
    const routeLine = L.polyline([nearestUnit.position, incident.position], {
        color: unitConfig.color,
        dashArray: '5, 10'
    }).addTo(map);

    // Store the route line reference in the incident
    incident.routeLine = routeLine;

    // Calculate response time based on distance
    const responseTime = Math.max(5000, shortestDistance * 10000);

    // Simulate emergency response time
    const arrivalTimeout = setTimeout(() => {
        if (incident.status === 'in_progress') {
            // Add arrival message
            addMessage('ARRIVAL', `${UNIT_TYPES[nearestUnit.type].icon} Unit ${nearestUnit.id} arrived at Emergency ${incident.id}`);
            nearestUnit.position = [...incident.position];
            nearestUnit.marker.setLatLng(incident.position);
            
            try {
                playSound('ARRIVAL');
            } catch (error) {
                console.warn('Failed to play arrival sound:', error);
            }
            
            setTimeout(() => {
                if (incident.status === 'in_progress') {
                    completeIncident(incident, nearestUnit, routeLine);
                }
            }, 2000 / simulationSpeedMultiplier); // 2 seconds on scene before completion
        }
    }, responseTime / simulationSpeedMultiplier);

    // Store the timeout reference
    incident.arrivalTimeout = arrivalTimeout;

    updateUnitsList();
    updateIncidentsList();
}

// Calculate distance between two points
function getDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos1[0] - pos2[0], 2) + 
        Math.pow(pos1[1] - pos2[1], 2)
    );
}

// Handle mission completion and unit return
function completeIncident(incident, unit, routeLine) {
    clearInterval(missionTimer);
    document.querySelector('.response-timer')?.remove();

    // Update incident status
    incident.status = 'completed';
    incident.marker.remove();
    routeLine.remove();

    // Calculate response time and reward
    if (incident === activeMission) {
        const responseTime = Math.floor((Date.now() - responseStartTime) / 1000);
        const timeBonus = Math.max(0, Math.floor((incident.responseTime - responseTime) / 60) * 50);
        const totalReward = incident.reward + timeBonus;

        funds += totalReward;
        document.getElementById('funds').textContent = funds;

        // Play completion sound
        playSound('COMPLETION');

        addMessage('COMPLETION', 
            `${UNIT_TYPES[unit.type].icon} Unit ${unit.id} completed Mission ${incident.id}\n` +
            `Reward: $${incident.reward} + Time Bonus: $${timeBonus} = Total: $${totalReward}`);

        activeMission = null;
        saveGameState(); // Save after mission completion and reward
    }

    // Remove incident from active list
    incidents = incidents.filter(i => i.id !== incident.id);

    // Return unit to base
    unit.status = 'returning';
    updateUnitsList();
    updateIncidentsList();

    // Simulate return journey
    setTimeout(() => {
        unit.position = [...unit.basePosition];
        unit.status = 'available';
        unit.marker.setLatLng(unit.basePosition);
        updateUnitsList();
        // Add return message
        addMessage('RETURN', `${UNIT_TYPES[unit.type].icon} Unit ${unit.id} returned to base`);
        saveGameState(); // Save after unit returns to base
    }, 3000 / simulationSpeedMultiplier); // 3 seconds return journey
}

// Update the units list in the control panel
function updateUnitsList() {
    const unitsDiv = document.getElementById('units');
    unitsDiv.innerHTML = units.map(unit => {
        const unitConfig = UNIT_TYPES[unit.type];
        return `
            <div class="unit" style="border-left: 4px solid ${unitConfig.color};">
                ${unitConfig.icon} Unit ${unit.id} - ${unitConfig.name}
                <br>
                Status: ${unit.status}
                <br>
                Position: ${unit.position[0].toFixed(4)}, ${unit.position[1].toFixed(4)}
            </div>
        `;
    }).join('');
}

// Update the incidents list in the control panel
function updateIncidentsList() {
    const incidentsDiv = document.getElementById('incidents');
    incidentsDiv.innerHTML = incidents.map(incident => {
        const emergencyConfig = EMERGENCY_TYPES[incident.type];
        return `
            <div class="incident" style="border-left: 4px solid ${emergencyConfig.color};">
                ${emergencyConfig.icon} Emergency ${incident.id} - ${emergencyConfig.name}
                <br>
                Status: ${incident.status}
                <br>
                Position: ${incident.position[0].toFixed(4)}, ${incident.position[1].toFixed(4)}
                ${incident.assignedUnit ? `<br>Assigned: ${UNIT_TYPES[incident.assignedUnit.type].icon} Unit ${incident.assignedUnit.id}` : ''}
            </div>
        `;
    }).join('');
}
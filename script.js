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

// Import game systems
import { RefundSystem, SeasonPass, RecruitmentSystem, TrainingProgram } from './game_systems.js';

// Initialize game systems
let seasonPass, recruitmentSystem, trainingProgram;

// Initialize systems after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    seasonPass = new SeasonPass();
    recruitmentSystem = new RecruitmentSystem();
    trainingProgram = new TrainingProgram();
});

// Global state
let placementMode = false;
let selectedBuildingType = null;

// Load saved game state when the page loads
window.addEventListener('load', () => {
    loadGameState();
    updateSeasonPassUI();
    generateNewRecruits();
    updateTrainingProgramsUI();
});

// Initialize the map centered on Sydney, Australia with proper configuration
const map = L.map('map', {
    center: [-33.8688, 151.2093],
    zoom: 13,
    minZoom: 3,
    maxZoom: 18,
    maxBounds: [[-90, -180], [90, 180]], // Restrict map bounds to world coordinates
    zoomControl: true,
    attributionControl: true,
    maxBoundsViscosity: 1.0, // Prevent map from moving outside bounds
    bounceAtZoomLimits: true, // Bounce back when reaching zoom limits
    worldCopyJump: true // Enables seamless horizontal scrolling
});

// Add click handler for building placement with validation
map.on('click', function(e) {
    if (placementMode && selectedBuildingType) {
        const position = [e.latlng.lat, e.latlng.lng];
        
        // Validate minimum distance from other buildings
        const MIN_DISTANCE = 0.01; // roughly 1km
        const isTooClose = buildings.some(building => {
            const distance = map.distance(position, building.position);
            return distance < MIN_DISTANCE * 1000; // convert to meters
        });
        
        if (isTooClose) {
            addMessage('PLACEMENT', 'Buildings must be placed further apart');
            return;
        }
        
        // Validate building cost
        const buildingCost = BUILDING_TYPES[selectedBuildingType].cost || 5000;
        if (funds < buildingCost) {
            addMessage('PLACEMENT', 'Insufficient funds for building placement');
            return;
        }
        
        // Add building and deduct cost
        addBuilding(selectedBuildingType, position);
        funds -= buildingCost;
        updateFundsDisplay();
        
        // Exit placement mode after placing building
        placementMode = false;
        selectedBuildingType = null;
        map.getContainer().style.cursor = '';
        addMessage('PLACEMENT', `${BUILDING_TYPES[selectedBuildingType].name} placed successfully`);
    }
});

// Add mousemove handler for placement preview
map.on('mousemove', function(e) {
    if (placementMode && selectedBuildingType) {
        map.getContainer().style.cursor = 'crosshair';
    }
});

// Add default OpenStreetMap tiles with enhanced error handling and caching
let currentTileLayer = L.tileLayer(MAP_STYLES.default.url, {
    attribution: MAP_STYLES.default.attribution,
    maxZoom: 18,
    minZoom: 3,
    errorTileUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-grey.png',
    crossOrigin: true,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 4,
    maxNativeZoom: 19,
    detectRetina: true,
    subdomains: 'abc',
    tileSize: 256,
    zoomOffset: 0,
    retryOnError: true
}).addTo(map);

// Enhanced tile loading error handling with exponential backoff
let retryCount = {};
let tileCache = new Map();
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

currentTileLayer.on('tileerror', function(error) {
    const tileUrl = error.tile.src;
    retryCount[tileUrl] = (retryCount[tileUrl] || 0) + 1;
    
    if (retryCount[tileUrl] <= MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount[tileUrl] - 1);
        console.warn(`Retrying failed tile (${retryCount[tileUrl]}/${MAX_RETRIES}) after ${delay}ms:`, tileUrl);
        
        setTimeout(() => {
            if (tileCache.has(tileUrl)) {
                error.tile.src = tileCache.get(tileUrl);
            } else {
                error.tile.src = tileUrl;
            }
        }, delay);
    } else {
        console.error('Failed to load map tile after max retries:', tileUrl);
        delete retryCount[tileUrl];
    }
});

// Cache successful tile loads
currentTileLayer.on('tileload', function(event) {
    const tileUrl = event.tile.src;
    tileCache.set(tileUrl, tileUrl);
    delete retryCount[tileUrl];
});

// Clear tile cache when changing map styles
function clearTileCache() {
    tileCache.clear();
    retryCount = {};
}

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

// Theme management
function updateTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Browser notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
}

// Check notification settings and show browser notification if enabled
function shouldShowNotification(type) {
    const notificationSettings = {
        DISPATCH: document.getElementById('notifyDispatch').checked,
        ARRIVAL: document.getElementById('notifyArrival').checked,
        COMPLETION: document.getElementById('notifyCompletion').checked
    };

    if (notificationSettings[type] && Notification.permission === 'granted') {
        return true;
    }
    return notificationSettings[type];
}

// Show browser notification
function showBrowserNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/favicon.ico'
        });
    }
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

// UI Functions for new features
function showUnitDetails() {
    const selectedUnit = units.find(unit => unit.selected);
    if (selectedUnit) {
        const message = `Unit Details:\n` +
            `Type: ${selectedUnit.type}\n` +
            `Status: ${selectedUnit.status}\n` +
            `Position: ${selectedUnit.position.map(coord => coord.toFixed(4)).join(', ')}`;
        alert(message);
    } else {
        alert('Please select a unit to view details');
    }
}

function showRefundOptions() {
    const selectedUnit = units.find(unit => unit.selected);
    if (selectedUnit) {
        const refundAmount = RefundSystem.calculateRefund('vehicle', getVehicleCost(selectedUnit.type));
        if (confirm(`Sell ${selectedUnit.type} for $${refundAmount}?`)) {
            funds += refundAmount;
            selectedUnit.marker.remove();
            units = units.filter(unit => unit !== selectedUnit);
            updateFundsDisplay();
            addMessage(`Sold ${selectedUnit.type} for $${refundAmount}`);
        }
    } else {
        alert('Please select a unit to refund');
    }
}

function activateSeasonPass() {
    if (!seasonPass.isActive) {
        const cost = 5000;
        if (funds >= cost) {
            funds -= cost;
            seasonPass.activatePass();
            updateFundsDisplay();
            updateSeasonPassUI();
            addMessage('Season Pass activated!');
        } else {
            alert('Insufficient funds to activate Season Pass');
        }
    }
}

function updateSeasonPassUI() {
    const statusElement = document.getElementById('seasonStatus');
    const progressElement = document.getElementById('seasonProgress');
    const rewardsElement = document.getElementById('seasonRewards');

    if (seasonPass.isActive) {
        statusElement.textContent = `Season ${seasonPass.currentSeason} - Active`;
        progressElement.style.width = `${seasonPass.seasonProgress}%`;
        
        rewardsElement.innerHTML = seasonPass.rewards
            .map(reward => `<div class="reward-item">${reward.description} - ${reward.amount}</div>`)
            .join('');
    } else {
        statusElement.textContent = 'Season Pass Inactive';
        progressElement.style.width = '0%';
        rewardsElement.innerHTML = '<div class="reward-item">Activate pass to view rewards</div>';
    }
}

function generateNewRecruits() {
    const recruitsContainer = document.getElementById('availableRecruits');
    recruitsContainer.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const recruit = recruitmentSystem.generateRecruits();
        const recruitElement = document.createElement('div');
        recruitElement.className = 'recruit-card';
        recruitElement.innerHTML = `
            <div>
                <strong>${recruit.name}</strong><br>
                ${recruit.specialty} - Exp: ${recruit.experience}
            </div>
            <button class="button" onclick="hireRecruit(${recruit.id})">Hire ($${recruit.cost})</button>
        `;
        recruitsContainer.appendChild(recruitElement);
    }
}

function hireRecruit(recruitId) {
    const recruit = recruitmentSystem.availableRecruits.find(r => r.id === recruitId);
    if (recruit && funds >= recruit.cost) {
        funds -= recruit.cost;
        const hired = recruitmentSystem.hireRecruit(recruitId);
        if (hired) {
            updateFundsDisplay();
            generateNewRecruits();
            addMessage(`Hired ${hired.name} as ${hired.specialty} specialist`);
        }
    } else {
        alert('Insufficient funds to hire recruit');
    }
}

function updateTrainingProgramsUI() {
    const programsContainer = document.getElementById('trainingPrograms');
    programsContainer.innerHTML = '';
    
    trainingProgram.programs.forEach(program => {
        const programElement = document.createElement('div');
        programElement.className = 'program-card';
        programElement.innerHTML = `
            <div>
                <strong>${program.name}</strong><br>
                Duration: ${program.duration} days<br>
                Skill Increase: +${program.skillIncrease}
            </div>
            <button class="button" onclick="startTrainingProgram('${program.id}')">Start ($${program.cost})</button>
        `;
        programsContainer.appendChild(programElement);
    });
}

function startTrainingProgram(programId) {
    const selectedStaff = recruitmentSystem.hiredStaff.find(staff => !trainingProgram.activeTraining.has(staff.id));
    if (!selectedStaff) {
        alert('No available staff for training');
        return;
    }

    const program = trainingProgram.programs.find(p => p.id === programId);
    if (program && funds >= program.cost) {
        funds -= program.cost;
        if (trainingProgram.startTraining(selectedStaff.id, programId)) {
            updateFundsDisplay();
            addMessage(`Started ${program.name} training for ${selectedStaff.name}`);
            updateActiveTrainingUI();
        }
    } else {
        alert('Insufficient funds for training program');
    }
}

function updateActiveTrainingUI() {
    const activeTrainingContainer = document.getElementById('activeTraining');
    activeTrainingContainer.innerHTML = '';
    
    trainingProgram.activeTraining.forEach((training, staffId) => {
        const staff = recruitmentSystem.hiredStaff.find(s => s.id === staffId);
        if (staff) {
            const timeRemaining = Math.ceil((training.endDate - new Date()) / (1000 * 60 * 60 * 24));
            const element = document.createElement('div');
            element.innerHTML = `
                <strong>${staff.name}</strong> - ${training.program.name}<br>
                Time Remaining: ${timeRemaining} days
            `;
            activeTrainingContainer.appendChild(element);
        }
    });
}

// Helper function to get vehicle cost
function getVehicleCost(vehicleType) {
    const costs = {
        'AMBULANCE': 2000,
        'FIRE_TRUCK': 3000,
        'POLICE_CAR': 1500,
        'SES_TRUCK': 2500,
        'SES_TRANSPORT': 2000
    };
    return costs[vehicleType] || 0;
}

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
        incidentCounter: incidentCounter,
        seasonPass: {
            currentSeason: seasonPass.currentSeason,
            seasonProgress: seasonPass.seasonProgress,
            isActive: seasonPass.isActive,
            endDate: seasonPass.endDate
        },
        hiredStaff: recruitmentSystem.hiredStaff,
        activeTraining: Array.from(trainingProgram.activeTraining.entries())
    };
    localStorage.setItem('emergencyDispatchState', JSON.stringify(gameState));
    console.log('Game state saved:', new Date().toLocaleTimeString());
}

// Load game state from localStorage
function loadGameState() {
    const savedState = localStorage.getItem('emergencyDispatchState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        
        // Load season pass state
        if (gameState.seasonPass) {
            seasonPass.currentSeason = gameState.seasonPass.currentSeason;
            seasonPass.seasonProgress = gameState.seasonPass.seasonProgress;
            seasonPass.isActive = gameState.seasonPass.isActive;
            seasonPass.endDate = gameState.seasonPass.endDate ? new Date(gameState.seasonPass.endDate) : null;
        }
        
        // Load recruitment state
        if (gameState.hiredStaff) {
            recruitmentSystem.hiredStaff = gameState.hiredStaff;
        }
        
        // Load training state
        if (gameState.activeTraining) {
            trainingProgram.activeTraining = new Map(gameState.activeTraining.map(([id, training]) => [
                id,
                {
                    ...training,
                    startDate: new Date(training.startDate),
                    endDate: new Date(training.endDate)
                }
            ]));
        }
        
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

    // Play sound effect based on message type
    playSound(type);

    // Show browser notification if enabled
    if (Notification.permission === 'granted') {
        showBrowserNotification(
            `${messageConfig.icon} ${type}`,
            content
        );
    }

    // Create and show temporary notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `${messageConfig.icon} ${content}`;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Update the message panel in the UI with enhanced status indicators
function updateMessagePanel() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = messages.map(message => {
        const config = MESSAGE_TYPES[message.type];
        const statusColor = message.type === 'DISPATCH' ? STATUS_COLORS.RESPONDING :
                           message.type === 'ARRIVAL' ? STATUS_COLORS.ON_SCENE :
                           message.type === 'COMPLETION' ? STATUS_COLORS.IDLE :
                           config.color;
        return `
            <div class="message" style="border-left-color: ${statusColor};">
                <small>${message.timestamp}</small><br>
                ${config.icon} ${message.content}
                ${message.type === 'DISPATCH' ? '<span class="response-time">Response Time: Calculating...</span>' : ''}
            </div>
        `;
    }).join('');

    // Update unit status indicators
    units.forEach(unit => {
        if (unit.marker && unit.marker._icon) {
            unit.marker._icon.style.backgroundColor = STATUS_COLORS[unit.status] || STATUS_COLORS.IDLE;
        }
    });
}

// Vehicle costs and status definitions
const VEHICLE_COSTS = {
    AMBULANCE: 2000,
    FIRE_TRUCK: 3000,
    POLICE_CAR: 1500,
    SES_TRUCK: 2500,
    SES_TRANSPORT: 2000
};

const UNIT_STATUS = {
    IDLE: 'IDLE',
    RESPONDING: 'RESPONDING',
    ON_SCENE: 'ON_SCENE',
    RETURNING: 'RETURNING',
    UNAVAILABLE: 'UNAVAILABLE'
};

const STATUS_COLORS = {
    IDLE: '#28a745',
    RESPONDING: '#dc3545',
    ON_SCENE: '#ffc107',
    RETURNING: '#17a2b8',
    UNAVAILABLE: '#6c757d'
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
let map;
let budget = 5000000; // Starting with $5M
let selectedItem = null;
let gameState = {
    stations: [],
    vehicles: [],
    missions: [],
    stats: {
        missionsCompleted: 0,
        totalResponseTime: 0,
        level: 1,
        xp: 0,
        achievements: [],
        limitedTimeOffersPurchased: 0
    }
};

// Game configuration
const DIFFICULTY_SETTINGS = {
    easy: { missionInterval: 90000, baseReward: 150000, xpMultiplier: 0.8, incomeMultiplier: 1.5, costMultiplier: 0.8 },
    normal: { missionInterval: 60000, baseReward: 100000, xpMultiplier: 1.0, incomeMultiplier: 1.0, costMultiplier: 1.0 },
    hard: { missionInterval: 30000, baseReward: 75000, xpMultiplier: 1.2, incomeMultiplier: 0.8, costMultiplier: 1.2 }
};

let currentDifficulty = 'normal';
let missionGenerator = null;
let incomeGenerator = null;

// Tasmania coordinates
const MAP_CENTER = [-42.0, 147.0];

// Vehicle effectiveness for different mission types (multiplier for rewards)
const VEHICLE_EFFECTIVENESS = {
    'Fire': {
        'heavy-pumper': 2.0,
        'medium-pumper': 1.5,
        'heavy-tanker': 2.0,
        'heavy-tanker-pumper': 2.5,
        'heavy-tanker-pumper-rescue': 2.0,
        'medium-tanker': 1.5,
        'light-tanker': 1.2,
        'cafs-tanker': 2.0,
    },
    'Rescue': {
        'rescue': 2.5,
        'heavy-tanker-pumper-rescue': 2.0,
        'hydraulic-platform': 2.0,
        'rescue-truck': 2.0,
        'high-water': 1.8,
        'command-unit': 1.5
    },
    'HazMat': {
        'hazmat': 2.5,
        'support': 1.5,
        'command-support': 1.5,
        'incident-control': 1.8,
        'command-unit': 1.5
    },
    'Medical': {
        'support': 2.0,
        'rescue': 1.5,
        'command-support': 1.2,
        'rescue-truck': 1.5
    },
    'Flood': {
        'flood-boat': 2.5,
        'high-water': 2.0,
        'storm-truck': 1.5
    },
    'Storm': {
        'storm-truck': 2.5,
        'incident-control': 2.0,
        'command-unit': 1.8
    }
};

// Vehicle definitions with unlock requirements
const VEHICLES = {
    'light-tanker': { cost: 200000, level: 1, name: 'Light Tanker' },
    'medium-pumper': { cost: 300000, level: 1, name: 'Medium Pumper' },
    'support': { cost: 150000, level: 1, name: 'Support' },
    'medium-tanker': { cost: 250000, level: 2, name: 'Medium Tanker' },
    'heavy-pumper': { cost: 400000, level: 3, name: 'Heavy Pumper' },
    'rescue': { cost: 350000, level: 3, name: 'Rescue' },
    'heavy-tanker': { cost: 350000, level: 4, name: 'Heavy Tanker' },
    'command-support': { cost: 200000, level: 4, name: 'Command Support' },
    'heavy-tanker-pumper': { cost: 450000, level: 5, name: 'Heavy Tanker/Pumper' },
    'cafs-tanker': { cost: 400000, level: 6, name: 'CAFS Tanker' },
    'hazmat': { cost: 450000, level: 7, name: 'HazMat' },
    'heavy-tanker-pumper-rescue': { cost: 500000, level: 8, name: 'Heavy Tanker/Pumper/Rescue' },
    'hydraulic-platform': { cost: 600000, level: 9, name: 'Hydraulic Platform' },
};

// SES Vehicles
const SES_VEHICLES = {
    'flood-boat': { cost: 150000, level: 1, name: 'Flood Rescue Boat' },
    'storm-truck': { cost: 200000, level: 1, name: 'Storm Response Truck' },
    'rescue-truck': { cost: 250000, level: 2, name: 'General Rescue Truck' },
    'incident-control': { cost: 300000, level: 3, name: 'Incident Control Vehicle' },
    'high-water': { cost: 350000, level: 4, name: 'High Water Rescue Vehicle' },
    'command-unit': { cost: 400000, level: 5, name: 'Mobile Command Unit' }
};

// Building costs
const BUILDINGS = {
    'firestation': { cost: 1000000, level: 1, income: 50000 },
    'helipad': { cost: 1500000, level: 5, income: 75000 },
    'sesstation': { cost: 800000, level: 1, income: 40000 },
    'floodcenter': { cost: 1200000, level: 4, income: 60000 }
};

// Achievements
const ACHIEVEMENTS = [
    { id: 'first_station', name: 'First Responder', description: 'Build your first fire station', xp: 100 },
    { id: 'five_stations', name: 'Network Builder', description: 'Build 5 fire stations', xp: 500 },
    { id: 'ten_vehicles', name: 'Fleet Manager', description: 'Own 10 vehicles', xp: 300 },
    { id: 'perfect_response', name: 'Perfect Response', description: 'Complete a mission with maximum effectiveness', xp: 200 },
    { id: 'mission_master', name: 'Mission Master', description: 'Complete 50 missions', xp: 1000 },
    { id: 'millionaire', name: 'Millionaire', description: 'Accumulate $1,000,000 in budget', xp: 800 },
    { id: 'ses_pioneer', name: 'SES Pioneer', description: 'Build your first SES station', xp: 100 },
    { id: 'flood_master', name: 'Flood Master', description: 'Successfully complete 10 flood missions', xp: 300 },
    { id: 'storm_chaser', name: 'Storm Chaser', description: 'Complete 5 storm missions during severe weather', xp: 400 },
    { id: 'perfect_coordination', name: 'Perfect Coordination', description: 'Have both TFS and SES respond to the same mission', xp: 250 },
    { id: 'emergency_network', name: 'Emergency Network', description: 'Build 3 stations of each type', xp: 500 },
    { id: 'flash_sale', name: 'Flash Sale Hero', description: 'Purchase 3 limited-time offers', xp: 200 }
];

// Weather system
const WEATHER_TYPES = [
    { emoji: '☀️', temp: [25, 35], wind: [5, 15], description: 'Sunny' },
    { emoji: '🌤️', temp: [20, 30], wind: [10, 20], description: 'Partly Cloudy' },
    { emoji: '☁️', temp: [15, 25], wind: [15, 25], description: 'Cloudy' },
    { emoji: '🌧️', temp: [10, 20], wind: [20, 30], description: 'Rainy' },
    { emoji: '⛈️', temp: [15, 25], wind: [25, 40], description: 'Storm' }
];

let currentWeather = null;

function updateWeather() {
    const prevWeather = currentWeather;
    currentWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
    const temp = Math.floor(Math.random() * (currentWeather.temp[1] - currentWeather.temp[0]) + currentWeather.temp[0]);
    const wind = Math.floor(Math.random() * (currentWeather.wind[1] - currentWeather.wind[0]) + currentWeather.wind[0]);
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const windDir = directions[Math.floor(Math.random() * directions.length)];
    
    document.getElementById('current-weather').textContent = `${currentWeather.emoji} ${temp}°C`;
    document.getElementById('wind-info').textContent = `💨 ${windDir} ${wind}km/h`;
    
    // Affect mission generation based on weather
    if (currentWeather.description === 'Storm') {
        generateMission(); // Extra missions during storms
    }
}

function initMap() {
    map = L.map('map').setView(MAP_CENTER, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', handleMapClick);
    loadGameState();
    startMissionGenerator();
    updateWeather();
    setInterval(updateWeather, 120000); // Update weather every 2 minutes
    populateVehicleList();
    setupTooltips();
    generateOffer();
    setInterval(generateOffer, 180000); // New offer every 3 minutes
    setInterval(updateOffersDisplay, 1000); // Update timers every second
    startIncomeGeneration();
}

function setupTooltips() {
    const tooltip = document.getElementById('tooltip');
    document.addEventListener('mousemove', e => {
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY + 10) + 'px';
    });
}

function showTooltip(element, text) {
    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = text;
    tooltip.style.display = 'block';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

function populateVehicleList() {
    const vehicleList = document.getElementById('vehicle-list');
    vehicleList.innerHTML = '';
    
    Object.entries(VEHICLES).forEach(([type, vehicle]) => {
        const button = document.createElement('button');
        button.className = `btn btn-info mb-1 ${vehicle.level > gameState.stats.level ? 'locked' : ''}`;
        button.onclick = () => selectVehicleType(type);
        button.onmouseenter = () => showTooltip(button, getVehicleTooltip(type, vehicle));
        button.onmouseleave = hideTooltip;
        
        if (vehicle.level > gameState.stats.level) {
            button.disabled = true;
            button.innerHTML = `${vehicle.name} ($${vehicle.cost.toLocaleString()})<br>
                <small class="unlock-info">Unlocks at level ${vehicle.level}</small>`;
        } else {
            button.textContent = `${vehicle.name} ($${vehicle.cost.toLocaleString()})`;
        }
        
        vehicleList.appendChild(button);
    });
    
    Object.entries(SES_VEHICLES).forEach(([type, vehicle]) => {
        const button = document.createElement('button');
        button.className = `btn btn-info mb-1 ${vehicle.level > gameState.stats.level ? 'locked' : ''}`;
        button.onclick = () => selectVehicleType(type, 'ses');
        button.onmouseenter = () => showTooltip(button, getSESVehicleTooltip(type, vehicle));
        button.onmouseleave = hideTooltip;
        
        if (vehicle.level > gameState.stats.level) {
            button.disabled = true;
            button.innerHTML = `${vehicle.name} ($${vehicle.cost.toLocaleString()})<br>
                <small class="unlock-info">Unlocks at level ${vehicle.level}</small>`;
        } else {
            button.textContent = `${vehicle.name} ($${vehicle.cost.toLocaleString()})`;
        }
        
        vehicleList.appendChild(button);
    });
}

function getVehicleTooltip(type, vehicle) {
    let tooltip = `${vehicle.name}\nCost: $${vehicle.cost.toLocaleString()}\n\nBest for:`;
    
    // Find missions where this vehicle is most effective
    Object.entries(VEHICLE_EFFECTIVENESS).forEach(([missionType, vehicles]) => {
        if (vehicles[type] && vehicles[type] > 1.3) {
            tooltip += `\n- ${missionType} (${Math.round((vehicles[type] - 1) * 100)}% bonus)`;
        }
    });
    
    return tooltip;
}

function getSESVehicleTooltip(type, vehicle) {
    let tooltip = `${vehicle.name}\nCost: $${vehicle.cost.toLocaleString()}\n\nBest for:`;
    
    // Find missions where this vehicle is most effective
    Object.entries(VEHICLE_EFFECTIVENESS).forEach(([missionType, vehicles]) => {
        if (vehicles[type] && vehicles[type] > 1.3) {
            tooltip += `\n- ${missionType} (${Math.round((vehicles[type] - 1) * 100)}% bonus)`;
        }
    });
    
    return tooltip;
}

function changeDifficulty() {
    const newDifficulty = document.getElementById('difficulty').value;
    if (newDifficulty === currentDifficulty) return;
    
    currentDifficulty = newDifficulty;
    if (missionGenerator) {
        clearInterval(missionGenerator);
    }
    startMissionGenerator();
    startIncomeGeneration();
}

function addExperience(amount) {
    const xpMultiplier = DIFFICULTY_SETTINGS[currentDifficulty].xpMultiplier;
    const xpGained = Math.round(amount * xpMultiplier);
    gameState.stats.xp += xpGained;
    
    // Show floating XP text
    const xpText = document.createElement('div');
    xpText.className = 'experience-gain';
    xpText.textContent = `+${xpGained} XP`;
    document.body.appendChild(xpText);
    setTimeout(() => xpText.remove(), 1000);
    
    // Check for level up
    const xpNeeded = gameState.stats.level * 1000;
    if (gameState.stats.xp >= xpNeeded) {
        levelUp();
    }
    
    // Update XP bar
    const progress = (gameState.stats.xp / xpNeeded) * 100;
    document.getElementById('xp-progress').style.width = `${progress}%`;
    document.getElementById('current-level').textContent = gameState.stats.level;
}

function levelUp() {
    gameState.stats.level++;
    gameState.stats.xp = 0;
    
    // Show level up modal
    document.getElementById('new-level').textContent = gameState.stats.level;
    const rewards = document.getElementById('level-rewards');
    rewards.innerHTML = '';
    
    // Check for newly unlocked items
    let unlockedItems = [];
    Object.entries(VEHICLES).forEach(([type, vehicle]) => {
        if (vehicle.level === gameState.stats.level) {
            unlockedItems.push(`🚒 ${vehicle.name}`);
        }
    });
    
    Object.entries(SES_VEHICLES).forEach(([type, vehicle]) => {
        if (vehicle.level === gameState.stats.level) {
            unlockedItems.push(`🚛 ${vehicle.name}`);
        }
    });
    
    Object.entries(BUILDINGS).forEach(([type, building]) => {
        if (building.level === gameState.stats.level) {
            unlockedItems.push(`🏢 ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        }
    });
    
    if (unlockedItems.length > 0) {
        rewards.innerHTML = '<h6>Unlocked:</h6><ul>' + 
            unlockedItems.map(item => `<li>${item}</li>`).join('') + '</ul>';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('levelUpModal'));
    modal.show();
    
    // Update UI
    populateVehicleList();
    if (gameState.stats.level >= 5) {
        document.getElementById('helipad-btn').disabled = false;
    }
}

function checkAchievements() {
    ACHIEVEMENTS.forEach(achievement => {
        if (gameState.stats.achievements.includes(achievement.id)) return;
        
        let earned = false;
        switch (achievement.id) {
            case 'first_station':
                earned = gameState.stations.length >= 1;
                break;
            case 'five_stations':
                earned = gameState.stations.length >= 5;
                break;
            case 'ten_vehicles':
                earned = gameState.vehicles.length >= 10;
                break;
            case 'perfect_response':
                earned = gameState.stats.hadPerfectResponse;
                break;
            case 'mission_master':
                earned = gameState.stats.missionsCompleted >= 50;
                break;
            case 'millionaire':
                earned = budget >= 1000000;
                break;
            case 'ses_pioneer':
                earned = gameState.sesStations.length >= 1;
                break;
            case 'flood_master':
                earned = gameState.stats.floodMissionsCompleted >= 10;
                break;
            case 'storm_chaser':
                earned = gameState.stats.stormMissionsCompleted >= 5;
                break;
            case 'perfect_coordination':
                earned = gameState.stats.perfectCoordination;
                break;
            case 'emergency_network':
                earned = gameState.stations.length >= 3 && gameState.sesStations.length >= 3;
                break;
            case 'flash_sale':
                earned = gameState.stats.limitedTimeOffersPurchased >= 3;
                break;
        }
        
        if (earned) {
            gameState.stats.achievements.push(achievement.id);
            addExperience(achievement.xp);
            alert(`🏆 Achievement Unlocked: ${achievement.name}\n${achievement.description}\n+${achievement.xp} XP`);
            updateAchievementsList();
        }
    });
}

function updateAchievementsList() {
    const achievementsList = document.getElementById('achievements-list');
    achievementsList.innerHTML = '';
    
    ACHIEVEMENTS.forEach(achievement => {
        const achieved = gameState.stats.achievements.includes(achievement.id);
        const div = document.createElement('div');
        div.className = `achievement-item ${achieved ? '' : 'locked'}`;
        div.innerHTML = `
            ${achieved ? '🏆' : '🔒'} ${achievement.name}
            <br><small>${achievement.description}</small>
            <small class="text-muted d-block">+${achievement.xp} XP</small>
        `;
        achievementsList.appendChild(div);
    });
}

function updateStats() {
    document.getElementById('missions-completed').textContent = 
        `Missions: ${gameState.stats.missionsCompleted}`;
    
    const avgResponse = gameState.stats.missionsCompleted > 0 
        ? Math.round(gameState.stats.totalResponseTime / gameState.stats.missionsCompleted) 
        : 0;
    document.getElementById('response-time').textContent = 
        `Avg. Response: ${avgResponse}s`;
}

function filterMissions(filter) {
    const buttons = document.querySelectorAll('.mission-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const missionItems = document.querySelectorAll('.mission-item');
    missionItems.forEach(item => {
        if (filter === 'all' || 
            (filter === 'active' && !item.classList.contains('completed')) ||
            (filter === 'completed' && item.classList.contains('completed'))) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update the existing functions to work with new features
function generateMission() {
    // ... (keep existing mission generation code) ...
    
    // Add priority based on weather
    const priority = currentWeather.description === 'Storm' ? 'high' : 
                    currentWeather.description === 'Sunny' ? 'low' : 'medium';
    
    mission.priority = priority;
    updateMissionList();
    
    // Add flood and storm missions during appropriate weather
    const missionTypes = ['Fire', 'Rescue', 'HazMat', 'Medical'];
    if (currentWeather.description === 'Rainy' || currentWeather.description === 'Storm') {
        missionTypes.push('Flood');
    }
    if (currentWeather.description === 'Storm') {
        missionTypes.push('Storm');
    }
    
    const missionType = missionTypes[Math.floor(Math.random() * missionTypes.length)];
    
    // Update mission emojis
    const missionEmojis = {
        'Fire': '🔥',
        'Rescue': '🚨',
        'HazMat': '☢️',
        'Medical': '🚑',
        'Flood': '🌊',
        'Storm': '⛈️'
    };
    
    // ... rest of mission generation code ...
}

function dispatchToMission(missionIndex) {
    // ... (keep existing dispatch code) ...
    
    // Track response time
    const startTime = Date.now();
    
    setTimeout(() => {
        // ... (keep existing completion code) ...
        
        // Calculate response time
        const responseTime = (Date.now() - startTime) / 1000;
        gameState.stats.totalResponseTime += responseTime;
        gameState.stats.missionsCompleted++;
        
        // Add experience based on effectiveness
        const xpGained = Math.round(100 * effectiveness);
        addExperience(xpGained);
        
        if (effectiveness >= 2.0) {
            gameState.stats.hadPerfectResponse = true;
        }
        
        checkAchievements();
        updateStats();
        
        // ... (keep rest of the completion code) ...
    }, 30000);
}

function selectBuildingType(type) {
    selectedItem = {
        type: 'building',
        buildingType: type
    };
    showNotification(`Select location for ${type.replace('-', ' ').toUpperCase()}`);
}

function selectVehicleType(type, service = 'tfs') {
    selectedItem = {
        type: service === 'tfs' ? 'vehicle' : 'ses-vehicle',
        vehicleType: type
    };
    showNotification(`Select a station to place ${type.replace('-', ' ').toUpperCase()}`);
}

function handleMapClick(e) {
    if (!selectedItem) return;

    const position = [e.latlng.lat, e.latlng.lng];
    const itemType = selectedItem.type === 'building' ? 'building' : 'vehicle';
    const cost = getCost(selectedItem.buildingType || selectedItem.vehicleType, itemType);
    
    if (budget < cost) {
        showNotification('Insufficient funds!', 'danger');
        return;
    }

    let success = false;
    if (selectedItem.type === 'building') {
        success = placeBuilding(position, selectedItem.buildingType);
    } else if (selectedItem.type === 'vehicle' || selectedItem.type === 'ses-vehicle') {
        // Check if clicked near a compatible station
        const nearestStation = findNearestStation(position);
        if (nearestStation && isStationCompatible(nearestStation, selectedItem)) {
            success = placeVehicle(nearestStation.position, selectedItem.vehicleType, selectedItem.type === 'ses-vehicle');
        } else {
            showNotification('Must place vehicle at a compatible station!', 'danger');
            return;
        }
    }

    if (success) {
        budget -= cost;
        updateBudgetDisplay();
        saveGameState();
        showNotification(`${selectedItem.buildingType || selectedItem.vehicleType} placed successfully!`);
    }
    selectedItem = null;
}

function placeBuilding(position, type) {
    const marker = L.marker(position, {
        icon: L.divIcon({
            className: `building-icon ${type}`,
            html: getBuildingIcon(type),
            iconSize: [40, 40]
        })
    }).addTo(map);

    const building = {
        type: type,
        position: position,
        marker: marker,
        vehicles: []
    };

    gameState.stations.push(building);
    
    // Update UI elements that depend on stations
    updateStationsList();
    return true;
}

function placeVehicle(position, type, isSES = false) {
    const vehicles = isSES ? SES_VEHICLES : VEHICLES;
    if (!(type in vehicles)) {
        showNotification('Invalid vehicle type!', 'danger');
        return false;
    }

    const marker = L.marker(position, {
        icon: L.divIcon({
            className: `vehicle-icon ${type}`,
            html: getVehicleIcon(type, isSES),
            iconSize: [30, 30]
        })
    }).addTo(map);

    const vehicle = {
        type: type,
        position: position,
        marker: marker,
        status: 'ready',
        service: isSES ? 'ses' : 'tfs'
    };

    gameState.vehicles.push(vehicle);
    
    // Add to station's vehicle list
    const station = findNearestStation(position);
    if (station) {
        station.vehicles.push(vehicle);
    }

    // Update UI elements that depend on vehicles
    updateVehiclesList();
    return true;
}

function findNearestStation(position) {
    let nearest = null;
    let minDistance = Infinity;
    
    gameState.stations.forEach(station => {
        const distance = L.latLng(station.position).distanceTo(L.latLng(position));
        if (distance < minDistance) {
            minDistance = distance;
            nearest = station;
        }
    });
    
    // Only return if within 100 meters
    return minDistance <= 100 ? nearest : null;
}

function isStationCompatible(station, item) {
    if (item.type === 'vehicle') {
        return station.type === 'firestation' || station.type === 'helipad';
    } else if (item.type === 'ses-vehicle') {
        return station.type === 'sesstation' || station.type === 'floodcenter';
    }
    return false;
}

function getBuildingIcon(type) {
    const icons = {
        'firestation': '🚒',
        'helipad': '🚁',
        'sesstation': '🚑',
        'floodcenter': '⛈️'
    };
    return icons[type] || '🏢';
}

function getVehicleIcon(type, isSES) {
    const icons = {
        // TFS vehicles
        'light-tanker': '🚒',
        'medium-pumper': '🚒',
        'heavy-tanker': '🚒',
        'rescue': '🚑',
        'hazmat': '⚠️',
        'command-support': '🚓',
        'aerial-pumper': '🚒',
        'bulk-water': '🚛',
        'heavy-rescue': '🚛',
        'hydraulic-platform': '🏗️',
        // SES vehicles
        'flood-boat': '⛵',
        'storm-truck': '🚛',
        'rescue-truck': '🚑',
        'incident-control': '🚓',
        'high-water': '🚛',
        'command-unit': '🚓'
    };
    return icons[type] || (isSES ? '🚙' : '🚗');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.style.backgroundColor = type === 'danger' ? '#e63946' : '#2a9d8f';
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <span class="me-2">${type === 'danger' ? '⚠️' : '✅'}</span>
            <div>${message}</div>
        </div>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function startMissionGenerator() {
    missionGenerator = setInterval(() => {
        if (gameState.stations.length > 0) {
            generateMission();
        }
    }, DIFFICULTY_SETTINGS[currentDifficulty].missionInterval); // Generate a new mission based on difficulty
}

function startIncomeGeneration() {
    if (incomeGenerator) {
        clearInterval(incomeGenerator);
    }
    
    incomeGenerator = setInterval(() => {
        const income = calculateTotalIncome();
        budget += income;
        updateBudgetDisplay();
        
        // Show income notification
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.style.backgroundColor = '#2a9d8f'; // Success color
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="me-2">💰</span>
                <div>
                    <div>Income Received</div>
                    <strong>+$${income.toLocaleString()}</strong>
                </div>
            </div>`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
    }, 60000); // Generate income every minute
}

function calculateTotalIncome() {
    let stationIncome = 0;
    gameState.stations.forEach(station => {
        stationIncome += BUILDINGS[station.type]?.income || 0;
    });
    
    const totalIncome = (100000 + stationIncome) * DIFFICULTY_SETTINGS[currentDifficulty].incomeMultiplier;
    return totalIncome;
}

function getCost(type, itemType = 'building') {
    let baseCost;
    if (itemType === 'building') {
        baseCost = BUILDINGS[type].cost;
    } else if (itemType === 'vehicle') {
        baseCost = VEHICLES[type]?.cost || SES_VEHICLES[type]?.cost || 0;
    }
    return Math.round(baseCost * DIFFICULTY_SETTINGS[currentDifficulty].costMultiplier);
}

function completeMission(mission, vehicle) {
    const baseReward = DIFFICULTY_SETTINGS[currentDifficulty].baseReward;
    const effectiveness = VEHICLE_EFFECTIVENESS[mission.type]?.[vehicle.type] || 1.0;
    const reward = Math.round(baseReward * effectiveness);
    
    budget += reward;
    updateBudgetDisplay();
    
    const message = `
        Mission Complete!<br>
        Reward: $${reward.toLocaleString()}
        ${effectiveness > 1 ? `<br>Perfect vehicle choice! (+${Math.round((effectiveness - 1) * 100)}% bonus)` : ''}
    `;
    showNotification(message);
    
    // Add XP
    const xp = Math.round(50 * effectiveness * DIFFICULTY_SETTINGS[currentDifficulty].xpMultiplier);
    addExperience(xp);
}

function updateBudgetDisplay() {
    const budgetElement = document.getElementById('budget');
    const currentValue = parseInt(budgetElement.textContent.replace(/,/g, ''));
    const targetValue = budget;
    
    if (currentValue === targetValue) return;
    
    const step = Math.ceil(Math.abs(targetValue - currentValue) / 20);
    const increment = targetValue > currentValue ? step : -step;
    
    function animate() {
        const newValue = parseInt(budgetElement.textContent.replace(/,/g, '')) + increment;
        if ((increment > 0 && newValue >= targetValue) || (increment < 0 && newValue <= targetValue)) {
            budgetElement.textContent = targetValue.toLocaleString();
        } else {
            budgetElement.textContent = newValue.toLocaleString();
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function saveGameState() {
    gameState.budget = budget;
    localStorage.setItem('aussieFireChief', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('aussieFireChief');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    budget = state.budget || 5000000;
    updateBudgetDisplay();

    state.stations.forEach(station => placeBuilding(station.position, station.type));
    state.vehicles.forEach(vehicle => {
        if (vehicle.type in VEHICLES) {
            placeVehicle(vehicle.position, vehicle.type);
        } else {
            placeVehicle(vehicle.position, vehicle.type, true);
        }
    });
    state.missions.forEach(mission => {
        const missionObj = {
            type: mission.type,
            position: mission.position,
            status: mission.status,
            marker: L.marker(mission.position, {
                icon: L.divIcon({
                    className: 'mission-icon',
                    html: '',
                    iconSize: [25, 25]
                })
            }).addTo(map)
        };
        gameState.missions.push(missionObj);
    });
    gameState.stats = state.stats;
    currentDifficulty = state.difficulty;
    
    updateMissionList();
    startIncomeGeneration();
}

// Initialize the game when the page loads
window.onload = initMap;

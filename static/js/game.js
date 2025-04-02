let map;
let budget = 1000000;
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
    easy: { missionInterval: 90000, baseReward: 7000, xpMultiplier: 0.8 },
    normal: { missionInterval: 60000, baseReward: 5000, xpMultiplier: 1.0 },
    hard: { missionInterval: 30000, baseReward: 3000, xpMultiplier: 1.5 }
};

let currentDifficulty = 'normal';
let missionGenerator = null;

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
    'firestation': { cost: 500000, level: 1 },
    'helipad': { cost: 750000, level: 5 },
    'sesstation': { cost: 400000, level: 1 },
    'floodcenter': { cost: 600000, level: 4 }
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
        button.onclick = () => selectVehicle(type);
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
        button.onclick = () => selectSESVehicle(type);
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
    selectedItem = { type: 'building', buildingType: type };
}

function selectVehicle(type) {
    selectedItem = { type: 'vehicle', vehicleType: type };
}

function selectSESVehicle(type) {
    selectedItem = { type: 'sesVehicle', vehicleType: type };
}

function handleMapClick(e) {
    if (!selectedItem) return;

    const cost = selectedItem.type === 'building' ? BUILDINGS[selectedItem.buildingType].cost : 
                 selectedItem.type === 'vehicle' ? VEHICLES[selectedItem.vehicleType].cost : 
                 SES_VEHICLES[selectedItem.vehicleType].cost;
    
    if (budget < cost) {
        alert('Insufficient funds!');
        return;
    }

    const position = [e.latlng.lat, e.latlng.lng];

    if (selectedItem.type === 'building') {
        placeFireStation(position);
    } else if (selectedItem.type === 'vehicle') {
        placeVehicle(position, selectedItem.vehicleType);
    } else {
        placeSESVehicle(position, selectedItem.vehicleType);
    }

    budget -= cost;
    updateBudgetDisplay();
    saveGameState();
}

function placeFireStation(position) {
    const station = {
        position: position,
        vehicles: [],
        marker: L.marker(position, {
            icon: L.divIcon({
                className: 'station-icon',
                html: '🏢',
                iconSize: [25, 25]
            })
        }).addTo(map)
    };

    gameState.stations.push(station);
}

function placeVehicle(position, type) {
    // Set appropriate emoji for vehicle type
    let vehicleEmoji = '🚒'; // default
    if (type.includes('rescue')) vehicleEmoji = '🚑';
    else if (type.includes('hazmat')) vehicleEmoji = '🚛';
    else if (type.includes('command')) vehicleEmoji = '🚓';
    else if (type.includes('support')) vehicleEmoji = '🚐';
    else if (type.includes('platform')) vehicleEmoji = '🚁';

    const vehicle = {
        type: type,
        position: position,
        status: 'available',
        marker: L.marker(position, {
            icon: L.divIcon({
                className: 'vehicle-icon',
                html: vehicleEmoji,
                iconSize: [25, 25]
            })
        }).addTo(map)
    };

    gameState.vehicles.push(vehicle);
}

function placeSESVehicle(position, type) {
    let vehicleEmoji = '🚛'; // default
    if (type.includes('boat')) vehicleEmoji = '🚤';
    else if (type.includes('control')) vehicleEmoji = '🚓';
    else if (type.includes('rescue')) vehicleEmoji = '🚑';
    
    const vehicle = {
        type: type,
        position: position,
        status: 'available',
        service: 'ses',
        marker: L.marker(position, {
            icon: L.divIcon({
                className: 'vehicle-icon',
                html: vehicleEmoji,
                iconSize: [25, 25]
            })
        }).addTo(map)
    };
    
    gameState.vehicles.push(vehicle);
}

function startMissionGenerator() {
    missionGenerator = setInterval(() => {
        if (gameState.stations.length > 0) {
            generateMission();
        }
    }, DIFFICULTY_SETTINGS[currentDifficulty].missionInterval); // Generate a new mission based on difficulty
}

function generateOffer() {
    const allVehicles = { ...VEHICLES, ...SES_VEHICLES };
    const vehicleTypes = Object.keys(allVehicles);
    const selectedType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    const vehicle = allVehicles[selectedType];
    
    const discountPercent = Math.floor(Math.random() * 3) * 15 + 20; // 20%, 35%, or 50% off
    const discountedCost = Math.round(vehicle.cost * (1 - discountPercent / 100));
    
    const duration = (Math.floor(Math.random() * 3) + 1) * 60000; // 1-3 minutes
    
    const offer = {
        type: selectedType,
        name: vehicle.name,
        originalCost: vehicle.cost,
        discountedCost: discountedCost,
        discountPercent: discountPercent,
        endTime: Date.now() + duration,
        service: selectedType in VEHICLES ? 'tfs' : 'ses'
    };
    
    activeOffers.push(offer);
    updateOffersDisplay();
}

function updateOffersDisplay() {
    const offersList = document.getElementById('offers-list');
    offersList.innerHTML = '';
    
    activeOffers = activeOffers.filter(offer => offer.endTime > Date.now());
    
    activeOffers.forEach(offer => {
        const timeLeft = Math.max(0, Math.ceil((offer.endTime - Date.now()) / 1000));
        const div = document.createElement('div');
        div.className = 'offer-item';
        if (timeLeft < 30) div.classList.add('flash-sale');
        
        div.innerHTML = `
            <span class="service-badge ${offer.service}">${offer.service.toUpperCase()}</span>
            ${offer.name}<br>
            <span class="discount">-${offer.discountPercent}% OFF!</span><br>
            <span class="original-price">$${offer.originalCost.toLocaleString()}</span>
            <strong>$${offer.discountedCost.toLocaleString()}</strong>
            <span class="timer">${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}</span>
            <button class="btn btn-sm btn-success mt-2" onclick="purchaseOffer('${offer.type}')">Purchase</button>
        `;
        
        offersList.appendChild(div);
    });
}

function purchaseOffer(type) {
    const offer = activeOffers.find(o => o.type === type);
    if (!offer) return;
    
    if (budget >= offer.discountedCost) {
        budget -= offer.discountedCost;
        updateBudgetDisplay();
        
        // Add vehicle to appropriate list
        if (offer.service === 'tfs') {
            placeVehicle(selectedPosition || [MAP_CENTER[0], MAP_CENTER[1]], type);
        } else {
            placeSESVehicle(selectedPosition || [MAP_CENTER[0], MAP_CENTER[1]], type);
        }
        
        // Remove the offer
        activeOffers = activeOffers.filter(o => o !== offer);
        updateOffersDisplay();
        
        // Check for achievement
        gameState.stats.limitedTimeOffersPurchased = (gameState.stats.limitedTimeOffersPurchased || 0) + 1;
        if (gameState.stats.limitedTimeOffersPurchased >= 3) {
            checkAchievement('flash_sale');
        }
    } else {
        alert('Insufficient funds!');
    }
}

function toggleServiceType(service) {
    document.getElementById('tfs-buildings').style.display = service === 'tfs' ? 'block' : 'none';
    document.getElementById('ses-buildings').style.display = service === 'ses' ? 'block' : 'none';
    
    const buttons = document.querySelectorAll('.building-section .btn-group button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === service) {
            btn.classList.add('active');
        }
    });
}

function toggleVehicleType(service) {
    document.getElementById('tfs-vehicles').style.display = service === 'tfs' ? 'block' : 'none';
    document.getElementById('ses-vehicles').style.display = service === 'ses' ? 'block' : 'none';
    
    const buttons = document.querySelectorAll('.vehicle-section .btn-group button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === service) {
            btn.classList.add('active');
        }
    });
}

function updateBudgetDisplay() {
    document.getElementById('budget').textContent = budget.toLocaleString();
}

function saveGameState() {
    const saveData = {
        budget: budget,
        stations: gameState.stations.map(station => ({
            position: station.position
        })),
        vehicles: gameState.vehicles.map(vehicle => ({
            type: vehicle.type,
            position: vehicle.position,
            status: vehicle.status
        })),
        missions: gameState.missions.map(mission => ({
            type: mission.type,
            position: mission.position,
            status: mission.status
        })),
        stats: gameState.stats
    };
    
    localStorage.setItem('aussieFireChief', JSON.stringify(saveData));
}

function loadGameState() {
    const savedState = localStorage.getItem('aussieFireChief');
    if (!savedState) return;

    const state = JSON.parse(savedState);
    budget = state.budget;
    updateBudgetDisplay();

    state.stations.forEach(station => placeFireStation(station.position));
    state.vehicles.forEach(vehicle => {
        if (vehicle.type in VEHICLES) {
            placeVehicle(vehicle.position, vehicle.type);
        } else {
            placeSESVehicle(vehicle.position, vehicle.type);
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
    
    updateMissionList();
}

// Initialize the game when the page loads
window.onload = initMap;

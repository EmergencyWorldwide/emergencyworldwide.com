// --- Leaflet Map Initialization ---
const map = L.map('map').setView([-37.8136, 144.9631], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
// It's often better to call invalidateSize slightly later if map div size might depend on other elements rendering
// But putting it here is usually fine. If map is blank, try moving it after initial loadGameState/updateUI or wrap in setTimeout(..., 0)
map.invalidateSize();

// --- Game State Variables ---
let money = 100000;
let buildings = []; // { id, type, location, marker, cost, customName }
let vehicles = [];  // { id, type, baseType, capacity, pumpType, crewCapacity, cost, customName, status, responseMode, location, stationId, assignedMissionId, destination, movementIntervalId, marker }
let missions = [];  // { id, type, location, urgency, requiredUnits, assignedUnits, status, reward, marker, completionTimeoutId, generationTime }
let nextBuildingId = 1;
let nextVehicleId = 1;
let nextMissionId = 1;
let missionGenerationIntervalId = null;
const MOVEMENT_UPDATE_INTERVAL_MS = 100;
const MISSION_GENERATION_INTERVAL_MS = 60 * 1000;
const MISSION_COMPLETION_TIME_MS = 15 * 1000;
const REFUND_PERCENTAGE = 0.5; // 50% refund

// --- Placement State ---
let placementState = {
    active: false,
    type: null,
    cost: 0
};

// --- DOM Elements ---
const moneyDisplay = document.getElementById('money-display');
const placementStatus = document.getElementById('placement-status');
const cancelPlacementBtn = document.getElementById('cancel-placement-btn');
const buyStationBtn = document.getElementById('buy-station-btn');
const buyCfaTanker4Btn = document.getElementById('buy-cfa-tanker-4-btn');
const buyCfaTanker2Btn = document.getElementById('buy-cfa-tanker-2-btn');
const buyCfaTanker24DBtn = document.getElementById('buy-cfa-tanker-24d-btn');
const buildingList = document.getElementById('building-list');
const vehicleList = document.getElementById('vehicle-list');
const missionList = document.getElementById('mission-list');

// --- Icons ---
const buildingIcon = L.divIcon({ className: 'building-marker', html: ' B ', iconSize: [20, 20], iconAnchor: [10, 10] });
const vehicleIcon = L.divIcon({ className: 'vehicle-marker', html: ' V ', iconSize: [20, 20], iconAnchor: [10, 10] });
const missionIcon = L.divIcon({ className: 'mission-marker', html: ' M ', iconSize: [20, 20], iconAnchor: [10, 10] });

// --- Mission Defs ---
const MISSION_TYPES = [
    { type: "Small Bin Fire", requiredUnits: { Tanker: 1 }, reward: 500, urgency: 3 },
    { type: "Grass Fire", requiredUnits: { Tanker: 1 }, reward: 1000, urgency: 1 },
    { type: "Minor Structure Fire", requiredUnits: { Tanker: 2 }, reward: 2500, urgency: 1 },
];

// --- Core Functions ---

/** Updates the entire UI and re-attaches dynamic listeners */
function updateUI() {
    moneyDisplay.textContent = money.toLocaleString();

    // Update placement status and map cursor class
    if (placementState.active) {
        placementStatus.textContent = `Click on the map to place ${placementState.type}...`;
        cancelPlacementBtn.style.display = 'inline-block';
        map.getContainer().classList.add('map-placement-mode');
    } else {
        placementStatus.textContent = '';
        cancelPlacementBtn.style.display = 'none';
        map.getContainer().classList.remove('map-placement-mode');
    }

    // Clear and rebuild lists
    buildingList.innerHTML = '';
    buildings.forEach(b => buildingList.appendChild(createBuildingListItem(b)));
    vehicleList.innerHTML = '';
    vehicles.forEach(v => vehicleList.appendChild(createVehicleListItem(v)));
    missionList.innerHTML = '';
    missions.forEach(m => missionList.appendChild(createMissionListItem(m)));

    // Update button disabled states
    const noStations = buildings.length === 0;
    buyStationBtn.disabled = placementState.active || money < parseInt(buyStationBtn.dataset.cost);
    buyCfaTanker4Btn.disabled = placementState.active || noStations || money < parseInt(buyCfaTanker4Btn.dataset.cost);
    buyCfaTanker2Btn.disabled = placementState.active || noStations || money < parseInt(buyCfaTanker2Btn.dataset.cost);
    buyCfaTanker24DBtn.disabled = placementState.active || noStations || money < parseInt(buyCfaTanker24DBtn.dataset.cost);

    attachDynamicButtonListeners(); // Attach listeners after elements are rebuilt
}

// --- List Item Creation ---

function createBuildingListItem(building) {
    const li = document.createElement('li');
    const name = building.customName || `${building.type} #${building.id}`;
    li.innerHTML = `<strong>${name}</strong>`;
    // Add location span if needed: `<span>Lat: ${building.location.lat.toFixed(4)}, Lng: ${building.location.lng.toFixed(4)}</span>`;

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('list-item-actions');
    actionsDiv.innerHTML = `
        <button class="rename-button" data-id="${building.id}" data-type="building">Rename</button>
        <button class="sell-button" data-id="${building.id}" data-type="building">Sell (+ $${(building.cost * REFUND_PERCENTAGE).toLocaleString()})</button>
    `;
    li.appendChild(actionsDiv);
    return li;
}

function createVehicleListItem(vehicle) {
    const li = document.createElement('li');
    li.classList.add('vehicle-item'); // Use flex for layout

    // Details Div (Left)
    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('vehicle-details');
    const name = vehicle.customName || `${vehicle.type} #${vehicle.id}`;
    let detailsHTML = `<strong>${name}</strong>`;
    if (vehicle.capacity) detailsHTML += `<span>Water: ${vehicle.capacity.toLocaleString()} L</span>`;
    if (vehicle.pumpType) detailsHTML += `<span>Pump: ${vehicle.pumpType}</span>`;
    if (vehicle.crewCapacity) detailsHTML += `<span>Crew: ${vehicle.crewCapacity}</span>`;
    let statusText = `<span>Status: ${vehicle.status}`;
    if (vehicle.status === 'Returning' && vehicle.stationId) statusText += ` to Station #${vehicle.stationId}`;
    else if (vehicle.assignedMissionId) statusText += ` (Mission #${vehicle.assignedMissionId})`;
    statusText += '</span>';
    detailsHTML += statusText;
    if (vehicle.stationId) detailsHTML += `<span>Home Station: #${vehicle.stationId}</span>`;
    detailsDiv.innerHTML = detailsHTML;

    // Controls Div (Right)
    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('vehicle-controls'); // Container for dropdown and buttons

    // Response Mode Dropdown
    const select = document.createElement('select');
    select.classList.add('response-mode-select');
    select.dataset.vehicleId = vehicle.id;
    ['Idle', 'Code 1', 'Code 3'].forEach(mode => {
        const option = document.createElement('option'); option.value = mode; option.textContent = mode;
        if (vehicle.responseMode === mode) option.selected = true;
        select.appendChild(option);
    });
    select.disabled = vehicle.status !== 'Idle'; // Only enable when idle
    controlsDiv.appendChild(select);

    // Action Buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('list-item-actions');
    actionsDiv.innerHTML = `
        <button class="rename-button" data-id="${vehicle.id}" data-type="vehicle">Rename</button>
        <button class="sell-button" data-id="${vehicle.id}" data-type="vehicle">Sell (+ $${(vehicle.cost * REFUND_PERCENTAGE).toLocaleString()})</button>
    `;
    controlsDiv.appendChild(actionsDiv);

    li.appendChild(detailsDiv);
    li.appendChild(controlsDiv);
    return li;
}


function createMissionListItem(mission) { // Mostly unchanged
    const li = document.createElement('li');
    li.dataset.missionId = mission.id;

    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('mission-details');
    detailsDiv.innerHTML = `
        <strong>${mission.type} #${mission.id}</strong>
        <span>Location: (${mission.location.lat.toFixed(3)}, ${mission.location.lng.toFixed(3)})</span>
        <span>Urgency: Code ${mission.urgency} ${mission.urgency === 1 ? '(Urgent)' : '(Non-Urgent)'}</span>
        <span>Required: ${Object.entries(mission.requiredUnits || {}).map(([type, count]) => `${count} ${type}`).join(', ')}</span>
        <span>Assigned: ${(mission.assignedUnits || []).length} unit(s)</span>
        <span>Status: ${mission.status || 'Unknown'}</span>
        <span>Reward: $${(mission.reward || 0).toLocaleString()}</span>
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('mission-actions');
    if (mission.status === 'Generated' || mission.status === 'Assigned') {
        const assignButton = document.createElement('button');
        assignButton.textContent = 'Assign Unit(s)';
        assignButton.dataset.missionId = mission.id;
        assignButton.classList.add('assign-mission-btn');
        const hasAssignableUnits = vehicles.some(v => v.status === 'Idle' || v.status === 'Returning');
        assignButton.disabled = !hasAssignableUnits; // Basic check
        actionsDiv.appendChild(assignButton);
    }
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);
    return li;
}

// --- Marker Creation & Updates ---
function createMarker(item, icon, popupContent) {
    if (!item?.location) { console.warn(`${item?.type || 'Item'} has no location.`); return; }
    // Remove old marker if it exists
    if (item.marker && map.hasLayer(item.marker)) { map.removeLayer(item.marker); }
    // Create and store new marker
    const marker = L.marker([item.location.lat, item.location.lng], { icon: icon })
        .addTo(map)
        .bindPopup(popupContent);
    item.marker = marker;
 }

/** Central function to update marker popups after state changes */
function updateMarkerPopup(item) {
    if (!item?.marker) return; // Check if item and marker exist

    let popupContent = '';
    // Use optional chaining and nullish coalescing for safer property access
    const name = item.customName || `${item.type || 'Unknown Type'} #${item.id}`;
    const status = item.status || 'Unknown';
    const responseMode = item.responseMode || 'N/A';

    if (item.type === 'Fire Station') {
         popupContent = `<b>${name}</b>`;
    } else if (item.baseType) { // Assume vehicle if it has a baseType
        popupContent = `<b>${name}</b><br>Status: ${status}`;
        if (status === 'Returning') popupContent += `<br>Mode: ${responseMode}<br>To: Station #${item.stationId || 'Unknown'}`;
        else if (item.assignedMissionId) popupContent += `<br>Mode: ${responseMode}<br>Mission: #${item.assignedMissionId}`;
        else popupContent += `<br>Mode: ${responseMode}`;
    } else if (item.urgency) { // Assume mission
         popupContent = `<b>Mission #${item.id}: ${item.type}</b><br>Urgency: Code ${item.urgency}<br>Status: ${status}`;
    } else { // Fallback
         popupContent = `<b>${name}</b>`;
    }

     item.marker.setPopupContent(popupContent);
}

function createBuildingMarker(building) { updateMarkerPopup(building); } // Use helper
function createVehicleMarker(vehicle) { updateMarkerPopup(vehicle); } // Use helper
function createMissionMarker(mission) { updateMarkerPopup(mission); } // Use helper


// --- Purchase & Placement ---

function startBuildingPlacement(buttonElement) {
    if (placementState.active) { console.warn("Already in placement mode."); return; }

    const cost = parseInt(buttonElement.dataset.cost);
    const type = buttonElement.dataset.type;

    if (money >= cost) {
        placementState = { active: true, type: type, cost: cost };
        console.log(`Entering placement mode for ${type}. Click map.`);
        // Add map click listener specifically for placement
        map.on('click', handleMapClickForPlacement);
        updateUI(); // Show status message, change cursor, disable buttons
    } else {
        alert("Not enough money!");
    }
}

function handleMapClickForPlacement(e) {
    if (!placementState.active) { console.warn("Map clicked but not in placement mode."); return; }

    const { lat, lng } = e.latlng;
    const cost = placementState.cost;
    const type = placementState.type;

    console.log(`Placing ${type} at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    money -= cost;

    const newBuilding = {
        id: nextBuildingId++,
        type: type,
        location: { lat, lng },
        cost: cost,
        customName: null,
        marker: null // Marker created by createBuildingMarker
    };
    buildings.push(newBuilding);
    createMarker(newBuilding, buildingIcon, `<b>${type} #${newBuilding.id}</b>`); // Create marker immediately
    updateMarkerPopup(newBuilding); // Update its popup content

    cancelBuildingPlacement(); // Exit placement mode cleanly

    saveGameState();
    updateUI(); // Update UI immediately
    startMissionGeneration();
}

function cancelBuildingPlacement() {
    if (!placementState.active) return;
    console.log("Cancelling building placement.");
    placementState = { active: false, type: null, cost: 0 };
    map.off('click', handleMapClickForPlacement); // Remove the specific listener
    updateUI(); // Hide message, reset cursor, re-enable buttons
}

function buyVehicle(buttonElement) {
    if (placementState.active) { alert("Cannot buy vehicles while placing a building."); return; }

    const cost = parseInt(buttonElement.dataset.cost);
    const type = buttonElement.dataset.type;
    const capacity = buttonElement.dataset.capacity ? parseInt(buttonElement.dataset.capacity) : null;
    const baseType = buttonElement.dataset.basetype;
    const pumpType = buttonElement.dataset.pump || null;
    const crewCapacity = buttonElement.dataset.crew ? parseInt(buttonElement.dataset.crew) : null;

    if (buildings.length === 0) { alert("Build a station first!"); return; }
    if (money >= cost) {
        money -= cost;
        // Simple assignment: Find first station. A better implementation might let user choose.
        const assignedStation = buildings[0];
        if (!assignedStation?.location) {
            console.error("Cannot buy vehicle: No valid station location found.");
            money += cost; // Refund money if placement fails
            alert("Error: Could not find a valid station to assign the vehicle to.");
            return;
        }
        const initialLocation = { ...assignedStation.location };

        const newVehicle = {
            id: nextVehicleId++, type: type, baseType: baseType, capacity: capacity,
            pumpType: pumpType, crewCapacity: crewCapacity, cost: cost, customName: null,
            status: 'Idle', responseMode: 'Idle', location: initialLocation,
            stationId: assignedStation.id, assignedMissionId: null, destination: null,
            movementIntervalId: null, marker: null
        };
        vehicles.push(newVehicle);
        createMarker(newVehicle, vehicleIcon, ''); // Create marker, popup updated by helper
        updateMarkerPopup(newVehicle); // Update popup content

        saveGameState(); updateUI();
        startMissionGeneration();
    } else { alert("Not enough money!"); }
}

// --- Rename & Sell Logic ---

function handleRenameClick(event) {
    const id = parseInt(event.target.dataset.id);
    const type = event.target.dataset.type;
    let item = (type === 'building') ? buildings.find(b => b.id === id) : vehicles.find(v => v.id === id);

    if (!item) { console.error(`Cannot rename: ${type} with ID ${id} not found.`); return; }

    const currentName = item.customName || `${item.type} #${item.id}`;
    const newName = prompt(`Enter new name for "${currentName}":`, item.customName || '');

    if (newName !== null) { // Check if prompt was cancelled
        item.customName = newName.trim() || null; // Reset to null if empty
        console.log(`Set name for ${type} #${id} to "${item.customName || '(Default)'}".`);
        updateMarkerPopup(item);
        saveGameState();
        updateUI();
    }
}

function handleSellClick(event) {
    const id = parseInt(event.target.dataset.id);
    const type = event.target.dataset.type;

    let itemIndex, item, itemArray;

    if (type === 'building') {
        itemIndex = buildings.findIndex(b => b.id === id);
        if (itemIndex === -1) { console.error(`Cannot sell: Building ${id} not found.`); return; }
        item = buildings[itemIndex];
        itemArray = buildings;
        // Dependency Check: Prevent selling station with vehicles
        const assignedVehicles = vehicles.filter(v => v.stationId === id);
        if (assignedVehicles.length > 0) {
            alert(`Cannot sell Station #${id} "${item.customName || ''}". It has ${assignedVehicles.length} vehicle(s) assigned.`);
            return;
        }
    } else if (type === 'vehicle') {
        itemIndex = vehicles.findIndex(v => v.id === id);
        if (itemIndex === -1) { console.error(`Cannot sell: Vehicle ${id} not found.`); return; }
        item = vehicles[itemIndex];
        itemArray = vehicles;
        // Dependency Check: Prevent selling active vehicle
        if (item.status !== 'Idle') {
            alert(`Cannot sell Vehicle #${id} "${item.customName || ''}" while it is ${item.status}. Wait until Idle.`);
            return;
        }
    } else { console.error("Invalid type for selling:", type); return; }

    const refundAmount = Math.floor((item.cost || 0) * REFUND_PERCENTAGE); // Use item cost, default 0
    const itemName = item.customName || `${item.type} #${item.id}`;

    if (confirm(`Are you sure you want to sell "${itemName}" for $${refundAmount.toLocaleString()}?`)) {
        money += refundAmount;
        console.log(`Sold ${type} #${id} for $${refundAmount}.`);
        if (item.marker && map.hasLayer(item.marker)) { map.removeLayer(item.marker); }
        itemArray.splice(itemIndex, 1); // Remove item from its array
        saveGameState();
        updateUI();
    }
}

// --- Dynamic Listener Attachment ---
function attachDynamicButtonListeners() {
    const eventHandlers = {
        '.assign-mission-btn': handleAssignUnitClick,
        '.rename-button': handleRenameClick,
        '.sell-button': handleSellClick,
        '.response-mode-select': handleResponseModeChange // Add listener for select change
    };

    for (const [selector, handler] of Object.entries(eventHandlers)) {
        document.querySelectorAll(selector).forEach(button => {
            // Simple way to ensure no duplicate listeners: clone and replace
            const clone = button.cloneNode(true);
            button.parentNode.replaceChild(clone, button);
            const eventType = (selector === '.response-mode-select') ? 'change' : 'click';
            clone.addEventListener(eventType, handler);
        });
    }
}


// --- Mission Logic ---
function startMissionGeneration() {
    if (buildings.length > 0 && vehicles.length > 0 && !missionGenerationIntervalId) {
        console.log("Starting mission generation timer.");
        missionGenerationIntervalId = setInterval(generateMission, MISSION_GENERATION_INTERVAL_MS);
    } else if (missionGenerationIntervalId && (buildings.length === 0 || vehicles.length === 0)) {
        console.log("Stopping mission generation timer (no assets).");
        clearInterval(missionGenerationIntervalId);
        missionGenerationIntervalId = null;
    }
}
function generateMission() {
     if (buildings.length === 0 || vehicles.length === 0) return;
    const missionTemplate = MISSION_TYPES[Math.floor(Math.random() * MISSION_TYPES.length)];
    const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
    // Ensure randomBuilding and its location exist
     if (!randomBuilding?.location) {
         console.warn("Skipping mission generation: Could not find valid building location.");
         return;
     }
    const offsetLat = (Math.random() - 0.5) * 0.05; const offsetLng = (Math.random() - 0.5) * 0.08;
    const missionLocation = { lat: randomBuilding.location.lat + offsetLat, lng: randomBuilding.location.lng + offsetLng };
    const newMission = {
        id: nextMissionId++, type: missionTemplate.type, location: missionLocation,
        urgency: missionTemplate.urgency, requiredUnits: { ...missionTemplate.requiredUnits },
        assignedUnits: [], status: 'Generated', reward: missionTemplate.reward,
        marker: null, completionTimeoutId: null, generationTime: Date.now()
    };
    missions.push(newMission);
    createMarker(newMission, missionIcon, ''); // Create marker, popup updated by helper
    updateMarkerPopup(newMission);
    console.log(`Generated Mission #${newMission.id}: ${newMission.type}`);
    saveGameState(); updateUI();
}
function handleAssignUnitClick(event) {
    const missionId = parseInt(event.target.dataset.missionId);
    const mission = missions.find(m => m.id === missionId);
    if (!mission || (mission.status !== 'Generated' && mission.status !== 'Assigned')) return;

    let assignedThisClick = 0; let requirementsFullyMet = true;
    for (const [unitType, requiredCount] of Object.entries(mission.requiredUnits || {})) {
        const alreadyAssignedOfType = (mission.assignedUnits || [])
            .map(vId => vehicles.find(v => v.id === vId)).filter(v => v?.baseType === unitType).length;
        const neededNow = requiredCount - alreadyAssignedOfType;
        if (neededNow <= 0) continue;

        const availableVehicles = vehicles.filter(v =>
            v.baseType === unitType && (v.status === 'Idle' || v.status === 'Returning') && !(mission.assignedUnits || []).includes(v.id)
        );
        const limit = Math.min(neededNow, availableVehicles.length);
        for (let i = 0; i < limit; i++) { assignVehicleToMission(availableVehicles[i], mission); assignedThisClick++; }
        if (alreadyAssignedOfType + limit < requiredCount) requirementsFullyMet = false;
    }

    if (assignedThisClick > 0) {
        if (requirementsFullyMet) { mission.status = 'Assigned'; console.log(`Mission #${mission.id} fully assigned.`); }
        else { console.log(`Mission #${mission.id} partially assigned.`); }
        saveGameState(); updateUI();
    } else { alert(`No available (Idle or Returning) ${Object.keys(mission.requiredUnits || {}).join('/')}(s) found.`); }
}
function assignVehicleToMission(vehicle, mission) {
    if (!vehicle || !mission) { console.error("Assign failed: Invalid vehicle or mission."); return; }
    if (vehicle.status === 'Returning' && vehicle.movementIntervalId) {
        clearInterval(vehicle.movementIntervalId); vehicle.movementIntervalId = null;
    }
    vehicle.assignedMissionId = mission.id; vehicle.status = 'Responding';
    vehicle.destination = { ...mission.location }; vehicle.responseMode = `Code ${mission.urgency}`;
    if (!mission.assignedUnits) mission.assignedUnits = []; // Ensure array exists
    mission.assignedUnits.push(vehicle.id);
    updateMarkerPopup(vehicle); updateMarkerPopup(mission);
    startVehicleMovement(vehicle);
}

// --- Vehicle Movement & Arrival ---
function startVehicleMovement(vehicle) {
    if (!vehicle?.destination || !vehicle?.location) { console.error(`Movement Error V#${vehicle?.id}: Missing location/destination.`); return; }
    if (vehicle.movementIntervalId) { clearInterval(vehicle.movementIntervalId); vehicle.movementIntervalId = null; }

    const startLatLng = L.latLng(vehicle.location.lat, vehicle.location.lng);
    const endLatLng = L.latLng(vehicle.destination.lat, vehicle.destination.lng);
    const totalDistance = startLatLng.distanceTo(endLatLng);
    if (totalDistance < 1) { console.log(`V#${vehicle.id} already at destination.`); vehicleArrivedAtDestination(vehicle); return; } // Already arrived

    const speedMetersPerSecond = (vehicle.status === 'Returning' || vehicle.responseMode === 'Code 3') ? 15 : 25;
    const metersPerUpdate = speedMetersPerSecond * (MOVEMENT_UPDATE_INTERVAL_MS / 1000);
    let distanceCovered = 0;

    vehicle.movementIntervalId = setInterval(() => {
        if (!vehicle?.marker || !map.hasLayer(vehicle.marker)) {
             console.warn(`Movement Error V#${vehicle?.id}: Marker lost. Stopping.`);
             if (vehicle.movementIntervalId) clearInterval(vehicle.movementIntervalId);
             vehicle.movementIntervalId = null; return; // Stop if marker gone
        }
        distanceCovered += metersPerUpdate;
        const fraction = Math.min(1, distanceCovered / totalDistance);
        const currentLat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * fraction;
        const currentLng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * fraction;
        vehicle.location = { lat: currentLat, lng: currentLng };
        vehicle.marker.setLatLng([currentLat, currentLng]);

        if (startLatLng.distanceTo(L.latLng(currentLat, currentLng)) >= totalDistance) {
             vehicle.location = { ...vehicle.destination }; // Snap to final
             vehicle.marker.setLatLng([vehicle.location.lat, vehicle.location.lng]);
             vehicleArrivedAtDestination(vehicle);
        }
    }, MOVEMENT_UPDATE_INTERVAL_MS);
 }

function vehicleArrivedAtDestination(vehicle) {
    if (!vehicle) return;
    if(vehicle.movementIntervalId) { clearInterval(vehicle.movementIntervalId); vehicle.movementIntervalId = null; } // Ensure interval cleared

    const previousStatus = vehicle.status;
    console.log(`V#${vehicle.id} arrived. Status was: ${previousStatus}`);

    if (previousStatus === 'Responding') {
        vehicle.status = 'On Scene'; vehicle.destination = null;
        const mission = missions.find(m => m.id === vehicle.assignedMissionId);
        if (mission) {
            // Check if all required units (including self) are now On Scene
            let allRequiredUnitsOnScene = Object.entries(mission.requiredUnits || {}).every(([unitType, requiredCount]) => {
                 return (mission.assignedUnits || [])
                    .map(vId => vehicles.find(v => v.id === vId))
                    .filter(v => v?.baseType === unitType && (v.status === 'On Scene' || v.id === vehicle.id)) // Include self
                    .length >= requiredCount;
            });
            if (allRequiredUnitsOnScene && mission.status !== 'Completing' && mission.status !== 'Finished') {
                mission.status = 'Completing';
                if (mission.completionTimeoutId) clearTimeout(mission.completionTimeoutId);
                mission.completionTimeoutId = setTimeout(() => finishMission(mission.id), MISSION_COMPLETION_TIME_MS);
            }
        } else { // Mission gone? Reset vehicle
             console.warn(`V#${vehicle.id} arrived On Scene, mission ${vehicle.assignedMissionId} missing. Resetting.`);
             vehicle.status = 'Idle'; vehicle.assignedMissionId = null; vehicle.responseMode = 'Idle';
        }
    } else if (previousStatus === 'Returning') {
        vehicle.status = 'Idle'; vehicle.responseMode = 'Idle';
        vehicle.destination = null; vehicle.assignedMissionId = null;
    } else if (previousStatus === 'On Scene') {
        // Arrived while already On Scene? Likely movement interval didn't clear properly.
        console.warn(`V#${vehicle.id} 'arrived' while already On Scene.`);
        vehicle.destination = null; // Ensure destination is clear
    } else { // Unexpected status
         console.warn(`V#${vehicle.id} arrived with unexpected status: ${previousStatus}. Resetting.`);
         vehicle.status = 'Idle'; vehicle.responseMode = 'Idle';
         vehicle.destination = null; vehicle.assignedMissionId = null;
    }

    updateMarkerPopup(vehicle); // Update popup based on final status
    saveGameState();
    updateUI();
 }

function finishMission(missionId) {
    const missionIndex = missions.findIndex(m => m.id === missionId);
    if (missionIndex === -1) return;
    const mission = missions[missionIndex];
    if (mission.completionTimeoutId) { clearTimeout(mission.completionTimeoutId); mission.completionTimeoutId = null; }
    if (mission.status !== 'Completing') { console.warn(`Finishing Mission #${missionId} not in 'Completing' state (was ${mission.status}).`); }

    console.log(`Finishing Mission #${mission.id}: ${mission.type}. Reward: $${mission.reward}`);
    money += mission.reward || 0;
    mission.status = 'Finished';

    (mission.assignedUnits || []).forEach(vehicleId => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        // Ensure vehicle exists and was actually part of this mission completion phase
        if (vehicle && (vehicle.assignedMissionId === mission.id || vehicle.status === 'On Scene')) {
            const station = buildings.find(b => b.id === vehicle.stationId);
            if (station?.location) {
                vehicle.status = 'Returning'; vehicle.assignedMissionId = null;
                vehicle.destination = { ...station.location }; vehicle.responseMode = 'Code 3';
                updateMarkerPopup(vehicle);
                startVehicleMovement(vehicle);
            } else {
                 console.warn(`Cannot return V#${vehicle.id}: Station ${vehicle.stationId} missing/invalid. Setting Idle.`);
                 vehicle.status = 'Idle'; vehicle.assignedMissionId = null; vehicle.destination = null; vehicle.responseMode = 'Idle';
                 updateMarkerPopup(vehicle);
            }
        }
    });

    if (mission.marker && map.hasLayer(mission.marker)) { map.removeLayer(mission.marker); }
    missions.splice(missionIndex, 1); // Remove from active list
    saveGameState();
    updateUI();
}

// --- Manual Response Mode Change ---
function handleResponseModeChange(event) {
    const vehicleId = parseInt(event.target.dataset.vehicleId);
    const newMode = event.target.value;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.status === 'Idle') { // Only allow manual change if Idle
        vehicle.responseMode = newMode;
        console.log(`V#${vehicle.id} manually set Mode: ${newMode}`);
        updateMarkerPopup(vehicle);
        saveGameState();
    } else if (vehicle) { // Revert dropdown if change not allowed
        console.log(`Cannot change mode for V#${vehicle.id} while ${vehicle.status}`);
        event.target.value = vehicle.responseMode;
    }
}

// --- Persistence ---
const SAVE_KEY_BASE = 'sim_v4'; // Incremented version key
const SAVE_KEY_MONEY = `${SAVE_KEY_BASE}_money`;
const SAVE_KEY_BUILDINGS = `${SAVE_KEY_BASE}_buildings`;
const SAVE_KEY_VEHICLES = `${SAVE_KEY_BASE}_vehicles`;
const SAVE_KEY_MISSIONS = `${SAVE_KEY_BASE}_missions`;
const SAVE_KEY_BUILDING_ID = `${SAVE_KEY_BASE}_buildingId`;
const SAVE_KEY_VEHICLE_ID = `${SAVE_KEY_BASE}_vehicleId`;
const SAVE_KEY_MISSION_ID = `${SAVE_KEY_BASE}_missionId`;

function saveGameState() {
     try {
        // Prepare data, ensuring only serializable properties are included
        const buildingsToSave = buildings.map(({ marker, ...rest }) => ({ ...rest }));
        const vehiclesToSave = vehicles.map(({ marker, movementIntervalId, ...rest }) => ({ ...rest }));
        const missionsToSave = missions.map(({ marker, completionTimeoutId, ...rest }) => ({ ...rest }));

        localStorage.setItem(SAVE_KEY_MONEY, money.toString());
        localStorage.setItem(SAVE_KEY_BUILDINGS, JSON.stringify(buildingsToSave));
        localStorage.setItem(SAVE_KEY_VEHICLES, JSON.stringify(vehiclesToSave));
        localStorage.setItem(SAVE_KEY_MISSIONS, JSON.stringify(missionsToSave));
        localStorage.setItem(SAVE_KEY_BUILDING_ID, nextBuildingId.toString());
        localStorage.setItem(SAVE_KEY_VEHICLE_ID, nextVehicleId.toString());
        localStorage.setItem(SAVE_KEY_MISSION_ID, nextMissionId.toString());
    } catch (error) { console.error("Save Error:", error); }
}

function loadGameState() {
    console.log(`Attempting to load game state (Key Base: ${SAVE_KEY_BASE})...`);
    const savedMoney = localStorage.getItem(SAVE_KEY_MONEY);
    const savedBuildings = localStorage.getItem(SAVE_KEY_BUILDINGS);
    const savedVehicles = localStorage.getItem(SAVE_KEY_VEHICLES);
    const savedMissions = localStorage.getItem(SAVE_KEY_MISSIONS);
    const savedBuildingId = localStorage.getItem(SAVE_KEY_BUILDING_ID);
    const savedVehicleId = localStorage.getItem(SAVE_KEY_VEHICLE_ID);
    const savedMissionId = localStorage.getItem(SAVE_KEY_MISSION_ID);

    let loaded = false;
    // Load counters and money
    if (savedMoney !== null) { money = parseInt(savedMoney, 10) || 100000; loaded = true; }
    nextBuildingId = parseInt(savedBuildingId, 10) || 1;
    nextVehicleId = parseInt(savedVehicleId, 10) || 1;
    nextMissionId = parseInt(savedMissionId, 10) || 1;

    // Load Buildings
    if (savedBuildings) { try {
        buildings = JSON.parse(savedBuildings);
        buildings.forEach(b => { // Add defaults for older saves
            b.customName = b.customName || null; b.cost = b.cost || 50000;
            createMarker(b, buildingIcon, ''); updateMarkerPopup(b);
        });
     } catch (e) { console.error("Parse Buildings Error:", e); buildings = []; loaded = false;} } // Reset on error

    // Load Vehicles (AFTER buildings to ensure stations exist for cleanup)
    if (savedVehicles) { try {
        vehicles = JSON.parse(savedVehicles);
        vehicles.forEach(v => { // Add defaults and recreate markers/movement
            v.responseMode = v.responseMode || 'Idle'; v.status = v.status || 'Idle';
            v.movementIntervalId = null; v.customName = v.customName || null;
            v.cost = v.cost || 15000; v.pumpType = v.pumpType || null; v.crewCapacity = v.crewCapacity || null;

            createMarker(v, vehicleIcon, ''); // Create marker first
            updateMarkerPopup(v);             // Then update popup

            // Resume movement if applicable
            if ((v.status === 'Responding' || v.status === 'Returning') && v.destination) {
                startVehicleMovement(v);
            } else if (v.status !== 'Idle' && v.status !== 'On Scene') { // Cleanup bad states
                 console.warn(`Load Cleanup: Resetting V#${v.id} (was ${v.status}, dest: ${!!v.destination})`);
                 v.status = 'Idle'; v.assignedMissionId = null; v.destination = null; v.responseMode = 'Idle';
                 const station = buildings.find(b => b.id === v.stationId) || buildings[0];
                 if (station?.location) { v.location = {...station.location}; if(v.marker) v.marker.setLatLng([v.location.lat, v.location.lng]); }
                 updateMarkerPopup(v); // Update popup after status change
            }
        });
     } catch (e) { console.error("Parse Vehicles Error:", e); vehicles = []; loaded = false;} } // Reset on error

     // Load Missions (AFTER vehicles for consistency checks)
     if (savedMissions) { try {
        missions = JSON.parse(savedMissions);
        missions.forEach(m => { // Add defaults and recreate markers/timers
            m.completionTimeoutId = null; m.assignedUnits = m.assignedUnits || [];
            createMarker(m, missionIcon, ''); updateMarkerPopup(m);

            if (m.status === 'Completing') {
                if (m.completionTimeoutId) clearTimeout(m.completionTimeoutId);
                m.completionTimeoutId = setTimeout(() => finishMission(m.id), MISSION_COMPLETION_TIME_MS);
            } else if (m.status === 'Assigned' || m.status === 'Responding') {
                 // Check if assigned vehicles are still validly assigned/responding
                 const assignedVehiclesOk = m.assignedUnits.every(vId => {
                     const v = vehicles.find(v => v.id === vId);
                     return v && v.assignedMissionId === m.id && (v.status === 'Responding' || v.status === 'On Scene');
                 });
                 if (!assignedVehiclesOk) {
                      console.warn(`Load Cleanup: Resetting Mission #${m.id} to Generated (vehicle state mismatch)`);
                      m.status = 'Generated';
                      m.assignedUnits = m.assignedUnits.filter(vId => { // Keep only validly assigned ones
                            const v = vehicles.find(v => v.id === vId);
                            return v && v.assignedMissionId === m.id && (v.status === 'Responding' || v.status === 'On Scene');
                      });
                      if (m.assignedUnits.length === 0) m.status = 'Generated'; // Explicitly set if all removed
                      updateMarkerPopup(m); // Update mission marker text
                 }
             }
        });
        missions = missions.filter(m => m.status !== 'Finished'); // Remove any finished missions
     } catch (e) { console.error("Parse Missions Error:", e); missions = []; loaded = false;} } // Reset on error

    if (loaded) console.log("Game state loaded successfully.");
    else console.log("No valid saved state found or error during load, starting fresh.");

    startMissionGeneration(); // Attempt to start generation timer
}

// --- Event Listeners ---
buyStationBtn.addEventListener('click', () => startBuildingPlacement(buyStationBtn));
cancelPlacementBtn.addEventListener('click', cancelBuildingPlacement);
buyCfaTanker4Btn.addEventListener('click', () => buyVehicle(buyCfaTanker4Btn));
buyCfaTanker2Btn.addEventListener('click', () => buyVehicle(buyCfaTanker2Btn));
buyCfaTanker24DBtn.addEventListener('click', () => buyVehicle(buyCfaTanker24DBtn));
// Dynamic listeners (Assign, Rename, Sell, Select) are attached in updateUI

// --- Initial Setup ---
loadGameState(); // Load state first
updateUI();      // THEN update the UI based on loaded state

console.log("Dispatch Simulator Initialized.");
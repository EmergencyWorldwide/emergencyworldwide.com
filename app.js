// Initialize the map after DOM is fully loaded
window.addEventListener('load', () => {
    const map = L.map('map').setView([51.505, -0.09], 13);  // Set initial map center and zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ensure map size recalculates when the window is resized
    window.addEventListener('resize', () => {
        map.invalidateSize();
    });

    // Game Data
    let funds = 1000000;
    let buildings = [];
    let vehicles = [];
    let missionTimer;

    // Update funds display
    function updateFunds() {
        document.getElementById('funds').textContent = funds.toLocaleString();
    }

    // Add notification
    function addNotification(message) {
        const notificationList = document.getElementById('notificationList');
        const notification = document.createElement('li');
        notification.textContent = message;
        notificationList.appendChild(notification);
    }

    // Buy Fire Station
    document.getElementById('buyFireStation').addEventListener('click', () => {
        if (funds >= 500000) {
            funds -= 500000;
            updateFunds();
            addNotification('You have bought a Fire Station.');
            placeBuilding('Fire Station');
        } else {
            addNotification('Not enough funds to buy Fire Station.');
        }
    });

    // Buy Ambulance
    document.getElementById('buyAmbulance').addEventListener('click', () => {
        if (funds >= 200000) {
            funds -= 200000;
            updateFunds();
            addNotification('You have bought an Ambulance.');
            vehicles.push('Ambulance');
        } else {
            addNotification('Not enough funds to buy Ambulance.');
        }
    });

    // Place building on map
    function placeBuilding(buildingType) {
        const marker = L.marker(map.getCenter()).addTo(map);  // Place at map center for simplicity
        marker.bindPopup(`<b>${buildingType}</b>`).openPopup();
        buildings.push({ type: buildingType, location: map.getCenter() });
    }

    // Auto-generate missions every minute
    function generateMissions() {
        missionTimer = setInterval(() => {
            const missionType = ['Fire', 'Medical', 'Accident'][Math.floor(Math.random() * 3)];
            const mission = {
                type: missionType,
                location: [51.505 + (Math.random() - 0.5) * 0.05, -0.09 + (Math.random() - 0.5) * 0.05]
            };
            addNotification(`New mission: ${mission.type} at ${mission.location[0].toFixed(4)}, ${mission.location[1].toFixed(4)}`);
            L.marker(mission.location).addTo(map).bindPopup(`Mission: ${mission.type}`).openPopup();
        }, 60000);  // Generate missions every 60 seconds
    }

    // Start mission generation when the game loads
    generateMissions();

    // Auto-save game data periodically
    setInterval(() => {
        localStorage.setItem('gameData', JSON.stringify({ funds, buildings, vehicles }));
    }, 30000);  // Save every 30 seconds

    // Load saved data
    const savedData = JSON.parse(localStorage.getItem('gameData'));
    if (savedData) {
        funds = savedData.funds;
        buildings = savedData.buildings;
        vehicles = savedData.vehicles;
        updateFunds();
        addNotification('Game loaded from save.');
    }
});

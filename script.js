// Vehicle Costs
const vehicleCosts = {
    ambulance: 50,
    firetruck: 80,
    policecar: 70,
};

// User Funds Management
let funds = JSON.parse(localStorage.getItem('funds')) || 500; // Initial funds

function canDispatchVehicle(type) {
    return funds >= vehicleCosts[type];
}

function dispatchVehicle(type, lat, lng) {
    if (canDispatchVehicle(type)) {
        funds -= vehicleCosts[type];
        localStorage.setItem('funds', JSON.stringify(funds));
        generateMission(lat, lng, type);
        updateFundsDisplay();
    } else {
        alert("Insufficient funds to dispatch this vehicle!");
    }
}

map.on('click', function(e) {
    if (selectedType !== '') {
        dispatchVehicle(selectedType, e.latlng.lat, e.latlng.lng);
        const marker = L.marker(e.latlng).addTo(map);
        marker.bindPopup(selectedType.charAt(0).toUpperCase() + selectedType.slice(1)).openPopup();
        selectedType = '';  // Reset selection after placing
    }
});

function updateFundsDisplay() {
    document.getElementById('rewards').textContent = `Money: $${funds}`;
}
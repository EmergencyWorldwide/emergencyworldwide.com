# Aussie Fire Chief Simulator

A simulation game where you manage emergency services across Australia. Build fire stations, hospitals, purchase vehicles, and respond to emergencies.

## Features

- Interactive OpenStreetMap integration centered on Australia
- Purchase and place emergency buildings (fire stations, hospitals)
- Buy emergency vehicles (fire trucks, ambulances)
- Automatic mission generation every minute near existing buildings
- Automatic game state saving
- Real-time updates using WebSocket

## Installation

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser and navigate to `http://localhost:5000`

## How to Play

1. Start with $1,000,000 AUD budget
2. Click building buttons to select a building type
3. Click on the map to place the selected building
4. Purchase vehicles that will be assigned to your buildings
5. Respond to emergency missions that appear on the map
6. Click on buildings to view their details and manage vehicles
7. Sell buildings or vehicles for 70% of their original cost if needed

## Prices

Buildings:
- Fire Station: $500,000
- Hospital: $1,000,000

Vehicles:
- Fire Truck: $100,000
- Ambulance: $80,000
- FRNSW Truck: $120,000
- CFA Truck: $110,000
- CFA Heavy Pumper: $150,000
- FRV Heavy Pumper: $150,000

## Refund System

- All buildings and vehicles can be sold for 70% of their original purchase price
- When selling a building, all vehicles stationed at that building will also be sold automatically
- To sell a building: Click the building marker and use the "Sell Building" button
- To sell a vehicle: Click the building marker and use the "Sell" button next to the vehicle in the list

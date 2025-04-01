# Australian Fire Chief Simulator

A web-based simulation game where you manage Tasmanian Fire Service (TFS) stations and vehicles.

## Features

- Interactive OpenStreetMap integration centered on Tasmania
- Purchase and place fire stations
- Manage a fleet of TFS vehicles
- Automatic mission generation every minute
- Real-time mission updates
- Budget management system with periodic income
- Rank system with XP progression
- Season Pass system with bonus rewards
- Refund system for buildings and vehicles

## Budget System

- Start with $500,000
- Earn periodic income every 2 minutes:
  - Base income: $10,000
  - Rank bonus: $2,000 per rank level
- Mission rewards:
  - Base reward: $2,000 - $5,000
  - Rank bonus: $1,000 per rank level

## Costs

### Buildings
- Fire Station: $200,000

### Vehicles
- TFS Support: $25,000
- TFS Light Tanker: $35,000
- TFS Command Support: $40,000
- TFS Medium Tanker: $45,000
- TFS Medium Pumper: $50,000
- TFS Rescue: $60,000
- TFS Heavy Tanker: $65,000
- TFS CAFS Tanker: $70,000
- TFS Heavy Pumper: $75,000
- TFS HazMat: $80,000
- TFS Heavy Tanker/Pumper: $85,000
- TFS Heavy Tanker/Pumper/Rescue: $95,000
- TFS Hydraulic Platform: $120,000

### Other
- Season Pass: $1,000 (Earn double XP)

## Setup

1. Install the required packages:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your web browser and navigate to `http://localhost:5000`

## How to Play

1. Start with $500,000 budget
2. Place fire stations on the map ($200,000 each)
3. Purchase vehicles for your stations (ranging from $25,000 to $120,000)
4. Respond to automatically generated missions that appear on the map
5. Earn money from periodic income and completed missions
6. Progress through ranks to earn higher income and mission rewards
7. Consider buying the season pass to earn double XP
8. Manage your resources and budget effectively

The game automatically saves your progress and generates new missions every minute.

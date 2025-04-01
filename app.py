from datetime import datetime
import random
import time
import threading
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///game.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Constants
BUILDINGS = {
    'Fire Station': {'cost': 200000}
}

VEHICLES = {
    'TFS Support': {'cost': 25000},
    'TFS Light Tanker': {'cost': 35000},
    'TFS Command Support': {'cost': 40000},
    'TFS Medium Tanker': {'cost': 45000},
    'TFS Medium Pumper': {'cost': 50000},
    'TFS Rescue': {'cost': 60000},
    'TFS Heavy Tanker': {'cost': 65000},
    'TFS CAFS Tanker': {'cost': 70000},
    'TFS Heavy Pumper': {'cost': 75000},
    'TFS HazMat': {'cost': 80000},
    'TFS Heavy Tanker/Pumper': {'cost': 85000},
    'TFS Heavy Tanker/Pumper/Rescue': {'cost': 95000},
    'TFS Hydraulic Platform': {'cost': 120000}
}

RANKS = {
    1: {'name': 'Recruit', 'xp_required': 0},
    2: {'name': 'Firefighter', 'xp_required': 1000},
    3: {'name': 'Senior Firefighter', 'xp_required': 2500},
    4: {'name': 'Leading Firefighter', 'xp_required': 5000},
    5: {'name': 'Station Officer', 'xp_required': 10000},
    6: {'name': 'Senior Station Officer', 'xp_required': 20000},
    7: {'name': 'District Officer', 'xp_required': 35000},
    8: {'name': 'Chief Officer', 'xp_required': 50000}
}

SEASON_LEVELS = {
    'xp_per_level': 1000,
    'max_level': 100
}

# Database Models
class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    budget = db.Column(db.Float, default=500000.0)
    last_save = db.Column(db.DateTime, default=datetime.utcnow)
    last_income = db.Column(db.DateTime, default=datetime.utcnow)
    rank = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    season_pass = db.Column(db.Boolean, default=False)
    season_level = db.Column(db.Integer, default=1)
    season_xp = db.Column(db.Integer, default=0)

class Building(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    vehicles = db.relationship('Vehicle', backref='station', lazy=True)

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    station_id = db.Column(db.Integer, db.ForeignKey('building.id'))
    status = db.Column(db.String(20), default='available')

class Mission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    xp_reward = db.Column(db.Integer)

def spawn_mission():
    with app.app_context():
        buildings = Building.query.all()
        if buildings:
            building = random.choice(buildings)
            lat_offset = random.uniform(-0.01, 0.01)
            lon_offset = random.uniform(-0.01, 0.01)
            
            mission = Mission(
                type='FIRE',
                lat=building.lat + lat_offset,
                lon=building.lon + lon_offset,
                xp_reward=random.randint(100, 500)
            )
            db.session.add(mission)
            db.session.commit()

def mission_spawner():
    while True:
        spawn_mission()
        time.sleep(60)  # Spawn a new mission every minute

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/game_state')
def get_game_state():
    state = GameState.query.first()
    if not state:
        state = GameState()
        db.session.add(state)
        db.session.commit()
    
    # Add periodic income (every 2 minutes)
    now = datetime.utcnow()
    if (now - state.last_income).total_seconds() >= 120:
        income_cycles = int((now - state.last_income).total_seconds() / 120)
        base_income = 10000  # $10k base income
        rank_bonus = state.rank * 2000  # $2k extra per rank
        total_income = (base_income + rank_bonus) * income_cycles
        
        state.budget += total_income
        state.last_income = now
        db.session.commit()
    
    # Auto-save
    if (now - state.last_save).total_seconds() >= 60:
        state.last_save = now
        db.session.commit()
    
    current_rank = RANKS[state.rank]
    next_rank = RANKS.get(state.rank + 1)
    
    return jsonify({
        'budget': state.budget,
        'last_save': state.last_save.isoformat(),
        'rank': state.rank,
        'rank_name': current_rank['name'],
        'xp': state.xp,
        'next_rank_xp': next_rank['xp_required'] if next_rank else None,
        'season_pass': state.season_pass,
        'season_level': state.season_level,
        'season_xp': state.season_xp,
        'xp_to_next_season_level': SEASON_LEVELS['xp_per_level']
    })

@app.route('/api/missions')
def get_missions():
    missions = Mission.query.filter_by(status='active').all()
    return jsonify([{
        'id': m.id,
        'type': m.type,
        'lat': m.lat,
        'lon': m.lon,
        'status': m.status,
        'xp_reward': m.xp_reward
    } for m in missions])

@app.route('/api/buildings', methods=['GET', 'POST'])
def handle_buildings():
    if request.method == 'POST':
        data = request.json
        state = GameState.query.first()
        
        building_cost = BUILDINGS[data['type']]['cost']
        if state.budget >= building_cost:
            building = Building(
                type=data['type'],
                lat=data['lat'],
                lon=data['lon']
            )
            state.budget -= building_cost
            db.session.add(building)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'error': 'Insufficient funds'})
    
    buildings = Building.query.all()
    return jsonify([{
        'id': b.id,
        'type': b.type,
        'lat': b.lat,
        'lon': b.lon
    } for b in buildings])

@app.route('/api/vehicles', methods=['GET', 'POST'])
def handle_vehicles():
    if request.method == 'POST':
        data = request.json
        state = GameState.query.first()
        
        vehicle_cost = VEHICLES[data['type']]['cost']
        if state.budget >= vehicle_cost:
            vehicle = Vehicle(
                type=data['type'],
                station_id=data['station_id']
            )
            state.budget -= vehicle_cost
            db.session.add(vehicle)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'error': 'Insufficient funds'})
    
    vehicles = Vehicle.query.all()
    return jsonify([{
        'id': v.id,
        'type': v.type,
        'station_id': v.station_id,
        'status': v.status
    } for v in vehicles])

@app.route('/api/buildings/<int:building_id>/refund', methods=['POST'])
def refund_building(building_id):
    building = Building.query.get_or_404(building_id)
    state = GameState.query.first()
    
    # Check if building has vehicles
    if Vehicle.query.filter_by(station_id=building.id).first():
        return jsonify({'error': 'Cannot refund building with vehicles. Refund vehicles first.'})
    
    # Calculate refund amount (50% of original cost)
    refund = BUILDINGS[building.type]['cost'] * 0.5
    state.budget += refund
    
    db.session.delete(building)
    db.session.commit()
    
    return jsonify({'refund': refund})

@app.route('/api/vehicles/<int:vehicle_id>/refund', methods=['POST'])
def refund_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    state = GameState.query.first()
    
    # Check if vehicle is available
    if vehicle.status != 'available':
        return jsonify({'error': 'Cannot refund vehicle that is currently on a mission.'})
    
    # Calculate refund amount (50% of original cost)
    refund = VEHICLES[vehicle.type]['cost'] * 0.5
    state.budget += refund
    
    db.session.delete(vehicle)
    db.session.commit()
    
    return jsonify({'refund': refund})

@app.route('/api/missions/<int:mission_id>/dispatch', methods=['POST'])
def dispatch_to_mission(mission_id):
    data = request.json
    state = GameState.query.first()
    mission = Mission.query.get_or_404(mission_id)
    
    if mission.status != 'active':
        return jsonify({'error': 'Mission is no longer active'})
    
    # Mark vehicles as dispatched
    for vehicle_id in data['vehicle_ids']:
        vehicle = Vehicle.query.get(vehicle_id)
        if vehicle and vehicle.status == 'available':
            vehicle.status = 'dispatched'
    
    # Complete mission
    mission.status = 'completed'
    
    # Award XP
    xp_gained = mission.xp_reward
    season_xp_gained = mission.xp_reward
    
    if state.season_pass:
        xp_gained *= 2
        season_xp_gained *= 2
    
    state.xp += xp_gained
    state.season_xp += season_xp_gained
    
    # Check for rank up
    while state.rank < 8:  # Max rank is 8
        next_rank = RANKS.get(state.rank + 1)
        if next_rank and state.xp >= next_rank['xp_required']:
            state.rank += 1
        else:
            break
    
    # Check for season level up
    while state.season_xp >= SEASON_LEVELS['xp_per_level']:
        if state.season_level < SEASON_LEVELS['max_level']:
            state.season_xp -= SEASON_LEVELS['xp_per_level']
            state.season_level += 1
        else:
            state.season_xp = SEASON_LEVELS['xp_per_level']  # Cap at max
            break
    
    db.session.commit()
    
    # Return vehicles to available status after 30 seconds
    def return_vehicles():
        time.sleep(30)
        with app.app_context():
            for vehicle_id in data['vehicle_ids']:
                vehicle = Vehicle.query.get(vehicle_id)
                if vehicle:
                    vehicle.status = 'available'
            db.session.commit()
    
    threading.Thread(target=return_vehicles).start()
    
    return jsonify({
        'success': True,
        'xp_gained': xp_gained,
        'season_xp_gained': season_xp_gained
    })

@app.route('/api/purchase_season_pass', methods=['POST'])
def purchase_season_pass():
    state = GameState.query.first()
    
    if state.season_pass:
        return jsonify({'error': 'You already own the Season Pass'})
    
    if state.budget >= 1000:
        state.budget -= 1000
        state.season_pass = True
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'error': 'Insufficient funds'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not GameState.query.first():
            db.session.add(GameState())
            db.session.commit()
    
    # Start mission spawner in a background thread
    mission_thread = threading.Thread(target=mission_spawner)
    mission_thread.daemon = True
    mission_thread.start()
    
    app.run(debug=True)

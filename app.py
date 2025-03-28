from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
import random
import time
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'aussie_fire_chief_secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///game.db'
db = SQLAlchemy(app)
socketio = SocketIO(app)

class Building(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # fire_station, hospital, etc.
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    cost = db.Column(db.Integer)

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # fire_truck, ambulance, etc.
    building_id = db.Column(db.Integer, db.ForeignKey('building.id'))
    cost = db.Column(db.Integer)

class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    budget = db.Column(db.Integer)
    last_save = db.Column(db.DateTime, default=datetime.utcnow)

class Mission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    status = db.Column(db.String(20))  # active, assigned, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=True)
    description = db.Column(db.String(200))
    assigned_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

# Mission types and their descriptions
MISSION_TYPES = {
    'bush_fire': {
        'description': 'Bush fire reported in the area. Requires immediate response.',
        'color': 'danger'
    },
    'structure_fire': {
        'description': 'Structure fire reported. Building evacuation in progress.',
        'color': 'danger'
    },
    'medical': {
        'description': 'Medical emergency reported. Ambulance required.',
        'color': 'warning'
    },
    'hazmat': {
        'description': 'Hazardous materials incident reported.',
        'color': 'warning'
    }
}

# Vehicle types and their capabilities
VEHICLE_TYPES = {
    'fire_truck': ['bush_fire', 'structure_fire'],
    'ambulance': ['medical'],
    'cfa_pumper': ['bush_fire', 'structure_fire', 'hazmat'],
    'frv_pumper': ['structure_fire', 'hazmat']
}

# Initialize database
def initialize_database():
    with app.app_context():
        # Drop all tables
        db.drop_all()
        # Create all tables
        db.create_all()
        # Initialize game state
        if not GameState.query.first():
            initial_state = GameState(budget=2000000)  # 2 million AUD starting budget
            db.session.add(initial_state)
            db.session.commit()

# Initialize database when app starts
initialize_database()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/state')
def get_state():
    state = GameState.query.first()
    buildings = Building.query.all()
    vehicles = Vehicle.query.all()
    active_missions = Mission.query.filter(Mission.status != 'completed').all()
    
    return jsonify({
        'budget': state.budget,
        'buildings': [{
            'id': b.id,
            'type': b.type,
            'lat': b.lat,
            'lng': b.lng,
            'vehicles': [{'id': v.id, 'type': v.type} for v in Vehicle.query.filter_by(building_id=b.id)]
        } for b in buildings],
        'missions': [{
            'id': m.id,
            'type': m.type,
            'lat': m.lat,
            'lng': m.lng,
            'status': m.status,
            'description': m.description,
            'assigned_vehicle_id': m.assigned_vehicle_id
        } for m in active_missions]
    })

@app.route('/api/purchase', methods=['POST'])
def purchase():
    try:
        data = request.json
        item_type = data.get('type')
        lat = data.get('lat')
        lng = data.get('lng')
        building_id = data.get('building_id')
        
        if not item_type:
            return jsonify({'error': 'Item type is required'}), 400

        prices = {
            'fire_station': 500000,
            'hospital': 1000000,
            'fire_truck': 100000,
            'ambulance': 80000,
            'cfa_pumper': 150000,
            'frv_pumper': 150000
        }
        
        if item_type not in prices:
            return jsonify({'error': f'Invalid item type: {item_type}'}), 400
        
        state = GameState.query.first()
        if not state:
            return jsonify({'error': 'Game state not initialized'}), 500
            
        if state.budget < prices[item_type]:
            return jsonify({'error': 'Insufficient funds'}), 400
        
        if item_type in ['fire_station', 'hospital']:
            if not lat or not lng:
                return jsonify({'error': 'Location required for buildings'}), 400
            building = Building(type=item_type, lat=lat, lng=lng, cost=prices[item_type])
            db.session.add(building)
            db.session.commit()  # Commit to get the building ID
            state.budget -= prices[item_type]
            db.session.commit()
            return jsonify({
                'success': True,
                'building_id': building.id,
                'type': building.type,
                'lat': building.lat,
                'lng': building.lng
            })
        else:  # vehicles
            if not building_id:
                return jsonify({'error': 'Building ID required for vehicles'}), 400
            building = Building.query.get(building_id)
            if not building:
                return jsonify({'error': 'Building not found'}), 404
            vehicle = Vehicle(type=item_type, building_id=building_id, cost=prices[item_type])
            db.session.add(vehicle)
            state.budget -= prices[item_type]
            db.session.commit()
            return jsonify({
                'success': True,
                'vehicle_id': vehicle.id,
                'type': vehicle.type,
                'building_id': vehicle.building_id
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/refund', methods=['POST'])
def refund():
    data = request.json
    item_id = data['id']
    item_type = data['type']
    refund_rate = 0.7  # 70% refund of original cost
    
    if item_type == 'building':
        building = Building.query.get(item_id)
        if building:
            # First refund any vehicles attached to this building
            vehicles = Vehicle.query.filter_by(building_id=building.id).all()
            for vehicle in vehicles:
                state = GameState.query.first()
                refund_amount = int(vehicle.cost * refund_rate)
                state.budget += refund_amount
                db.session.delete(vehicle)
            
            # Then refund the building itself
            state = GameState.query.first()
            refund_amount = int(building.cost * refund_rate)
            state.budget += refund_amount
            db.session.delete(building)
            db.session.commit()
            return jsonify({'success': True, 'refund_amount': refund_amount})
    
    elif item_type == 'vehicle':
        vehicle = Vehicle.query.get(item_id)
        if vehicle:
            state = GameState.query.first()
            refund_amount = int(vehicle.cost * refund_rate)
            state.budget += refund_amount
            db.session.delete(vehicle)
            db.session.commit()
            return jsonify({'success': True, 'refund_amount': refund_amount})
    
    return jsonify({'error': 'Item not found'}), 404

@app.route('/api/buildings/<int:building_id>/vehicles')
def get_building_vehicles(building_id):
    """Get all vehicles at a building with their current status."""
    try:
        vehicles = Vehicle.query.filter_by(building_id=building_id).all()
        assigned_missions = {
            m.assigned_vehicle_id: m 
            for m in Mission.query.filter_by(status='assigned').all()
        }
        
        return jsonify([{
            'id': v.id,
            'type': v.type,
            'cost': v.cost,
            'assigned_to_mission': v.id in assigned_missions,
            'mission_id': assigned_missions[v.id].id if v.id in assigned_missions else None,
            'mission_type': assigned_missions[v.id].type if v.id in assigned_missions else None,
            'capabilities': VEHICLE_TYPES.get(v.type, [])
        } for v in vehicles])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/missions')
def get_missions():
    missions = Mission.query.filter(Mission.status != 'completed').all()
    return jsonify([{
        'id': m.id,
        'type': m.type,
        'lat': m.lat,
        'lng': m.lng,
        'status': m.status,
        'created_at': m.created_at.isoformat(),
        'description': m.description,
        'assigned_vehicle_id': m.assigned_vehicle_id
    } for m in missions])

def generate_mission():
    """Generate a new mission with appropriate location and details."""
    try:
        # Base coordinates for Victoria, Australia
        base_lat = -37.8136
        base_lng = 144.9631
        
        # Random coordinates within Victoria
        lat = base_lat + (random.random() - 0.5) * 2  # ±1 degree
        lng = base_lng + (random.random() - 0.5) * 2  # ±1 degree
        
        # Select random mission type
        mission_type = random.choice(list(MISSION_TYPES.keys()))
        mission_info = MISSION_TYPES[mission_type]
        
        # Create mission
        mission = Mission(
            type=mission_type,
            lat=lat,
            lng=lng,
            status='active',
            description=mission_info['description'],
            created_at=datetime.utcnow()
        )
        
        db.session.add(mission)
        db.session.commit()
        
        # Emit new mission to all clients
        socketio.emit('new_mission', {
            'id': mission.id,
            'type': mission_type,
            'lat': lat,
            'lng': lng,
            'status': 'active',
            'description': mission_info['description'],
            'color': mission_info['color']
        })
        
    except Exception as e:
        print(f"Error generating mission: {str(e)}")
        db.session.rollback()

@app.route('/api/missions/<int:mission_id>/assign', methods=['POST'])
def assign_mission(mission_id):
    """Assign a vehicle to a mission, checking vehicle-mission type compatibility."""
    try:
        data = request.json
        vehicle_id = data.get('vehicle_id')
        
        if not vehicle_id:
            return jsonify({'error': 'Vehicle ID is required'}), 400
            
        mission = Mission.query.get(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404
            
        if mission.status != 'active':
            return jsonify({'error': 'Mission is not active'}), 400
            
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404
            
        # Check vehicle type compatibility with mission
        if mission.type not in VEHICLE_TYPES.get(vehicle.type, []):
            return jsonify({
                'error': f'{vehicle.type.replace("_", " ").title()} cannot handle {mission.type.replace("_", " ").title()} missions'
            }), 400
            
        # Check if vehicle is already assigned
        active_mission = Mission.query.filter_by(assigned_vehicle_id=vehicle_id, status='assigned').first()
        if active_mission:
            return jsonify({'error': 'Vehicle is already assigned to another mission'}), 400
        
        mission.assigned_vehicle_id = vehicle_id
        mission.status = 'assigned'
        mission.assigned_at = datetime.utcnow()
        db.session.commit()
        
        # Notify all clients about the mission update
        socketio.emit('mission_updated', {
            'id': mission.id,
            'status': 'assigned',
            'vehicle_id': vehicle_id
        })
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/missions/<int:mission_id>/complete', methods=['POST'])
def complete_mission(mission_id):
    """Complete a mission and free up the assigned vehicle."""
    try:
        mission = Mission.query.get(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404
            
        if mission.status != 'assigned':
            return jsonify({'error': 'Only assigned missions can be completed'}), 400
        
        mission.status = 'completed'
        mission.completed_at = datetime.utcnow()
        db.session.commit()
        
        # Notify all clients about the mission completion
        socketio.emit('mission_updated', {
            'id': mission.id,
            'status': 'completed'
        })
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def auto_save():
    while True:
        with app.app_context():
            state = GameState.query.first()
            state.last_save = datetime.utcnow()
            db.session.commit()
        time.sleep(60)

def mission_generator():
    while True:
        with app.app_context():
            generate_mission()
        time.sleep(60)

if __name__ == '__main__':
    from threading import Thread
    save_thread = Thread(target=auto_save)
    save_thread.daemon = True
    save_thread.start()
    
    mission_thread = Thread(target=mission_generator)
    mission_thread.daemon = True
    mission_thread.start()
    
    app.run(debug=True, port=5000)

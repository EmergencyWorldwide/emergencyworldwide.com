import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import random
from flask_socketio import SocketIO
import threading
import time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///911sim.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
socketio = SocketIO(app)

class EmergencyBuilding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # police, fire, hospital
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # police_car, ambulance, fire_truck
    building_id = db.Column(db.Integer, db.ForeignKey('emergency_building.id'))
    cost = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Mission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # crime, fire, medical
    status = db.Column(db.String(20), default='active')  # active, completed, failed
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    reward = db.Column(db.Integer, nullable=False)

with app.app_context():
    db.create_all()

def generate_mission():
    with app.app_context():
        # Get all buildings
        buildings = EmergencyBuilding.query.all()
        if not buildings:
            return

        # Pick a random building
        building = random.choice(buildings)
        
        # Generate a mission near the building
        radius = 0.01  # Roughly 1km
        lat = building.lat + random.uniform(-radius, radius)
        lon = building.lon + random.uniform(-radius, radius)
        
        # Mission type based on building type
        mission_types = {
            'police': ('crime', 'Armed robbery in progress', 5000),
            'fire': ('fire', 'Building fire reported', 7500),
            'hospital': ('medical', 'Medical emergency', 3000)
        }
        
        mission_type, description, reward = mission_types.get(building.type, ('unknown', 'Unknown emergency', 1000))
        
        # Create mission
        mission = Mission(
            type=mission_type,
            lat=lat,
            lon=lon,
            expires_at=datetime.utcnow() + timedelta(minutes=2),  
            reward=reward
        )
        
        db.session.add(mission)
        db.session.commit()
        
        # Emit new mission to all clients
        socketio.emit('new_mission', {
            'id': mission.id,
            'type': mission_type,
            'description': description,
            'lat': lat,
            'lon': lon,
            'reward': reward,
            'expires_at': mission.expires_at.isoformat()
        })

def mission_cleanup():
    with app.app_context():
        # Delete expired missions
        expired = Mission.query.filter(Mission.expires_at < datetime.utcnow()).all()
        for mission in expired:
            socketio.emit('mission_expired', {'id': mission.id})  
            db.session.delete(mission)
        db.session.commit()

def mission_generator():
    while True:
        try:
            generate_mission()
            mission_cleanup()
            # Wait until the start of the next minute
            next_minute = datetime.utcnow().replace(second=0, microsecond=0) + timedelta(minutes=1)
            sleep_seconds = (next_minute - datetime.utcnow()).total_seconds()
            if sleep_seconds > 0:
                time.sleep(sleep_seconds)
        except Exception as e:
            print(f"Error in mission generator: {e}")
            time.sleep(60)  

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/buildings', methods=['GET', 'POST'])
def buildings():
    if request.method == 'POST':
        data = request.json
        building = EmergencyBuilding(
            name=data['name'],
            type=data['type'],
            lat=data['lat'],
            lon=data['lon'],
            cost=data['cost']
        )
        db.session.add(building)
        db.session.commit()
        return jsonify({'success': True, 'id': building.id})
    
    buildings = EmergencyBuilding.query.all()
    return jsonify([{
        'id': b.id,
        'name': b.name,
        'type': b.type,
        'lat': b.lat,
        'lon': b.lon,
        'cost': b.cost
    } for b in buildings])

@app.route('/api/buildings/<int:building_id>', methods=['DELETE'])
def delete_building(building_id):
    building = EmergencyBuilding.query.get(building_id)
    if building:
        # Delete associated vehicles first
        vehicles = Vehicle.query.filter_by(building_id=building_id).all()
        refund = building.cost * 0.5  # 50% refund for building
        for vehicle in vehicles:
            refund += vehicle.cost * 0.7  # 70% refund for vehicles
            db.session.delete(vehicle)
        db.session.delete(building)
        db.session.commit()
        return jsonify({'success': True, 'refund': refund})
    return jsonify({'success': False}), 404

@app.route('/api/vehicles', methods=['GET', 'POST'])
def vehicles():
    if request.method == 'POST':
        data = request.json
        vehicle = Vehicle(
            name=data['name'],
            type=data['type'],
            building_id=data['building_id'],
            cost=data['cost']
        )
        db.session.add(vehicle)
        db.session.commit()
        return jsonify({'success': True, 'id': vehicle.id})
    
    vehicles = Vehicle.query.all()
    return jsonify([{
        'id': v.id,
        'name': v.name,
        'type': v.type,
        'building_id': v.building_id,
        'cost': v.cost
    } for v in vehicles])

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    if vehicle:
        refund = vehicle.cost * 0.7  # 70% refund for vehicles
        db.session.delete(vehicle)
        db.session.commit()
        return jsonify({'success': True, 'refund': refund})
    return jsonify({'success': False}), 404

@app.route('/api/missions', methods=['GET'])
def get_missions():
    missions = Mission.query.filter(Mission.expires_at > datetime.utcnow()).all()
    return jsonify([{
        'id': m.id,
        'type': m.type,
        'lat': m.lat,
        'lon': m.lon,
        'reward': m.reward,
        'expires_at': m.expires_at.isoformat()
    } for m in missions])

@app.route('/api/missions/<int:mission_id>/complete', methods=['POST'])
def complete_mission(mission_id):
    mission = Mission.query.get(mission_id)
    if mission and mission.expires_at > datetime.utcnow():
        mission.status = 'completed'
        db.session.commit()
        return jsonify({'success': True, 'reward': mission.reward})
    return jsonify({'success': False}), 404

if __name__ == '__main__':
    # Start mission generator in a background thread
    mission_thread = threading.Thread(target=mission_generator, daemon=True)
    mission_thread.start()
    
    app.run(debug=True, port=8080)

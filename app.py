from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
import threading
import time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///game.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Building(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # 'fire_station', 'hospital', etc.
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    cost = db.Column(db.Integer)

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # 'fire_truck', 'ambulance', etc.
    building_id = db.Column(db.Integer, db.ForeignKey('building.id'))
    cost = db.Column(db.Integer)

class Mission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    lat = db.Column(db.Float)
    lon = db.Column(db.Float)
    status = db.Column(db.String(20))  # 'active', 'completed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    budget = db.Column(db.Integer)
    last_save = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()
    if not GameState.query.first():
        initial_state = GameState(budget=1000000)
        db.session.add(initial_state)
        db.session.commit()

def spawn_mission():
    while True:
        with app.app_context():
            buildings = Building.query.all()
            if buildings:
                building = random.choice(buildings)
                mission = Mission(
                    type='fire',
                    lat=building.lat + random.uniform(-0.01, 0.01),
                    lon=building.lon + random.uniform(-0.01, 0.01),
                    status='active'
                )
                db.session.add(mission)
                db.session.commit()
        time.sleep(60)  # Wait one minute before spawning next mission

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/state')
def get_state():
    game_state = GameState.query.first()
    return jsonify({
        'budget': game_state.budget
    })

@app.route('/api/buildings', methods=['GET', 'POST'])
def handle_buildings():
    if request.method == 'POST':
        data = request.json
        building = Building(
            type=data['type'],
            lat=data['lat'],
            lon=data['lon'],
            cost=data['cost']
        )
        game_state = GameState.query.first()
        if game_state.budget >= building.cost:
            game_state.budget -= building.cost
            db.session.add(building)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Insufficient funds'})
    
    buildings = Building.query.all()
    return jsonify([{
        'id': b.id,
        'type': b.type,
        'lat': b.lat,
        'lon': b.lon,
        'cost': b.cost
    } for b in buildings])

@app.route('/api/vehicles', methods=['GET', 'POST'])
def handle_vehicles():
    if request.method == 'POST':
        data = request.json
        vehicle = Vehicle(
            type=data['type'],
            building_id=data['building_id'],
            cost=data['cost']
        )
        game_state = GameState.query.first()
        if game_state.budget >= vehicle.cost:
            game_state.budget -= vehicle.cost
            db.session.add(vehicle)
            db.session.commit()
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Insufficient funds'})
    
    vehicles = Vehicle.query.all()
    return jsonify([{
        'id': v.id,
        'type': v.type,
        'building_id': v.building_id,
        'cost': v.cost
    } for v in vehicles])

@app.route('/api/missions')
def get_missions():
    missions = Mission.query.filter_by(status='active').all()
    return jsonify([{
        'id': m.id,
        'type': m.type,
        'lat': m.lat,
        'lon': m.lon,
        'status': m.status
    } for m in missions])

if __name__ == '__main__':
    mission_thread = threading.Thread(target=spawn_mission, daemon=True)
    mission_thread.start()
    app.run(debug=True)

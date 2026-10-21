from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# 1. Initialize the Flask application
app = Flask(__name__)

# 2. Enable CORS so your React frontend (port 5173) can talk to Flask (port 5000)
CORS(app)

# 3. Configure the SQLite database file location
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///secure_org.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Bind SQLAlchemy to our Flask app
db = SQLAlchemy(app)

# ==========================================
# DATABASE MODELS (The Blueprint of our Tables)
# ==========================================

class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., Admin, Staff

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., IT, HR

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    failed_login_attempts = db.Column(db.Integer, default=0) # Tracks failed logins for auto-lockout
    
    # Foreign keys linking users to roles and departments
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('department.id'), nullable=False)

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action_type = db.Column(db.String(50), nullable=False) # e.g., REGISTER, LOGIN
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


# ==========================================
# API ENDPOINTS (The Doors to our Backend)
# ==========================================

@app.route('/api/init', methods=['POST'])
def init_db():
    """Creates the database tables and populates default roles and departments."""
    with app.app_context():
        db.create_all()
        
        # Check if roles already exist to avoid duplicates
        if not Role.query.first():
            db.session.add(Role(name="Admin"))
            db.session.add(Role(name="Staff"))
            db.session.add(Department(name="IT"))
            db.session.add(Department(name="HR"))
            db.session.commit()
            
    return jsonify({"message": "Database initialized successfully with default roles and departments!"}), 200


@app.route('/api/register', methods=['POST'])
def register_user():
    """Receives user data from React, hashes the password, and saves to database."""
    data = request.get_json()
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({"error": "Email is already registered."}), 400
        
    # Securely hash the password using Werkzeug
    hashed_password = generate_password_hash(data['password'])
    
    new_user = User(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        password_hash=hashed_password,
        role_id=data.get('role_id', 1),
        dept_id=data.get('dept_id', 1)
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User registered successfully! Please proceed to login."}), 201


@app.route('/api/login', methods=['POST'])
def login_user():
    """Authenticates a user, checks lockout status, and tracks failed attempts."""
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    # Check if already disabled (manually or automatically)
    if not user.is_active:
        return jsonify({"error": "Account is disabled due to security policies or multiple failed login attempts."}), 403
        
    if check_password_hash(user.password_hash, data['password']):
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        db.session.commit()
        
        # Log successful login
        db.session.add(AuditLog(action_type='LOGIN_SUCCESS', user_id=user.id))
        db.session.commit()
        
        role = Role.query.get(user.role_id)
        role_name = role.name if role else "Staff"
        
        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": role_name
            }
        }), 200
    else:
        # Increment failed attempts
        user.failed_login_attempts += 1
        
        # Trigger automatic lockout if attempts reach 5
        if user.failed_login_attempts >= 5:
            user.is_active = False
            db.session.commit()
            db.session.add(AuditLog(action_type='AUTO_LOCKOUT_BRUTE_FORCE', user_id=user.id))
            db.session.commit()
            return jsonify({"error": "Security Policy: Account locked out due to 5 consecutive failed login attempts."}), 403
        
        db.session.commit()
        db.session.add(AuditLog(action_type='LOGIN_FAILED', user_id=user.id))
        db.session.commit()
        
        return jsonify({"error": f"Invalid email or password. Attempt {user.failed_login_attempts} of 5 before lockout."}), 401


@app.route('/api/audit-logs', methods=['GET'])
def get_audit_logs():
    """Fetches recent security and access audit logs from the database."""
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    log_list = []
    for log in logs:
        user = User.query.get(log.user_id) if log.user_id else None
        user_email = user.email if user else "System / Unknown"
        
        log_list.append({
            "id": log.id,
            "action_type": log.action_type,
            "timestamp": log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else "N/A",
            "user_email": user_email
        })
        
    return jsonify(log_list), 200


@app.route('/api/users', methods=['GET'])
def get_all_users():
    """Fetches all registered users for administrative management."""
    users = User.query.all()
    user_list = []
    
    for u in users:
        role = Role.query.get(u.role_id)
        dept = Department.query.get(u.dept_id)
        user_list.append({
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": role.name if role else "Staff",
            "department": dept.name if dept else "General",
            "is_active": u.is_active
        })
        
    return jsonify(user_list), 200


@app.route('/api/users/<int:user_id>/status', methods=['PATCH'])
def toggle_user_status(user_id):
    """Allows an admin to activate or deactivate a user account with self-lockout protection."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    requested_by_id = data.get('current_user_id')
    new_status = data.get('is_active')
    
    if requested_by_id and user_id == requested_by_id and new_status is False:
        return jsonify({"error": "Security Policy: You cannot disable your own active administrative account."}), 400
    
    if new_status is not None:
        user.is_active = new_status
        db.session.commit()
        
        db.session.add(AuditLog(
            action_type=f'STATUS_CHANGE_{"ACTIVE" if user.is_active else "DISABLED"}', 
            user_id=requested_by_id if requested_by_id else user.id
        ))
        db.session.commit()
        
        return jsonify({"message": "User status updated successfully!"}), 200
        
    return jsonify({"error": "Invalid payload."}), 400


@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
def change_password(user_id):
    """Allows an authenticated user to securely update their password."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"error": "Both current and new passwords are required."}), 400
        
    if not check_password_hash(user.password_hash, current_password):
        return jsonify({"error": "Incorrect current password."}), 401
        
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    
    db.session.add(AuditLog(action_type='PASSWORD_CHANGED', user_id=user.id))
    db.session.commit()
    
    return jsonify({"message": "Password updated successfully!"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
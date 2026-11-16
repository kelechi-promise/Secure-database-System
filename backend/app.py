import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://secure-management-system.vercel.app",
                "http://localhost:5173",
            ]
        }
    },
)

# SQLite Database Configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///secure_org.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)


# Database Models
class Role(db.Model):
  __tablename__ = "roles"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(50), unique=True, nullable=False)


class Department(db.Model):
  __tablename__ = "departments"
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(50), unique=True, nullable=False)


class User(db.Model):
  __tablename__ = "users"
  id = db.Column(db.Integer, primary_key=True)
  first_name = db.Column(db.String(50), nullable=False)
  last_name = db.Column(db.String(50), nullable=False)
  email = db.Column(db.String(120), unique=True, nullable=False)
  password_hash = db.Column(db.String(255), nullable=False)
  is_active = db.Column(db.Boolean, default=True, nullable=False)
  failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
  role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
  department_id = db.Column(
      db.Integer, db.ForeignKey("departments.id"), nullable=False
  )


class AuditLog(db.Model):
  __tablename__ = "audit_logs"
  id = db.Column(db.Integer, primary_key=True)
  action = db.Column(db.String(100), nullable=False)
  timestamp = db.Column(
      db.DateTime, server_default=db.func.now(), nullable=False
  )
  user_email = db.Column(db.String(120), nullable=False)


# Initialize Database Endpoint (Supports GET and POST)
@app.route("/api/init", methods=["GET", "POST"])
def init_db():
  db.create_all()
  if not Role.query.filter_by(name="Admin").first():
    db.session.add(Role(name="Admin"))
  if not Role.query.filter_by(name="Staff").first():
    db.session.add(Role(name="Staff"))
  if not Department.query.filter_by(name="IT").first():
    db.session.add(Department(name="IT"))
  if not Department.query.filter_by(name="HR").first():
    db.session.add(Department(name="HR"))
  db.session.commit()
  return (
      jsonify(
          {
              "message": (
                  "Database initialized and seeded with default roles and"
                  " departments successfully."
              )
          }
      ),
      200,
  )


if __name__ == "__main__":
  app.run(debug=True)
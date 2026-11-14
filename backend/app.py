@app.route('/api/init', methods=['GET', 'POST'])
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
    return jsonify({
        "message": "Database initialized and seeded with default roles and departments successfully."
    }), 200
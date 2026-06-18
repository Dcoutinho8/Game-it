from flask import Blueprint, jsonify, request
from database import get_connection

notes_bp = Blueprint('notes', __name__)

@notes_bp.route('/api/notes/<appid>', methods=['GET'])
def get_notes(appid):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM notes WHERE appid = %s ORDER BY created_at DESC", (appid,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for r in rows:
        row = dict(r)
        row['created_at'] = str(row['created_at'])
        row['updated_at'] = str(row['updated_at'])
        result.append(row)
    return jsonify({'status': 'success', 'notes': result})

@notes_bp.route('/api/notes', methods=['POST'])
def create_note():
    data      = request.get_json()
    appid     = str(data.get('appid'))
    game_name = data.get('game_name', '')
    title     = data.get('title', 'Anotacao')
    content   = data.get('content', '')
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        INSERT INTO notes (appid, game_name, title, content)
        VALUES (%s, %s, %s, %s)
        RETURNING id, appid, game_name, title, content, created_at, updated_at
        """,
        (appid, game_name, title, content)
    )
    row = dict(cur.fetchone())
    row['created_at'] = str(row['created_at'])
    row['updated_at'] = str(row['updated_at'])
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success', 'note': row})

@notes_bp.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data    = request.get_json()
    title   = data.get('title', 'Anotacao')
    content = data.get('content', '')
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        UPDATE notes SET title = %s, content = %s, updated_at = NOW()
        WHERE id = %s
        RETURNING id, title, content, updated_at
        """,
        (title, content, note_id)
    )
    row = dict(cur.fetchone())
    row['updated_at'] = str(row['updated_at'])
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success', 'note': row})

@notes_bp.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("DELETE FROM notes WHERE id = %s", (note_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success'})

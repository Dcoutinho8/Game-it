import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg.connect(os.getenv('DATABASE_URL'), row_factory=dict_row)


def init_db():
    conn = get_connection()
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS guide_cache (
            appid        VARCHAR(20)  PRIMARY KEY,
            game_name    VARCHAR(255),
            html_content TEXT,
            created_at   TIMESTAMP    DEFAULT NOW(),
            updated_at   TIMESTAMP    DEFAULT NOW()
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id         SERIAL       PRIMARY KEY,
            appid      VARCHAR(20)  NOT NULL,
            game_name  VARCHAR(255),
            title      VARCHAR(255) DEFAULT 'Anotação',
            content    TEXT,
            created_at TIMESTAMP    DEFAULT NOW(),
            updated_at TIMESTAMP    DEFAULT NOW()
        );
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_notes_appid ON notes(appid);")

    conn.commit()
    cur.close()
    conn.close()
    print("[DB] ✅ Tabelas inicializadas com sucesso.")
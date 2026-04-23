import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      modelo_usado TEXT,
      timestamp INTEGER NOT NULL
    )
  `);

  return db;
}

export async function saveMessage(role: string, content: string, modeloUsado?: string) {
  const db = await getDb();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  await db.run(
    'INSERT INTO messages (id, role, content, modelo_usado, timestamp) VALUES (?, ?, ?, ?, ?)',
    [id, role, content, modeloUsado || null, Date.now()]
  );
}

export async function getHistory() {
  const db = await getDb();
  return await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
}

export async function clearHistory() {
  const db = await getDb();
  await db.run('DELETE FROM messages');
}

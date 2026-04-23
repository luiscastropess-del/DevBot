import { Database } from 'sqlite';

let db: any | null = null;

export async function getDb() {
  if (db) return db;

  const sqlite3 = await import('sqlite3');
  const { open } = await import('sqlite');
  const path = await import('path');
  
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.default.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      modelo_usado TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )
  `);

  return db;
}

export async function getSessions() {
  const db = await getDb();
  return await db.all('SELECT * FROM chat_sessions ORDER BY created_at DESC');
}

export async function createSession(title: string = 'Nova Conversa') {
  const db = await getDb();
  const id = 'sess_' + Date.now().toString() + Math.random().toString(36).substring(2, 5);
  await db.run(
    'INSERT INTO chat_sessions (id, title, created_at) VALUES (?, ?, ?)',
    [id, title, Date.now()]
  );
  return id;
}

export async function deleteSession(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM chat_sessions WHERE id = ?', [id]);
}

export async function saveMessage(role: string, content: string, sessionId: string, modeloUsado?: string) {
  const db = await getDb();
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  
  // Auto-create session if it doesn't exist (legacy fallback)
  if (!sessionId) {
    const sessions = await getSessions();
    if (sessions.length === 0) {
      sessionId = await createSession();
    } else {
      sessionId = sessions[0].id;
    }
  }

  await db.run(
    'INSERT INTO messages (id, session_id, role, content, modelo_usado, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [id, sessionId, role, content, modeloUsado || null, Date.now()]
  );

  // Update session title if it's the first message
  const msgs = await db.all('SELECT id FROM messages WHERE session_id = ? LIMIT 2', [sessionId]);
  if (msgs.length === 1 && role === 'user') {
    const title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    await db.run('UPDATE chat_sessions SET title = ? WHERE id = ?', [title, sessionId]);
  }
}

export async function getHistory(sessionId?: string) {
  const db = await getDb();
  if (!sessionId) {
    const sessions = await getSessions();
    if (sessions.length === 0) return [];
    sessionId = sessions[0].id;
  }
  return await db.all('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC', [sessionId]);
}

export async function clearHistory(sessionId?: string) {
  const db = await getDb();
  if (sessionId) {
    await db.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);
  } else {
    await db.run('DELETE FROM messages');
    await db.run('DELETE FROM chat_sessions');
  }
}

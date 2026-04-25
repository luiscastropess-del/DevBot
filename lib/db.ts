import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'devbot_data.json');

interface Session {
  id: string;
  title: string;
  created_at: number;
}

interface Message {
  id: string;
  session_id: string;
  role: string;
  content: string;
  modelo_usado?: string;           // agora é opcional (undefined), nunca null
  timestamp: number;
}

interface DataStore {
  sessions: Session[];
  messages: Message[];
}

async function readData(): Promise<DataStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { sessions: [], messages: [] };
  }
}

async function writeData(data: DataStore): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Função de compatibilidade para outros módulos que chamam getDb()
export async function getDb() {
  return {
    all: async () => [],
    run: async () => {},
    exec: async () => {},
  };
}

export async function getSessions() {
  const data = await readData();
  return data.sessions.sort((a, b) => b.created_at - a.created_at);
}

export async function createSession(title: string = 'Nova Conversa') {
  const data = await readData();
  const id = 'sess_' + Date.now().toString() + Math.random().toString(36).substring(2, 5);
  data.sessions.push({ id, title, created_at: Date.now() });
  await writeData(data);
  return id;
}

export async function deleteSession(id: string) {
  const data = await readData();
  data.sessions = data.sessions.filter(s => s.id !== id);
  data.messages = data.messages.filter(m => m.session_id !== id);
  await writeData(data);
}

export async function saveMessage(role: string, content: string, sessionId: string, modeloUsado?: string) {
  const data = await readData();
  // Auto-create session if not provided
  if (!sessionId) {
    const sessions = data.sessions.sort((a, b) => b.created_at - a.created_at);
    if (sessions.length === 0) {
      sessionId = await createSession();
    } else {
      sessionId = sessions[0].id;
    }
  }
  const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);

  // Agora modelo_usado é undefined quando não fornecido, nunca null
  const message: Message = {
    id,
    session_id: sessionId,
    role,
    content,
    timestamp: Date.now()
  };
  if (modeloUsado) {
    message.modelo_usado = modeloUsado;
  }

  data.messages.push(message);

  // Update session title if first user message
  const sessionMessages = data.messages.filter(m => m.session_id === sessionId);
  if (sessionMessages.length === 1 && role === 'user') {
    const session = data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    }
  }
  await writeData(data);
}

export async function getHistory(sessionId?: string) {
  const data = await readData();
  if (!sessionId) {
    const sessions = data.sessions.sort((a, b) => b.created_at - a.created_at);
    if (sessions.length === 0) return [];
    sessionId = sessions[0].id;
  }
  return data.messages
    .filter(m => m.session_id === sessionId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearHistory(sessionId?: string) {
  const data = await readData();
  if (sessionId) {
    data.messages = data.messages.filter(m => m.session_id !== sessionId);
  } else {
    data.messages = [];
    data.sessions = [];
  }
  await writeData(data);
}

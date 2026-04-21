import sqlite3
from datetime import datetime

DB_NAME = "historico_chat.db"

def inicializar_db():
    """Cria a tabela no banco de dados se ela não existir."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Cria a tabela de histórico
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def salvar_mensagem(session_id: str, role: str, content: str):
    """
    Salva uma única mensagem no banco de dados.
    :param session_id: ID único para a conversa/usuário (ex: 'user_123')
    :param role: 'user' (usuário), 'assistant' (IA) ou 'system' (instruções)
    :param content: O texto da mensagem
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Usa parâmetros (?) para evitar SQL Injection
    cursor.execute('''
        INSERT INTO conversas (session_id, role, content)
        VALUES (?, ?, ?)
    ''', (session_id, role, content))
    
    conn.commit()
    conn.close()

def obter_historico(session_id: str, limite: int = 20) -> list:
    """
    Recupera o histórico de uma sessão específica.
    Retorna uma lista de dicionários pronta para ser enviada à IA.
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Pega as últimas N mensagens, ordenadas por tempo
    cursor.execute('''
        SELECT role, content FROM (
            SELECT role, content, timestamp 
            FROM conversas 
            WHERE session_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        ) ORDER BY timestamp ASC
    ''', (session_id, limite))
    
    linhas = cursor.fetchall()
    conn.close()
    
    # Formata no padrão das APIs de IA [{"role": "user", "content": "olá"}]
    historico = [{"role": linha[0], "content": linha[1]} for linha in linhas]
    return historico

def limpar_historico(session_id: str):
    """Apaga o histórico de uma sessão (opcional)."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM conversas WHERE session_id = ?', (session_id,))
    conn.commit()
    conn.close()
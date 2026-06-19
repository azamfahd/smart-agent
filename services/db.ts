import { openDB, IDBPDatabase } from 'idb';
import { ChatSession, AppSettings } from '../types';

const DB_NAME = 'ai-agent-db';
const DB_VERSION = 1;

export interface AiAgentDB {
    sessions: ChatSession;
    settings: { id: string } & AppSettings;
}

export const initDB = async () => {
    return openDB<AiAgentDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            db.createObjectStore('sessions', { keyPath: 'id' });
            db.createObjectStore('settings', { keyPath: 'id' });
        },
    });
};

export const getSessions = async (db: IDBPDatabase<AiAgentDB>) => {
    return db.getAll('sessions');
};

export const saveSessions = async (db: IDBPDatabase<AiAgentDB>, sessions: ChatSession[]) => {
    const tx = db.transaction('sessions', 'readwrite');
    await Promise.all(sessions.map(s => tx.store.put(s)));
    await tx.done;
};

export const deleteSession = async (db: IDBPDatabase<AiAgentDB>, sessionId: string) => {
    await db.delete('sessions', sessionId);
};

export const getSettings = async (db: IDBPDatabase<AiAgentDB>) => {
    return db.get('settings', 'main');
};

export const saveSettings = async (db: IDBPDatabase<AiAgentDB>, settings: AppSettings) => {
    await db.put('settings', { ...settings, id: 'main' });
};

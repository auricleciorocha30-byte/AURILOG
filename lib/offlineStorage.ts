
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'aurilog_offline_db';
const DB_VERSION = 1;

export interface SyncItem {
  id: string;
  table: string;
  data: any;
  status: 'pending' | 'synced';
  action: 'insert' | 'update' | 'delete';
  timestamp: number;
}

export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('trips')) db.createObjectStore('trips', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('vehicles')) db.createObjectStore('vehicles', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('maintenance')) db.createObjectStore('maintenance', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('jornada_logs')) db.createObjectStore('jornada_logs', { keyPath: 'id' });
      
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const offlineStorage = {
  async save(table: string, data: any, action: 'insert' | 'update' | 'delete' = 'insert') {
    const db = await initDB();
    const id = data.id || generateUUID();
    
    let finalData: any;

    if (action === 'delete') {
      await db.delete(table as any, id);
      finalData = { id }; // Dados mínimos para deletar no remoto
    } else if (action === 'update') {
      const existing = await db.get(table as any, id);
      finalData = { 
        ...(existing || {}), 
        ...data, 
        id,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      };
      await db.put(table as any, finalData);
    } else {
      finalData = { 
        ...data, 
        id, 
        sync_status: 'pending',
        created_at: data.created_at || new Date().toISOString()
      };
      await db.put(table as any, finalData);
    }

    // Registrar na fila de sincronização
    await db.put('sync_queue', {
      id: generateUUID(), // ID único para a entrada na fila de sync
      table,
      data: finalData, // Contém o ID do registro real
      status: 'pending',
      action,
      timestamp: Date.now()
    });

    return finalData;
  },

  async getAll(table: string) {
    const db = await initDB();
    return db.getAll(table as any);
  },

  async getPendingSync() {
    const db = await initDB();
    return db.getAll('sync_queue');
  },

  async markAsSynced(syncId: string) {
    const db = await initDB();
    await db.delete('sync_queue', syncId);
  },

  async clearTable(table: string) {
    const db = await initDB();
    await db.clear(table as any);
  },

  async bulkSave(table: string, items: any[]) {
    const db = await initDB();
    const tx = db.transaction(table as any, 'readwrite');
    for (const item of items) {
      await tx.store.put({ ...item, sync_status: 'synced' });
    }
    await tx.done;
  }
};

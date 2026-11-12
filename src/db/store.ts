import { db } from './index.ts';
import { tataoStore, clientesTable, produccionTable, ventasTable, gastosTable, materialesTable, recetasTable } from './schema.ts';
import { eq } from 'drizzle-orm';
import { AppData } from '../types.ts';

const STORE_ID = 'current_state';

export async function getStoredAppData(): Promise<{ data: AppData | null; version: number; updatedAt: Date } | null> {
  try {
    const records = await db.select().from(tataoStore).where(eq(tataoStore.id, STORE_ID));
    if (records.length === 0) {
      return null;
    }
    const rec = records[0];
    const parsed = JSON.parse(rec.data) as AppData;
    return {
      data: parsed,
      version: rec.version,
      updatedAt: rec.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching stored app data:', error);
    throw new Error('Database query failed for app data.', { cause: error });
  }
}

export async function saveStoredAppData(appData: AppData, updatedBy?: string) {
  try {
    const jsonString = JSON.stringify(appData);

    // Upsert into central store
    await db.insert(tataoStore)
      .values({
        id: STORE_ID,
        data: jsonString,
        version: 1,
        updatedAt: new Date(),
        updatedBy: updatedBy || 'system',
      })
      .onConflictDoUpdate({
        target: tataoStore.id,
        set: {
          data: jsonString,
          updatedAt: new Date(),
          updatedBy: updatedBy || 'system',
        },
      });

    return { success: true };
  } catch (error) {
    console.error('Error saving app data to PostgreSQL:', error);
    throw new Error('Database save failed for app data.', { cause: error });
  }
}

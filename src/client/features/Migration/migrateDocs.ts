import type { LegacyRepeatableDoc, LegacyTemplateDoc, TemplateDoc } from '../../../shared/types';
import { isLegacyRepeatable, migrateRepeatable } from './migrateRepeatable';
import { isLegacyTemplate, migrateTemplate } from './migrateTemplate';

export type MigrationProgress = {
  phase: 'templates' | 'repeatables';
  current: number;
  total: number;
};

export type MigrationCallback = (progress: MigrationProgress) => void;

/**
 * Check if the database needs migration by looking for any legacy documents.
 */
//  FIXME: instead of using all docs, use a metadata document that we can store whether the migration has occurred
export async function needsMigration(db: PouchDB.Database): Promise<boolean> {
  const allDocs = await db.allDocs({ include_docs: true });

  for (const row of allDocs.rows) {
    if (isLegacyTemplate(row.doc) || isLegacyRepeatable(row.doc)) {
      return true;
    }
  }

  return false;
}

/**
 * Migrate all legacy documents in the database to the new schema.
 *
 * Process:
 * 1. Migrate templates first (repeatables depend on them)
 * 2. Then migrate repeatables using the migrated templates
 * 3. Report progress via callback
 *
 * @param db - The PouchDB database instance
 * @param onProgress - Optional callback for progress updates
 */
export async function migrateDatabase(
  db: PouchDB.Database,
  onProgress?: MigrationCallback,
): Promise<void> {
  const allDocs = await db.allDocs({ include_docs: true });

  const legacyTemplates: LegacyTemplateDoc[] = [];
  const legacyRepeatables: LegacyRepeatableDoc[] = [];

  for (const row of allDocs.rows) {
    if (isLegacyTemplate(row.doc)) {
      legacyTemplates.push(row.doc);
    } else if (isLegacyRepeatable(row.doc)) {
      legacyRepeatables.push(row.doc);
    }
  }

  const totalTemplates = legacyTemplates.length;
  const totalRepeatables = legacyRepeatables.length;

  const migratedTemplates = new Map<string, TemplateDoc>();

  // Phase 1: Migrate templates
  for (let i = 0; i < legacyTemplates.length; i++) {
    const template = legacyTemplates[i];
    const migrated = migrateTemplate(template);

    // Save the migrated template
    await db.put(migrated);
    migratedTemplates.set(migrated._id, migrated);

    onProgress?.({
      phase: 'templates',
      current: i + 1,
      total: totalTemplates,
    });
  }

  // Phase 2: Migrate repeatables
  for (let i = 0; i < legacyRepeatables.length; i++) {
    const repeatable = legacyRepeatables[i];

    let template = migratedTemplates.get(repeatable.template);
    if (!template) {
      // Template wasn't in the migration set - fetch it from DB
      // It may already be schema version 2
      try {
        template = await db.get(repeatable.template);
      } catch {
        // Template not found - skip this repeatable
        console.warn(`Template ${repeatable.template} not found for repeatable ${repeatable._id}`);
        continue;
      }
    }

    const migrated = migrateRepeatable(repeatable, template);
    await db.put(migrated);

    onProgress?.({
      phase: 'repeatables',
      current: i + 1,
      total: totalRepeatables,
    });
  }
}

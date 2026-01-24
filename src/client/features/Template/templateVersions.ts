import type { DocId, TemplateDoc } from '../../../shared/types';

/**
 * Extract the base ID (without version) from a template ID.
 * Template ID format: repeatable:template:<uuid>:<version>
 */
function getTemplateBaseId(templateId: DocId): string {
  return templateId.substring(0, templateId.lastIndexOf(':'));
}

/**
 * Extract the version number from a template ID.
 */
function getTemplateVersion(templateId: DocId): number {
  const parts = templateId.split(':');
  return Number(parts[3]);
}

/**
 * Get the latest version of a template from the database.
 *
 * @param templateId - Any version of the template
 * @param db - PouchDB database instance
 * @returns The latest template version, or null if not found
 */
export async function getLatestTemplateVersion(
  templateId: DocId,
  db: PouchDB.Database,
): Promise<TemplateDoc | null> {
  const baseId = getTemplateBaseId(templateId);

  // Find all versions of this template
  const result = await db.find({
    selector: {
      _id: { $gt: baseId, $lte: `${baseId}\uffff` },
      deleted: { $ne: true },
    },
    limit: 1000,
  });

  if (result.docs.length === 0) {
    return null;
  }

  // Sort by version number (descending) and return the highest
  const sorted = result.docs.sort((a, b) => {
    const versionA = getTemplateVersion(a._id);
    const versionB = getTemplateVersion(b._id);
    return versionB - versionA;
  });

  return sorted[0] as TemplateDoc;
}

/**
 * Check if a template ID is the latest version.
 */
export function isLatestVersion(currentTemplateId: DocId, latestTemplate: TemplateDoc): boolean {
  return currentTemplateId === latestTemplate._id;
}

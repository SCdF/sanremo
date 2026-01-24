# Inline Template Edit Feature Plan

This document outlines the plan for supporting editing a template from within the repeatable view, with automatic migration of checkbox state when the template changes.

## Current State Analysis

### Data Structures
- **TemplateDoc**: Contains `values: boolean[]` (checkbox defaults) and `markdown` (content with checkboxes)
- **RepeatableDoc**: Contains `values: boolean[]` (current checkbox state) and `template: DocId` (exact version reference)
- Checkboxes are indexed by document order via `rehypeCheckboxIndex` plugin
- Template versions follow pattern: `repeatable:template:<uuid>:<version>`

### Current Limitations
- No way to upgrade a repeatable to a newer template version
- No intelligent mapping when checkboxes are added/removed/reordered
- Values array uses positional indexing - changes to checkbox count break alignment

---

## Migration Strategy: Unique Checkbox IDs

Assign a unique ID to each checkbox when created. Store values as a `Record<checkboxId, boolean>` instead of `boolean[]`.

### Data Structure Changes

```typescript
// Template
interface TemplateDoc {
  // ... existing fields
  values: CheckboxValue[];  // Changed from boolean[]
}

interface CheckboxValue {
  id: string;      // UUID, stable across edits
  default: boolean; // Default checked state for new repeatables
}

// Repeatable
interface RepeatableDoc {
  // ... existing fields
  values: Record<string, boolean>;  // Map of checkbox ID -> checked state
}
```

### Markdown Storage

Embed IDs in the markdown using HTML comments:
```markdown
- [ ] First task <!-- cb:a1b2c3 -->
- [ ] Second task <!-- cb:d4e5f6 -->
```

Comments are invisible when rendered but visible in the editor.

### Why This Approach

- **Deterministic migration** - IDs provide exact mapping between old and new template versions
- **Works with any edit** - add, remove, reorder checkboxes all work correctly
- **No fuzzy matching ambiguity** - identical checkbox labels don't cause problems
- **IDs survive copy/paste** within the editor

### Migration Process

1. On app startup, check for legacy format (array of booleans in template)
2. If found, show full-screen migration screen with progress bar (blocks app)
3. For each template: parse markdown, assign IDs, convert values array
4. For each repeatable: convert to Record using positional mapping to current template
5. Mark migration complete in localStorage

---

## Feature Implementation Plan

### Phase 1: Data Structure Migration

#### 1.1 Update Types
**File**: `src/shared/types.ts`

```typescript
export interface CheckboxValue {
  id: string;
  default: boolean;
}

export interface TemplateDoc extends Doc {
  // ... existing
  values: CheckboxValue[];  // Breaking change
  schemaVersion: 2;  // New field to identify migrated docs
}

export interface RepeatableDoc extends Doc {
  // ... existing
  values: Record<string, boolean>;  // Breaking change
  schemaVersion: 2;
}

// Legacy types for migration
export interface LegacyTemplateDoc extends Doc {
  values: boolean[];
  schemaVersion?: undefined;
}

export interface LegacyRepeatableDoc extends Doc {
  values: boolean[];
  schemaVersion?: undefined;
}
```

#### 1.2 Migration Screen Component
**File**: `src/client/features/Migration/MigrationScreen.tsx`

- Full-screen overlay that blocks app until migration completes
- Progress bar showing documents processed
- Error handling with retry capability

#### 1.3 Migration Logic
**File**: `src/client/features/Migration/migrateDocs.ts`

```typescript
export async function migrateDatabase(db: Database): Promise<void> {
  const allDocs = await db.allDocs({ include_docs: true });

  const templates = allDocs.rows.filter(isLegacyTemplate);
  const repeatables = allDocs.rows.filter(isLegacyRepeatable);

  // Migrate templates first (repeatables depend on them)
  for (const template of templates) {
    await migrateTemplate(db, template);
    onProgress(current, total);
  }

  // Then migrate repeatables
  for (const repeatable of repeatables) {
    await migrateRepeatable(db, repeatable);
    onProgress(current, total);
  }
}
```

#### 1.4 Checkbox ID Parsing/Serialization
**File**: `src/client/features/Repeatable/checkboxIds.ts`

```typescript
// Parse markdown and extract checkbox IDs
// Returns array of { id, lineIndex } in document order
export function parseCheckboxIds(markdown: string): CheckboxInfo[];

// Insert IDs for any checkboxes missing them
export function ensureCheckboxIds(markdown: string): string;

// When parsing for render, provide ID mapping
export function getCheckboxIdAtIndex(markdown: string, index: number): string;
```

### Phase 2: Core Migration Functions

#### 2.1 Template Migration
**File**: `src/client/features/Migration/migrateTemplate.ts`

```typescript
export function migrateTemplate(template: LegacyTemplateDoc): TemplateDoc {
  // 1. Parse markdown to find checkboxes
  // 2. Assign UUID to each checkbox
  // 3. Insert IDs as HTML comments
  // 4. Convert values array to CheckboxValue[]
  // 5. Set schemaVersion: 2
}
```

#### 2.2 Repeatable Migration
**File**: `src/client/features/Migration/migrateRepeatable.ts`

```typescript
export function migrateRepeatable(
  repeatable: LegacyRepeatableDoc,
  template: TemplateDoc  // Already migrated
): RepeatableDoc {
  // 1. Get checkbox IDs from template (in document order)
  // 2. Map positional values to ID-keyed record
  // 3. Set schemaVersion: 2
}
```

### Phase 3: Update Runtime Code

#### 3.1 Checkbox Rendering
**File**: `src/client/features/Repeatable/RepeatableRenderer.tsx`

- Update to work with `Record<string, boolean>` values
- Pass checkbox ID to toggle handler instead of index

#### 3.2 Checkbox Context
**File**: `src/client/features/Repeatable/CheckboxContext.tsx`

```typescript
export type CheckboxContextType = {
  values: Record<string, boolean>;
  onChange?: (checkboxId: string) => void;  // Changed from idx
  disabled: boolean;
  registerButton: (checkboxId: string, element: HTMLElement | null) => void;
};
```

#### 3.3 Rehype Plugin Update
**File**: `src/client/features/Repeatable/rehypeCheckboxIndex.ts`

- Update to extract checkbox ID from HTML comment
- Add `dataCheckboxId` attribute instead of/alongside `dataCheckboxIndex`

### Phase 4: UI Features

#### 4.1 Update Button (Repeatable Page)
**File**: `src/client/pages/Repeatable.tsx`

Add button that appears when repeatable's template version is not the latest:

```typescript
const isLatestVersion = await checkIsLatestVersion(repeatable.template);

// In render:
{!isLatestVersion && (
  <Button onClick={handleUpdateTemplate}>
    <UpdateIcon />
  </Button>
)}
```

**handleUpdateTemplate**:
1. Find latest version of the template
2. Call migration function to map values
3. Update repeatable's template reference
4. Save and refresh

#### 4.2 Edit Button (Repeatable Page)
**File**: `src/client/pages/Repeatable.tsx`

Add button that appears when repeatable uses the latest template version:

```typescript
{isLatestVersion && (
  <Button onClick={() => navigate(`/template/${template._id}/from/${repeatable._id}`)}>
    <EditIcon />
  </Button>
)}
```

#### 4.3 Inline Edit Template Page
**File**: `src/client/pages/InlineTemplateEdit.tsx` (new)

Route: `/template/:templateId/from/:repeatableId`

Similar to Template.tsx but:
- Shows the repeatable's current checkbox values in preview (not empty array)
- Explicit save button (consistent with existing template editor)
- On save: creates new template version, migrates the source repeatable, redirects back to repeatable

### Phase 5: URL Routing

**File**: `src/client/App.tsx`

```typescript
<Routes>
  {/* ... existing */}
  <Route path="template/:templateId/from/:repeatableId" element={<InlineTemplateEdit />} />
</Routes>
```

---

## Version Detection Logic

```typescript
function getLatestTemplateVersion(
  templateId: string,
  db: Database
): Promise<TemplateDoc | null> {
  // templateId format: repeatable:template:<uuid>:<version>
  const baseId = templateId.substring(0, templateId.lastIndexOf(':'));

  // Find all versions of this template
  const versions = await db.find({
    selector: {
      _id: { $gt: baseId, $lte: `${baseId}\uffff` },
      deleted: { $ne: true }
    },
    limit: 1000
  });

  // Return highest version number
  return versions.docs.sort(byVersionDesc)[0] || null;
}

function isLatestVersion(currentTemplateId: string, latestTemplate: TemplateDoc): boolean {
  return currentTemplateId === latestTemplate._id;
}
```

---

## Value Migration Algorithm

When migrating a repeatable to a new template version:

```typescript
function migrateRepeatableValues(
  currentValues: Record<string, boolean>,
  oldTemplate: TemplateDoc,
  newTemplate: TemplateDoc
): Record<string, boolean> {
  const newValues: Record<string, boolean> = {};

  // Get checkbox IDs from new template
  const newCheckboxIds = parseCheckboxIds(newTemplate.markdown);

  for (const { id } of newCheckboxIds) {
    if (id in currentValues) {
      // Checkbox exists in both - preserve state
      newValues[id] = currentValues[id];
    } else {
      // New checkbox - use template default
      const defaultValue = newTemplate.values.find(v => v.id === id);
      newValues[id] = defaultValue?.default ?? false;
    }
  }

  // Checkboxes in currentValues but not in newTemplate are dropped
  // (they were removed from the template)

  return newValues;
}
```

---

## Test Plan

### Unit Tests

#### Migration Tests
**File**: `src/client/features/Migration/migrateTemplate.test.ts`

```typescript
describe('migrateTemplate', () => {
  it('assigns unique IDs to each checkbox');
  it('preserves default values during migration');
  it('handles nested checkboxes');
  it('handles templates with no checkboxes');
  it('is idempotent (migrating twice produces same result)');
});
```

**File**: `src/client/features/Migration/migrateRepeatable.test.ts`

```typescript
describe('migrateRepeatable', () => {
  it('maps positional values to checkbox IDs');
  it('handles mismatched value count (fewer values than checkboxes)');
  it('handles mismatched value count (more values than checkboxes)');
  it('preserves checked state during migration');
});
```

#### Checkbox ID Parsing Tests
**File**: `src/client/features/Repeatable/checkboxIds.test.ts`

```typescript
describe('parseCheckboxIds', () => {
  it('extracts IDs from HTML comments');
  it('returns IDs in document order');
  it('handles checkboxes without IDs');
});

describe('ensureCheckboxIds', () => {
  it('adds IDs to checkboxes without them');
  it('preserves existing IDs');
  it('generates unique IDs');
});
```

#### Value Migration Tests
**File**: `src/client/features/Repeatable/migrateValues.test.ts`

```typescript
describe('migrateRepeatableValues', () => {
  it('preserves values for unchanged checkboxes');
  it('uses defaults for newly added checkboxes');
  it('drops values for removed checkboxes');
  it('handles complete checkbox replacement');
  it('handles reordered checkboxes (IDs stay same, order changes)');
});
```

### Integration Tests

#### Update Flow Test
**File**: `src/client/pages/Repeatable.test.tsx`

```typescript
describe('Repeatable page', () => {
  it('shows update button when template has newer version');
  it('shows edit button when template is latest version');
  it('hides both buttons when repeatable is completed');

  describe('update button', () => {
    it('migrates values to latest template version');
    it('preserves checked state for unchanged checkboxes');
    it('updates template reference');
  });
});
```

#### Inline Edit Flow Test
**File**: `src/client/pages/InlineTemplateEdit.test.tsx`

```typescript
describe('InlineTemplateEdit page', () => {
  it('loads template and repeatable');
  it('shows repeatable values in preview');
  it('creates new template version on save');
  it('migrates repeatable to new version on save');
  it('redirects back to repeatable after save');
  it('handles adding new checkboxes');
  it('handles removing checkboxes');
  it('handles reordering checkboxes');
});
```

#### Migration Screen Test
**File**: `src/client/features/Migration/MigrationScreen.test.tsx`

```typescript
describe('MigrationScreen', () => {
  it('shows progress during migration');
  it('completes and dismisses on success');
  it('shows error and retry on failure');
  it('prevents interaction while migrating');
});
```

### E2E Test Scenarios

1. **New user flow**: Create template → create repeatable → check items → edit template inline → verify checked items preserved
2. **Update flow**: Create template v1 → create repeatable → edit template separately (creates v2) → update repeatable → verify migration
3. **Migration flow**: Seed database with legacy format → load app → verify migration screen → verify data converted correctly

---

## Implementation Order

1. **Types and migration infrastructure** (Phase 1)
   - Update types
   - Create migration utilities
   - Create migration screen

2. **Migration logic** (Phase 2)
   - Template migration function
   - Repeatable migration function
   - Database migration orchestration

3. **Runtime updates** (Phase 3)
   - Update checkbox rendering
   - Update toggle handlers
   - Update rehype plugin

4. **UI features** (Phase 4)
   - Update button
   - Edit button
   - Inline edit page

5. **Testing** (Throughout)
   - Unit tests for each component
   - Integration tests for flows
   - Manual E2E testing

---

## Design Decisions

| Question | Decision |
|----------|----------|
| What happens if a user edits markdown manually and removes an ID comment? | Treat as new checkbox, regenerate ID on next save |
| Should the update button require confirmation? | No - it preserves state; only adds defaults for new items |
| What icon for the update button? | `<SystemUpdateAlt />` from MUI (or similar update icon) |
| Should we show what changed when updating? | V1: update silently. V2: could add changelog |
| Auto-save or explicit save for inline edit? | Explicit save - consistent with existing template editor |
| Block app during migration? | Yes - full-screen overlay until complete |

---

## Risk Mitigation

1. **Data loss during migration**:
   - Backup step before migration
   - Migration is additive (converts format, doesn't delete)
   - Thorough testing with real-world data shapes

2. **Performance on large databases**:
   - Batch updates
   - Progress indication
   - Tested with 1000+ documents

3. **Sync conflicts during migration**:
   - Pause sync during migration
   - Or: migrate only local docs, let server sync bring in already-migrated versions

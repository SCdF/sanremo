# Better Markdown Checkboxes Implementation Plan

## Current State

The `RepeatableRenderer` component in `src/client/features/Repeatable/RepeatableRenderer.tsx` uses a manual approach to handle GFM-style checkboxes:

1. **String splitting**: Markdown is split by newlines (line 110)
2. **Pattern matching**: Checkboxes detected via `chunk.startsWith('- [ ]')` (line 117)
3. **Multiple renders**: Each markdown chunk and checkbox rendered as separate `<ReactMarkdown>` instances
4. **Manual state binding**: Checkbox values bound via `values` array prop

### Problems with Current Approach
- **Performance**: Multiple ReactMarkdown renders instead of one
- **No nested checkbox support**: Pattern matching only works for top-level checkboxes
- **Fragile parsing**: Depends on exact `- [ ]` format at line start (trimmed)
- **Lost markdown context**: Checkboxes extracted from their list context

## Proposed Solution

Use `remark-gfm` for native task list support, combined with a custom rehype plugin to index checkboxes, and react-markdown's `components` prop to render custom checkbox components.

### Key Decisions
- **Nested checkboxes**: Supported, indexed in document order (flat `values` array)
- **Template immutability**: Markdown templates are read-only; checkbox state stays in `values` array
- **Keyboard navigation**: Native browser behavior (space on focused checkbox)
- **List styling**: Deferred to final step to compare MUI components vs CSS styling

### Architecture

```
markdown
  → remark-parse
  → remark-gfm (task list support)
  → remark-rehype (markdown → HTML AST)
  → rehypeCheckboxIndex (custom: adds data-checkbox-index)
  → react-markdown components prop (custom checkbox renderer)
  → React elements
```

---

## Implementation Steps

### Phase 1: Improve Test Coverage

Before refactoring, ensure comprehensive test coverage of current behavior.

#### Step 1.1: Add tests for markdown around checkboxes
- [ ] Test: Markdown before first checkbox renders correctly
- [ ] Test: Markdown between checkboxes renders correctly
- [ ] Test: Markdown after last checkbox renders correctly
- [ ] Test: Mixed markdown and checkboxes preserve order

#### Step 1.2: Add tests for checkbox features
- [ ] Test: Multiple checkboxes maintain correct indices
- [ ] Test: Checkbox with markdown formatting in label (bold, links, etc.)
- [ ] Test: Disabled state when `onChange` is undefined
- [ ] Test: Empty values array with checkboxes (unchecked default)

#### Step 1.3: Add tests for focus behavior
- [ ] Test: Initial focus on first unchecked checkbox
- [ ] Test: Focus advances after checking a checkbox
- [ ] Test: Focus stays when unchecking a checkbox
- [ ] Test: `hasFocus` callback fires when focus exits checkboxes
- [ ] Test: `takesFocus=false` disables auto-focus behavior

#### Step 1.4: Add edge case tests
- [ ] Test: Checkbox with empty label
- [ ] Test: Only checkboxes, no other markdown
- [ ] Test: Only markdown, no checkboxes
- [ ] Test: Whitespace-only markdown between checkboxes

---

### Phase 2: Add Dependencies

#### Step 2.1: Install remark-gfm
```bash
yarn add remark-gfm
```

#### Step 2.2: Install unist-util-visit (for AST traversal)
```bash
yarn add unist-util-visit
```

#### Step 2.3: Add TypeScript types if needed
```bash
yarn add -D @types/hast
```

---

### Phase 3: Create Rehype Plugin

#### Step 3.1: Create rehype-checkbox-index plugin

Create `src/client/features/Repeatable/rehypeCheckboxIndex.ts`:

```typescript
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * Rehype plugin that adds data-checkbox-index attribute to task list checkboxes.
 * Checkboxes are indexed in document order, including nested checkboxes.
 * This allows mapping each checkbox to its position in the values array.
 */
export function rehypeCheckboxIndex() {
  return (tree: Root) => {
    let index = 0;
    visit(tree, 'element', (node: Element) => {
      if (
        node.tagName === 'input' &&
        node.properties?.type === 'checkbox'
      ) {
        node.properties.dataCheckboxIndex = index;
        index++;
      }
    });
  };
}
```

#### Step 3.2: Write unit tests for the plugin

Test that the plugin correctly adds indices to checkboxes:
- Single checkbox
- Multiple checkboxes
- Nested checkboxes (indexed in document order)
- Checkboxes mixed with other content

---

### Phase 4: Create Checkbox Context

#### Step 4.1: Create CheckboxContext

Create `src/client/features/Repeatable/CheckboxContext.tsx`:

```typescript
import { createContext, useContext } from 'react';

export type CheckboxContextType = {
  values: boolean[];
  onChange?: (idx: number) => void;
  disabled: boolean;
  focusedIdx: number | null;
};

export const CheckboxContext = createContext<CheckboxContextType>({
  values: [],
  onChange: undefined,
  disabled: true,
  focusedIdx: null,
});

export const useCheckboxContext = () => useContext(CheckboxContext);
```

---

### Phase 5: Create Custom Input Component

#### Step 5.1: Create MarkdownTaskCheckbox component

Create `src/client/features/Repeatable/MarkdownTaskCheckbox.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { Checkbox } from '@mui/material';
import { useCheckboxContext } from './CheckboxContext';

type Props = {
  node?: unknown;
  checked?: boolean;
  disabled?: boolean;
  dataCheckboxIndex?: number;
};

export function MarkdownTaskCheckbox(props: Props) {
  const { dataCheckboxIndex: idx } = props;
  const { values, onChange, disabled, focusedIdx } = useCheckboxContext();
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // If this isn't a task list checkbox (no index), render nothing
  // (shouldn't happen, but defensive)
  if (idx === undefined) {
    return null;
  }

  const isChecked = values[idx] ?? false;
  const isFocused = focusedIdx === idx;

  useEffect(() => {
    if (isFocused && checkboxRef.current) {
      checkboxRef.current.focus();
    }
  }, [isFocused]);

  const handleChange = () => {
    if (onChange && !disabled) {
      onChange(idx);
    }
  };

  return (
    <Checkbox
      ref={checkboxRef}
      checked={isChecked}
      onChange={handleChange}
      disabled={disabled}
      edge="start"
      aria-label={`Checkbox ${idx + 1}`}
      inputProps={{
        'aria-describedby': undefined, // Let surrounding text describe it
      }}
    />
  );
}
```

---

### Phase 6: Refactor RepeatableRenderer

#### Step 6.1: Update imports

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { rehypeCheckboxIndex } from './rehypeCheckboxIndex';
import { CheckboxContext } from './CheckboxContext';
import { MarkdownTaskCheckbox } from './MarkdownTaskCheckbox';
```

#### Step 6.2: Replace chunking logic with single render

Remove the manual string splitting and chunking logic. Replace with:

```typescript
function RepeatableRenderer(props: RepeatableProps) {
  const { markdown, values, onChange, hasFocus: hasFocusCb, takesFocus } = props;

  // Focus management: find first unchecked checkbox
  const [focusedIdx, setFocusedIdx] = useState(() => {
    for (let i = 0; i < values.length; i++) {
      if (!values[i]) return i;
    }
    return values.length; // All checked, focus exits
  });

  const handleChange = useCallback((idx: number) => {
    if (onChange) {
      onChange(idx);
      // Advance focus if checking (not unchecking)
      const wasChecked = values[idx];
      setFocusedIdx(wasChecked ? idx : idx + 1);
    }
  }, [onChange, values]);

  // Notify parent when focus exits checkboxes
  useEffect(() => {
    if (takesFocus && hasFocusCb) {
      hasFocusCb(focusedIdx < values.length);
    }
  }, [focusedIdx, values.length, takesFocus, hasFocusCb]);

  const contextValue = useMemo(() => ({
    values,
    onChange: handleChange,
    disabled: !onChange,
    focusedIdx: takesFocus ? focusedIdx : null,
  }), [values, handleChange, takesFocus, focusedIdx]);

  return (
    <CheckboxContext.Provider value={contextValue}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeCheckboxIndex]}
        components={{
          input: MarkdownTaskCheckbox,
          // List styling components - see Phase 9
        }}
      >
        {markdown}
      </ReactMarkdown>
    </CheckboxContext.Provider>
  );
}
```

---

### Phase 7: Handle Nested Checkboxes

#### Step 7.1: Verify nested checkbox indexing

The rehype plugin indexes checkboxes in document order via tree traversal. Nested checkboxes will be indexed naturally:

```markdown
- [ ] Task 1           → index 0
  - [ ] Subtask 1.1    → index 1
  - [ ] Subtask 1.2    → index 2
- [ ] Task 2           → index 3
```

#### Step 7.2: Add tests for nested checkboxes

- [ ] Test: Nested checkboxes render correctly
- [ ] Test: Nested checkbox indices are in document order
- [ ] Test: Clicking nested checkbox calls onChange with correct index
- [ ] Test: Focus advances through nested checkboxes in order

---

### Phase 8: Accessibility Improvements

#### Step 8.1: Add ARIA attributes

- Add `role="group"` to the checklist container with `aria-label="Checklist"`
- Ensure checkboxes are properly labeled (text following checkbox serves as label)
- Add keyboard instructions for screen readers if needed

#### Step 8.2: Focus management accessibility

- Ensure focus is visible (MUI handles this)
- Consider adding `aria-live` region to announce progress ("3 of 5 items checked")

#### Step 8.3: Test with screen reader

Verify the component works well with VoiceOver/NVDA.

---

### Phase 9: List Styling (User Decision Required)

**Note**: This step requires user input to choose the preferred styling approach.

#### Option A: Map to MUI Components

```typescript
components={{
  input: MarkdownTaskCheckbox,
  ul: ({ children }) => <List disablePadding>{children}</List>,
  li: ({ children }) => (
    <ListItem disablePadding>
      <ListItemText>{children}</ListItemText>
    </ListItem>
  ),
}}
```

**Pros**: Consistent MUI look, matches existing app styling
**Cons**: More complex, may conflict with nested list styling

#### Option B: CSS Styling of Native Elements

```typescript
// Just use the input component, style lists via CSS
components={{
  input: MarkdownTaskCheckbox,
}}
```

Add CSS:
```css
.repeatable-markdown ul {
  list-style: none;
  padding-left: 0;
}
.repeatable-markdown li {
  display: flex;
  align-items: flex-start;
  padding: 8px 0;
}
```

**Pros**: Simpler, native nested list support
**Cons**: May not match MUI aesthetic perfectly

#### Step 9.1: Implement both options

Create both implementations so they can be toggled for comparison.

#### Step 9.2: Get user feedback

Present both options to user for final decision.

---

### Phase 10: Verify All Tests Pass

#### Step 10.1: Run existing tests
```bash
yarn test:client --run src/client/features/Repeatable/RepeatableRenderer.test.tsx
```

#### Step 10.2: Update tests for new DOM structure

The DOM structure will change (native lists vs chunked rendering). Update test selectors while preserving behavioral assertions.

#### Step 10.3: Run full test suite
```bash
yarn check && yarn test
```

---

### Phase 11: Performance Verification

#### Step 11.1: Compare render performance

Use React DevTools Profiler to compare:
- Old: Multiple ReactMarkdown renders per checkbox
- New: Single ReactMarkdown render with plugins

#### Step 11.2: Verify memoization

Ensure the component doesn't re-render unnecessarily. The context value should be memoized.

---

### Phase 12: Cleanup

#### Step 12.1: Remove unused code

After verifying everything works:
- Remove `RenderableMarkdown` type
- Remove `RenderableCheckbox` type
- Remove `Renderable` type
- Remove old `MarkdownChunk` component
- Remove old `MarkdownCheckbox` component
- Remove string splitting/chunking logic

#### Step 12.2: Consolidate files

Consider whether the new helper files should be:
- Kept separate (better modularity)
- Merged into RepeatableRenderer.tsx (simpler file structure)

#### Step 12.3: Update any documentation

If there are comments or docs referencing the old approach, update them.

---

## File Structure After Refactor

```
src/client/features/Repeatable/
├── RepeatableRenderer.tsx          # Main component (refactored)
├── RepeatableRenderer.test.tsx     # Tests (expanded)
├── CheckboxContext.tsx             # React context for checkbox state
├── MarkdownTaskCheckbox.tsx        # Custom checkbox component
├── rehypeCheckboxIndex.ts          # Rehype plugin for indexing
└── rehypeCheckboxIndex.test.ts     # Plugin tests
```

---

## Risk Mitigation

1. **Regression risk**: Comprehensive tests in Phase 1 protect against regressions
2. **DOM structure changes**: Tests updated in Phase 10 to match new structure
3. **Performance**: Verified in Phase 11 before cleanup
4. **Styling mismatch**: Phase 9 defers decision until both options can be compared

---

## Sources

- [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
- [remark-gfm GitHub](https://github.com/remarkjs/remark-gfm)
- [remarkjs Discussion #619: Custom checkbox renderer](https://github.com/orgs/remarkjs/discussions/619)
- [remark-rehype npm](https://www.npmjs.com/package/remark-rehype)

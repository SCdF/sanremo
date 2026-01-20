# useEffect Elimination Plan

Based on React's guidance from [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), this document identifies useEffect instances that are incorrectly used and should be refactored.

## Quick Reference: When to Avoid useEffect

1. **Transforming data for rendering** → Calculate during render or use `useMemo`
2. **Handling user events** → Use event handlers
3. **Resetting state on prop change** → Use `key` prop
4. **Subscribing to external stores** → Use `useSyncExternalStore`
5. **Initializing the app** → Use module-level code

---

## LOW RISK - Safe to Refactor

These useEffects can be removed with minimal impact and clear alternatives.

### 1. Page Context Effects (5 instances)

**Pattern**: Dispatching `setContext()` on mount to set page title/navigation state.

| File | Lines | Current Code |
|------|-------|--------------|
| [About.tsx](src/client/pages/About.tsx#L68-L76) | 68-76 | `useEffect(() => dispatch(setContext({title: 'About', ...})), [dispatch])` |
| [History.tsx](src/client/pages/History.tsx#L20-L27) | 20-27 | `useEffect(() => dispatch(setContext({title: 'History', ...})), [dispatch])` |
| [Home.tsx](src/client/pages/Home.tsx#L28-L35) | 28-35 | `useEffect(() => dispatch(setContext({title: 'Repeatable Checklists', ...})), [dispatch])` |
| [Template.tsx](src/client/pages/Template.tsx#L62-L70) | 62-70 | `useEffect(() => dispatch(setContext({title: template?.title, ...})))` - **No deps array!** |
| [Repeatable.tsx](src/client/pages/Repeatable.tsx#L37-L100) | 37-100 | Nested inside larger effect (context set at line ~80) |

**Why Remove**: These are setting state during render based on props/route. This is a classic anti-pattern - dispatching to set derived state that could be computed.

**Recommended Approach**:
1. Create a custom hook `usePageContext` that calls `dispatch(setContext(...))` during render
2. Or use a layout component pattern where context is set declaratively
3. For Template.tsx specifically: the missing dependency array means it runs on EVERY render - this is a bug

**Example Refactor**:
```typescript
// Option 1: Custom hook that sets context during render
function usePageContext(context: PageContext) {
  const dispatch = useAppDispatch();
  const contextRef = useRef(context);
  if (!shallowEqual(contextRef.current, context)) {
    contextRef.current = context;
  }
  useMemo(() => {
    dispatch(setContext(contextRef.current));
  }, [dispatch, contextRef.current]);
}

// Usage
function About() {
  usePageContext({ title: 'About', back: true, under: 'about' });
  // ...
}
```

**Risk Level**: LOW
- No external systems involved
- No async operations
- Easy to test
- Clear migration path

---

### 2. Debug Filter Management

**File**: [DebugManager.tsx](src/client/features/Debug/DebugManager.tsx#L12-L24) (lines 12-24)

**Current Code**:
```typescript
useEffect(() => {
  if (debugFilter === undefined) {
    dispatch(setDebug(localStorage.getItem(DEBUG_KEY)));
  } else if (debugFilter === null) {
    debugModule.disable();
    localStorage.removeItem(DEBUG_KEY);
  } else {
    debugModule.enable(debugFilter);
    localStorage.setItem(DEBUG_KEY, debugFilter);
  }
}, [debugFilter, dispatch]);
```

**Why Remove**: This is initializing state from localStorage and then syncing state changes back. The initialization should happen once at app startup, and the sync should be handled by Redux middleware - not a render effect.

**Recommended Approach**:
1. Initialize debug filter in Redux initial state (read from localStorage at store creation)
2. Use Redux middleware to sync localStorage on state changes
3. Call `debugModule.enable/disable` from the middleware

**Risk Level**: LOW
- Debug-only feature
- No user-facing impact if it breaks
- Simple state management pattern

---

## MEDIUM RISK - Refactor with Caution

These require more careful consideration and testing.

### 3. Update Manager - Install Update

**File**: [UpdateManager.tsx](src/client/features/Update/UpdateManager.tsx#L27-L33) (lines 27-33)

**Current Code**:
```typescript
useEffect(() => {
  if (registration && waitingToInstall && userReadyToUpdate) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
}, [registration, userReadyToUpdate, waitingToInstall]);
```

**Why Remove**: This is reacting to state changes to trigger an action. The `userReadyToUpdate` flag is set by a user clicking a button - the `postMessage` call should happen directly in that click handler, not as a cascading effect.

**Recommended Approach**:
- Pass `registration` to the component with the update button
- Call `registration.waiting?.postMessage({ type: 'SKIP_WAITING' })` directly in the click handler
- Remove `userReadyToUpdate` state entirely

**Risk Level**: MEDIUM
- Critical functionality (PWA updates)
- But relatively simple logic
- Straightforward event-driven refactor

---

### 4. Stale Queue Processing

**File**: [SyncManager.tsx](src/client/features/Sync/SyncManager.tsx#L211-L228) (lines 211-228)

**Current Code**:
```typescript
useEffect(() => {
  const docs = Object.values(stale);
  if (docs.length && socket && socket.connected && state === State.connected) {
    socket.emit('docUpdate', docs);
  }
  dispatch(cleanStale(docs));
}, [dispatch, socket, stale, state]);
```

**Why Remove**: This processes a queue whenever `stale` changes. The stale queue is populated by `userPut` operations - the socket emit should happen as part of that action flow, not as a reactive effect.

**Recommended Approach**:
- Move to Redux middleware that listens for actions that add to stale queue
- Emit socket events directly from the middleware when docs are added
- Or use a Redux thunk that handles both the local update and socket emit

**Risk Level**: MEDIUM
- Core sync functionality
- Logic is straightforward
- Need to ensure socket availability in middleware context

---

### 5. Socket Ready Signal

**File**: [SyncManager.tsx](src/client/features/Sync/SyncManager.tsx#L230-L237) (lines 230-237)

**Current Code**:
```typescript
useEffect(() => {
  if (socket?.connected && state === State.completed) {
    socket.emit('ready');
    dispatch(socketConnected());
  }
}, [dispatch, socket, state]);
```

**Why Remove**: This is reacting to sync completion to emit a ready signal. The sync completion happens in another useEffect - the ready signal should be emitted directly at the end of that sync logic, not as a cascading effect.

**Recommended Approach**:
- At the end of the full sync handler (after `dispatch(completeSync())`), emit the ready signal and dispatch `socketConnected()` directly
- This makes the flow explicit rather than reactive

**Risk Level**: MEDIUM
- Part of sync flow
- Simple conditional logic
- Timing might be tricky - need to ensure socket is available

---

## Summary

| Risk | Count | Description |
|------|-------|-------------|
| LOW | 6 | 5 page context effects + debug filter management |
| MEDIUM | 3 | Update install trigger, stale queue processing, socket ready signal |

**Total**: 9 useEffects to refactor

## Recommended Priority

1. **First**: Fix the Template.tsx missing dependency array (bug!)
2. **Second**: Refactor page context effects (LOW risk, 5 instances, same pattern)
3. **Third**: Move debug filter to Redux middleware (LOW risk)
4. **Fourth**: Refactor UpdateManager install trigger to event handler (MEDIUM risk)
5. **Fifth**: Refactor SyncManager stale queue and ready signal (MEDIUM risk, related changes)

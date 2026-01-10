# Dependency Upgrade Plan for Sanremo

## Executive Summary

The project has **65 outdated dependencies**:
- **32 Major version updates** (potentially breaking)
- **30 Minor version updates** (backwards-compatible features)
- **3 Patch updates** (bug fixes only)

This plan provides a safe, phased approach to upgrading all dependencies while minimizing risk of breaking changes.

## Current Stack Analysis

### Frontend
- **React 18.2.0** → 19.2.3 (major)
- **Material-UI 5.15.5** → 7.3.7 (major, skips v6)
- **React Router 6.21.3** → 7.12.0 (major)
- **Redux Toolkit 2.0.1** → 2.11.2 (minor)
- **TypeScript 4.9.5** → 5.9.3 (major)

### Backend
- **Express 4.18.2** → 5.2.1 (major)
- **PostgreSQL (pg) 8.11.3** → 8.16.3 (minor)
- **Socket.io 4.7.4** → 4.8.3 (minor)

### Build Tools
- **Parcel 2.11.0** → 2.16.3 (minor)
- **Babel 7.23.x** → 7.28.5 (minor)
- **Biome 1.5.2** → 2.3.11 (major)
- **Vitest 3.1.1** → 4.0.16 (major)

## Risk Assessment

### HIGH RISK (Major Breaking Changes)
1. **React 18→19**: Changes to types, deprecated APIs, StrictMode behavior
2. **Material-UI 5→7**: Component API changes, theme system updates, `ListItem button` prop removed
3. **Express 4→5**: Middleware signature changes, routing API updates
4. **TypeScript 4→5**: JSX transform changes, stricter type checking
5. **React Router 6→7**: New data loading APIs, component deprecations

### MEDIUM RISK (Known Issues)
1. **Biome 1→2**: Configuration format changes
2. **Vitest 3→4**: Config API changes
3. **React Testing Library 14→16**: Testing patterns updated

### LOW RISK (Minor/Patch Updates)
- All minor and patch updates are backwards-compatible by semver

## Phased Upgrade Strategy

### Phase 1: Foundation & Build Tools (Low Risk)
**Goal**: Upgrade build tooling and testing infrastructure without touching application code

**Dependencies**:
- Parcel: 2.11.0 → 2.16.3 (minor, includes all @parcel/* packages)
- Babel: 7.23.x → 7.28.5 (minor, all @babel/* packages)
- TypeScript type definitions (non-breaking)
- Testing utilities (minor versions only)

**Why First**:
- Build tools should be on latest before code changes
- Establishes baseline that subsequent phases depend on
- Easy to rollback if issues arise

**Testing**:
```bash
yarn check && yarn test
yarn build
# Verify dist/client output matches expected hash format
```

**Estimated Risk**: 🟢 Low

---

### Phase 2: Linter & Type Checking (Medium Risk)
**Goal**: Upgrade Biome and prepare for stricter TypeScript

**Dependencies**:
- Biome: 1.5.2 → 2.3.11 (major)
- @types/node: 20.11.5 → 25.0.3 (major)

**Breaking Changes**:
- Biome 2.x has new configuration format
- May require updating `biome.json`
- New linting rules may flag existing code

**Migration Steps**:
1. Upgrade Biome to 2.x
2. Run `biome migrate` if config migration tool exists
3. Fix any new linting errors
4. Update `.claude.md` if check command changes

**Testing**:
```bash
yarn check  # Should pass with potential new warnings
yarn test   # All tests should still pass
```

**Rollback Strategy**: Revert biome.json and package.json changes

**Estimated Risk**: 🟡 Medium

---

### Phase 3: Server Dependencies (Medium Risk)
**Goal**: Upgrade backend dependencies with minimal breaking changes

**Dependencies (Minor Updates First)**:
- pg: 8.11.3 → 8.16.3
- pg-protocol: 1.6.0 → 1.10.3
- socket.io: 4.7.4 → 4.8.3
- socket.io-client: 4.7.4 → 4.8.3
- express-session: 1.17.3 → 1.18.2
- compression: 1.7.4 → 1.8.1
- debug: 4.3.4 → 4.4.3
- axios: 1.6.5 → 1.13.2
- All @types/* for server packages

**Why Before Express 5**:
- These are all minor/patch updates (low risk)
- Gets dependencies current before tackling Express major version
- PostgreSQL client updates may include security fixes

**Testing**:
```bash
yarn test:server --run
# Manual testing:
# 1. Start local postgres: docker compose up -d (if applicable)
# 2. yarn start:local
# 3. Test login, session persistence, socket.io sync
```

**Estimated Risk**: 🟡 Medium (database changes always carry risk)

---

### Phase 4: React Ecosystem - Minor Updates (Low Risk)
**Goal**: Upgrade React ecosystem packages that don't require code changes

**Dependencies**:
- @reduxjs/toolkit: 2.0.1 → 2.11.2 (minor)
- react-redux: 9.1.0 → 9.2.0 (minor)
- @emotion/react: 11.11.3 → 11.14.0 (minor)
- @emotion/styled: 11.11.0 → 11.14.1 (minor)
- date-fns: 2.30.0 → 4.1.0 (major, but breaking changes are minor)

**Testing**:
```bash
yarn test:client --run
yarn dev  # Verify hot reload works
```

**Estimated Risk**: 🟢 Low

---

### Phase 5: TypeScript 4→5 (High Risk)
**Goal**: Upgrade TypeScript compiler with minimal code changes

**Dependencies**:
- typescript: 4.9.5 → 5.9.3 (major)

**Breaking Changes**:
- Stricter type checking
- `const` type parameters
- Decorators syntax changes (not used in this codebase)
- Module resolution improvements

**Known Issues**:
- Current tsconfig uses `jsx: "react-jsx"` which is TS 4.1+, so compatible
- May require fixing type errors that were previously ignored
- `@ts-ignore` comments may need review (2 instances in server/index.ts)

**Migration Steps**:
1. Upgrade typescript package
2. Run type checking on both targets:
   ```bash
   tsc --noEmit -p src/client/tsconfig.json
   tsc --noEmit -p src/server/tsconfig.json
   ```
3. Fix any new type errors
4. Update `@types/*` packages if needed

**Testing**:
```bash
yarn check  # TypeScript check is part of this
yarn test
yarn build  # Ensure Parcel handles TS 5 correctly
```

**Estimated Risk**: 🔴 High (type errors may require code changes)

---

### Phase 6: Testing Infrastructure (Medium Risk)
**Goal**: Upgrade Vitest and testing libraries

**Dependencies**:
- vitest: 3.1.1 → 4.0.16 (major)
- @vitest/ui: 3.1.1 → 4.0.16 (major)
- @testing-library/react: 14.1.2 → 16.3.1 (major)
- @testing-library/dom: 7.31.2 → 10.4.1 (major)
- @testing-library/user-event: 13.5.0 → 14.6.1 (major)
- @testing-library/jest-dom: 6.6.3 → 6.9.1 (minor)
- jsdom: 26.0.0 → 27.4.0 (major)

**Breaking Changes**:
- Vitest 4.x has new config format
- Testing Library updated to match React 19 patterns
- New testing utilities and deprecations

**Migration Steps**:
1. Upgrade vitest packages
2. Update `src/client/vitest.config.js` if needed
3. Update `src/server/vitest.config.js` if needed
4. Fix any test failures due to new behavior
5. Review testing patterns (especially with React 19 later)

**Testing**:
```bash
yarn test:client --run
yarn test:server --run
```

**Rollback Strategy**: Tests are isolated; revert package.json and fix configs

**Estimated Risk**: 🟡 Medium

---

### Phase 7: React 18→19 (High Risk)
**Goal**: Upgrade React core with minimal breaking changes

**Dependencies**:
- react: 18.2.0 → 19.2.3 (major)
- react-dom: 18.2.0 → 19.2.3 (major)
- react-test-renderer: 18.2.0 → 19.2.3 (major)
- @types/react: 18.2.48 → 19.2.7 (major)
- @types/react-dom: 18.2.18 → 19.2.3 (major)
- @types/react-test-renderer: 18.0.7 → 19.1.0 (major)

**Breaking Changes**:
- `ReactDOM.render` removed (not used - already using `createRoot`)
- `React.FC` type changes
- StrictMode runs effects twice in development (already doing this)
- `ReactDOM.unstable_batchedUpdates` deprecated (used in Repeatable.tsx lines 86, 153)
- New JSX transform requirements

**Code Changes Required**:
1. Replace `ReactDOM.unstable_batchedUpdates()` with automatic batching (React 18+ feature)
   - File: `src/client/pages/Repeatable.tsx` (lines 86, 153)
   - Just remove the wrapper - React 19 batches automatically

2. Review class component (CompleteButton in Repeatable.tsx)
   - May be obsolete with Material-UI v7 updates later

**Testing**:
```bash
yarn test:client --run
yarn dev  # Visual testing of all routes
# Specifically test:
# - /repeatable/:id (uses unstable_batchedUpdates)
# - Form interactions
# - Hot reload still works
```

**Rollback Strategy**: React changes are pervasive; prepare to revert all Phase 7 changes

**Estimated Risk**: 🔴 High

---

### Phase 8: Material-UI 5→7 (Highest Risk)
**Goal**: Upgrade MUI with significant breaking changes

**Dependencies**:
- @mui/material: 5.15.5 → 7.3.7 (major, skips v6)
- @mui/icons-material: 5.15.5 → 7.3.7 (major)

**Critical Breaking Changes**:
1. **`ListItem button` prop removed** (used in RepeatableRenderer.tsx line 52, RepeatableListItem.jsx)
   - Replace with `ListItemButton` component

2. **Theme system changes**
   - `sx` prop is stable
   - `createTheme` API may have new options

3. **Component prop deprecations**
   - Need to review all 22 files that import MUI components

4. **Icon imports may change**

**Migration Steps**:
1. Review official MUI migration guide: https://mui.com/material-ui/migration/migrating-to-v7/
2. Install codemod tool (if available): `npx @mui/codemod@latest`
3. Run automated migrations
4. Manually fix remaining issues:
   - Replace `<ListItem button>` with `<ListItemButton>`
   - Update theme provider if needed
   - Fix any icon import changes
5. Remove CompleteButton class component workaround (likely fixed in v7)

**Files Requiring Changes** (22 files use MUI):
- src/client/features/Repeatable/RepeatableRenderer.tsx
- src/client/features/Repeatable/RepeatableListItem.jsx
- src/client/pages/Repeatable.tsx
- src/client/pages/Template.tsx
- src/client/pages/Home.tsx
- src/client/pages/Page.tsx
- src/client/features/Page/UserMenuItem.tsx
- ... (and 15 more files)

**Testing**:
```bash
yarn test:client --run
yarn dev
# Manual visual testing of ALL components:
# - List items (RepeatableListItem, TemplateListItem)
# - Buttons and button groups
# - Forms and text fields
# - Dialogs and menus
# - Theme colors and spacing
```

**Rollback Strategy**: Full rollback of Phase 8 if UI is broken

**Estimated Risk**: 🔴🔴 Highest (significant UI changes required)

---

### Phase 9: React Router 6→7 (High Risk)
**Goal**: Upgrade routing library with data loading changes

**Dependencies**:
- react-router-dom: 6.21.3 → 7.12.0 (major)

**Breaking Changes**:
- New data loading APIs (loaders, actions)
- Component deprecations
- Navigation patterns may change

**Current Usage**:
- `BrowserRouter`, `Routes`, `Route` components
- `useNavigate`, `useParams`, `useLocation` hooks
- `Link` component

**Migration Steps**:
1. Review React Router v7 migration guide
2. Update route definitions in App.tsx
3. Test all navigation patterns
4. Consider adopting new data loading if beneficial

**Testing**:
```bash
yarn test:client --run
# Manual testing:
# - Navigate between all routes
# - Test back button
# - Test programmatic navigation
# - Test URL parameter parsing
```

**Estimated Risk**: 🔴 High

---

### Phase 10: Express 4→5 (High Risk)
**Goal**: Upgrade Express with middleware changes

**Dependencies**:
- express: 4.18.2 → 5.2.1 (major)
- @types/express: 4.17.21 → 5.0.6 (major)
- connect-pg-simple: 6.2.1 → 10.0.0 (major, depends on express-session)

**Breaking Changes**:
- Middleware signature changes
- Error handling updates
- Response methods deprecated
- Trust proxy behavior changes

**Known Risks**:
- Dual-cookie authentication pattern (already has security concerns in comments)
- Socket.io integration via express-session middleware (has `@ts-ignore` comment)

**Migration Steps**:
1. Review Express 5 migration guide
2. Update middleware in server/index.ts
3. Test all API endpoints
4. Verify session management still works
5. Test Socket.io handshake

**Testing**:
```bash
yarn test:server --run
yarn start:local
# Manual API testing:
# - POST /api/auth (login)
# - PUT /api/auth (register)
# - GET /api/auth (session check)
# - All /api/sync/* endpoints
# - Socket.io connection and events
```

**Estimated Risk**: 🔴 High (server changes affect all users)

---

### Phase 11: Remaining Major Updates (Medium Risk)
**Goal**: Upgrade remaining packages with major version bumps

**Dependencies**:
- bcryptjs: 2.4.3 → 3.0.3 (verify password hashing compatibility)
- uuid: 8.3.2 → 13.0.0 (API changes for UUID generation)
- react-markdown: 5.0.3 → 10.1.0 (markdown rendering updates)
- pouchdb-*: 7.3.1 → 9.0.0 (client-side database, check compatibility)
- workbox-*: 7.0.0 → 7.4.0 (service worker, check manifest injection)

**Migration Steps**:
1. Review each package's changelog
2. Update import statements if needed
3. Test affected features:
   - Password hashing (bcryptjs)
   - ID generation (uuid)
   - Markdown rendering (react-markdown in RepeatableRenderer.tsx)
   - Offline sync (pouchdb)
   - Service worker (workbox + inject-manifest.mjs script)

**Testing**:
```bash
yarn test
yarn build
# Verify service worker manifest injection still works
# Test offline capabilities
```

**Estimated Risk**: 🟡 Medium

---

### Phase 12: Minor/Patch Cleanup (Low Risk)
**Goal**: Apply all remaining minor and patch updates

**Dependencies**: All remaining packages from npm-check-updates output

**Testing**:
```bash
yarn check && yarn test
yarn build
```

**Estimated Risk**: 🟢 Low

---

## Execution Strategy

### Option A: Conservative (Recommended)
Execute phases 1-12 sequentially over multiple days/weeks:
1. Create a new branch for each phase
2. Complete phase, run tests, create PR
3. Merge to main after validation
4. Wait for CI to pass before starting next phase
5. Monitor production (if applicable) between phases

**Pros**: Minimizes risk, easy to identify which phase broke something
**Cons**: Time-consuming (could take 2-3 weeks)

### Option B: Moderate
Combine low-risk phases:
- Phases 1+2: Foundation & linting (2 PRs → 1 PR)
- Phases 3+4: Server & React minor updates (2 PRs → 1 PR)
- Phases 5,6,7,8,9,10,11,12 remain separate

**Pros**: Faster than conservative, still relatively safe
**Cons**: Harder to debug if combined phases fail

### Option C: Aggressive (Not Recommended)
Upgrade everything at once using `npx npm-check-updates -u`

**Pros**: Fast
**Cons**: Very high risk, hard to debug failures, difficult rollback

---

## General Testing Checklist (After Each Phase)

### Automated Tests
```bash
yarn check        # Linting + TypeScript
yarn test         # All tests
yarn build        # Production build
```

### Manual Testing (Critical Paths)
1. **Authentication**: Register, login, logout, session persistence
2. **Document Management**: Create, edit, delete documents/templates
3. **Real-time Sync**: Socket.io updates across multiple clients
4. **Offline Support**: Service worker, PouchDB sync
5. **Routing**: All routes load correctly, navigation works
6. **UI Components**: Forms, buttons, lists, dialogs render properly

### Build Verification
- `dist/client` output has correct file hash format (`.12345678.ext`)
- Service worker manifest contains all expected files
- Bundle size hasn't increased dramatically

---

## Rollback Procedures

### Per-Phase Rollback
1. Create rollback branch from previous state
2. Revert package.json changes for that phase
3. Run `yarn install`
4. Verify tests pass
5. Push rollback commit
6. Optional: Create issue documenting why rollback was needed

### Emergency Full Rollback
```bash
git reset --hard <last-known-good-commit>
yarn install
yarn check && yarn test
```

---

## Key Files to Monitor

### Build Configuration
- `package.json` - All dependency versions
- `.parcelrc` - Parcel transformer config
- `babel.config.json` - Babel presets
- `biome.json` - Linter config
- `src/client/tsconfig.json` - Client TypeScript
- `src/server/tsconfig.json` - Server TypeScript

### Code Requiring Updates
- `src/client/pages/Repeatable.tsx` (React 19: unstable_batchedUpdates, MUI v7: CompleteButton)
- `src/client/features/Repeatable/RepeatableRenderer.tsx` (MUI v7: ListItem button)
- `src/client/features/Repeatable/RepeatableListItem.jsx` (MUI v7: ListItem button)
- `src/server/index.ts` (Express 5: middleware, session, socket.io integration)
- `scripts/inject-manifest.mjs` (Workbox updates)

### Testing
- All test files (10 files): May need updates for React 19 + Testing Library 16
- `src/client/vitest.config.js` - May need Vitest 4 updates
- `src/server/vitest.config.js` - May need Vitest 4 updates

---

## Success Criteria

Each phase is considered successful when:
- ✅ All automated tests pass (`yarn check && yarn test`)
- ✅ Production build completes without errors
- ✅ Manual testing of affected features passes
- ✅ No new console errors or warnings in browser/server
- ✅ Bundle size increase is acceptable (< 10% per phase)
- ✅ CI pipeline passes on GitHub Actions

---

## Timeline Estimate (Conservative Approach)

| Phase | Duration | Reason |
|-------|----------|--------|
| 1 | 1-2 hours | Simple build tool upgrades |
| 2 | 2-3 hours | Biome config migration + fixing lint issues |
| 3 | 2-4 hours | Server deps + database testing |
| 4 | 1-2 hours | Minor React updates |
| 5 | 3-5 hours | TypeScript type errors |
| 6 | 2-4 hours | Testing library updates + test fixes |
| 7 | 3-6 hours | React 19 + code changes |
| 8 | 6-10 hours | MUI migration + extensive UI testing |
| 9 | 2-4 hours | React Router updates |
| 10 | 4-6 hours | Express 5 + session/socket.io testing |
| 11 | 3-5 hours | Remaining major updates |
| 12 | 1-2 hours | Final cleanup |

**Total**: 30-53 hours over 2-3 weeks with conservative approach

---

## Additional Notes

### Dependencies with Security Implications
- **bcryptjs**: Password hashing - verify hashes remain compatible
- **express-session**: Session management - test thoroughly
- **pg**: Database driver - check for SQL injection fixes
- **axios**: HTTP client - may have security patches

### Performance Considerations
- Material-UI v7 may have performance improvements
- React 19 compiler optimizations
- Express 5 performance improvements
- Monitor bundle size after each phase

### Breaking Change Documentation
Each package's breaking changes are documented in their respective changelogs:
- React: https://react.dev/blog/2024/04/25/react-19
- Material-UI: https://mui.com/material-ui/migration/migrating-to-v7/
- Express: https://expressjs.com/en/guide/migrating-5.html
- TypeScript: https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/

---

## Test Coverage Analysis

### Current Test Suite (46 tests total)

**Client Tests (40 tests across 9 files):**
- ✅ RelativeTime.test.tsx (2 tests) - Component rendering and updates
- ✅ RepeatableSlug.test.tsx (8 tests) - All slug types + relevance logic
- ✅ RepeatableRenderer.test.tsx (6 tests) - Markdown rendering + checkbox interactions
- ✅ Page.test.tsx (2 tests) - Basic rendering + title setting
- ✅ UserProvider.test.tsx (7 tests) - **Comprehensive** authentication scenarios
- ✅ Home.test.tsx (3 tests) - Template/repeatable list rendering
- ✅ Repeatable.test.jsx (6 tests) - **Comprehensive** completion/redirect logic
- ✅ TemplateListItem.test.jsx (1 test) - Basic rendering
- ✅ RepeatableListItem.test.tsx (5 tests) - All slug display types

**Server Tests (6 tests in 1 file):**
- ✅ sync.test.ts (6 tests) - Sync algorithm logic (begin, request, update, deletes)

### Critical Coverage Gaps

**🔴 HIGH RISK - Zero Test Coverage:**

1. **Server Core (src/server/index.ts)** - ZERO TESTS
   - Express server setup, middleware configuration
   - Session management (connect-pg-simple + express-session)
   - Socket.io integration and handshake
   - Authentication API endpoints (/api/auth)
   - **Risk**: Phase 10 (Express 5) changes middleware/session APIs with NO test safety net

2. **Server Database (src/server/db.ts, src/server/sync/db.ts)** - ZERO TESTS
   - PostgreSQL connection and queries
   - User document storage/retrieval
   - **Risk**: Phase 3 (pg upgrade) has no automated validation

3. **Server Sync Routes (src/server/sync/routes.ts)** - ZERO TESTS
   - API endpoints: /api/sync/begin, /api/sync/request, /api/sync/update
   - **Risk**: Express 5 breaking changes to routing

4. **Client Database Layer (src/client/db/)** - ZERO TESTS
   - PouchDB setup, migrations (0.0.4.ts), db-mirror.ts
   - **Risk**: Phase 11 (PouchDB 7→9) has no test coverage

5. **Client Sync Manager (src/client/features/Sync/)** - ZERO TESTS
   - Socket.io client integration
   - Real-time sync orchestration
   - **Risk**: Phase 3 (Socket.io upgrade) has no client-side tests

6. **Client App.tsx** - ZERO TESTS
   - React Router setup
   - Theme provider
   - **Risk**: Phase 9 (React Router 7) and Phase 8 (MUI 7) lack coverage

7. **Service Worker** - ZERO TESTS
   - serviceWorkerRegistration.ts, service-worker.ts
   - **Risk**: Phase 11 (Workbox upgrade) has no validation

**🟡 MEDIUM RISK - Partial or Indirect Coverage:**

1. **Redux Slices** (docsSlice, syncSlice, userSlice, etc.)
   - Only tested indirectly through component tests
   - **Risk**: Phase 4 (Redux Toolkit 2.0→2.11) lacks direct slice tests

2. **Material-UI Components** - Most MUI usage untested
   - Template.tsx, History.tsx, various UI components
   - **Risk**: Phase 8 (MUI 7) requires extensive manual testing

3. **Update/Debug Features** - No tests
   - UpdateManager, DebugPanel, etc.
   - **Risk**: Low (not critical path, but should work)

### Test Quality Assessment

**Strengths:**
- ✅ UserProvider has excellent authentication coverage (7 scenarios)
- ✅ Repeatable completion logic well-tested (edge cases covered)
- ✅ Sync algorithm logic has good unit test coverage
- ✅ Locale-independent test patterns established (dates/timestamps)

**Weaknesses:**
- ❌ No integration tests for critical paths (login → sync → offline → back online)
- ❌ No API endpoint tests (Express routes completely untested)
- ❌ No database layer tests (neither PostgreSQL nor PouchDB)
- ❌ No Socket.io event tests
- ❌ No service worker tests

### Coverage by Upgrade Phase Risk

| Phase | Dependency | Test Coverage | Risk Mitigation |
|-------|-----------|---------------|-----------------|
| 1 | Build Tools | N/A (tooling) | Manual build verification |
| 2 | Biome | N/A (linting) | Automated linting checks |
| 3 | Server Deps | **🔴 0%** server tests | **HIGH RISK** - manual testing required |
| 4 | React Minor | ~60% component coverage | Medium risk - gaps in MUI components |
| 5 | TypeScript 5 | ~50% overall | Type checking helps, but runtime gaps exist |
| 6 | Testing Infra | ~100% (self-validating) | Low risk - tests will break immediately |
| 7 | React 19 | ~60% component coverage | Medium risk - some components untested |
| 8 | Material-UI 7 | **🔴 ~30%** MUI usage | **HIGH RISK** - extensive manual testing needed |
| 9 | React Router 7 | **🔴 0%** App.tsx | **HIGH RISK** - routing completely untested |
| 10 | Express 5 | **🔴 0%** server/index.ts | **HIGHEST RISK** - no automated validation |
| 11 | Major Updates | **🔴 0%** database/SW | **HIGH RISK** - critical features untested |
| 12 | Minor/Patch | Varies | Low risk by definition |

### Recommendation: Proceed with Caution

**Assessment**: Current test coverage is **NOT sufficient** for safe automated dependency upgrades.

**Why We Can Still Proceed:**
1. ✅ Core business logic IS tested (sync algorithm, completion semantics, authentication)
2. ✅ Build/linting provides some safety net
3. ✅ Manual testing checklist exists in plan
4. ⚠️ User is actively involved and can test between phases

**Required Precautions:**

1. **Before Phase 3 (Server Deps):**
   - Add manual test checklist: Login, create repeatable, sync across clients, session persistence
   - Test Socket.io connection manually
   - Verify PostgreSQL queries still work

2. **Before Phase 8 (MUI 7):**
   - Manually test ALL pages: Home, Repeatable, Template, History, About
   - Verify all buttons, forms, dialogs, menus work
   - Check responsive layout

3. **Before Phase 10 (Express 5):**
   - Manually test ALL API endpoints: /api/auth (GET, POST, PUT), /api/sync/*
   - Verify session management works
   - Test Socket.io handshake and events

4. **Between EVERY Phase:**
   - Run full manual testing checklist
   - Test in multiple browsers
   - Test offline/online transitions (critical for this app!)

**Optional: Add Tests Before Upgrading**

If the user wants to reduce risk further, these tests should be written FIRST:

**Priority 1 (Highest Impact):**
- src/server/index.ts integration tests (Express + sessions + Socket.io)
- src/server/sync/routes.ts API endpoint tests
- src/client/App.tsx routing tests

**Priority 2 (Medium Impact):**
- src/client/features/Sync/SyncManager.tsx integration tests
- src/client/db/ database layer tests
- Additional Material-UI component tests

**Priority 3 (Nice to Have):**
- Service worker tests
- Redux slice unit tests
- Update/Debug feature tests

**Decision Point**: Should we:
- **Option A**: Proceed with upgrades using extensive manual testing (faster, higher risk)
- **Option B**: Write critical tests first, then upgrade (slower, safer)
- **Option C**: Hybrid - write server tests (Priority 1), then proceed with manual testing for client

### Next Step: Install Coverage Tooling

The analysis above is based on manual file inspection. To get precise coverage metrics:

1. Install Vitest coverage package:
   ```bash
   yarn add -D @vitest/coverage-v8
   ```

2. Run coverage reports:
   ```bash
   yarn test:client --run --coverage
   yarn test:server --run --coverage
   ```

3. Review coverage reports (HTML reports in coverage/ directory)

4. Update this plan with actual line/branch/function coverage percentages

This will provide concrete data on exactly which lines are covered vs. the current estimate-based analysis.

---

## Conclusion

This phased approach balances speed with safety. The most critical phases are:
- **Phase 5** (TypeScript): May require significant type fixes
- **Phase 7** (React 19): Core framework upgrade
- **Phase 8** (Material-UI): Extensive UI changes required, **~30% test coverage**
- **Phase 10** (Express 5): Server-side breaking changes, **0% test coverage** - HIGHEST RISK

**Test Coverage Summary**:
- Strong: Business logic (sync, auth, repeatables)
- Weak: Infrastructure (database, routing, real-time sync)
- Missing: Integration tests for critical paths

Starting with low-risk phases builds confidence and establishes patterns for handling higher-risk upgrades later. However, **manual testing will be critical** for Phases 3, 8, 9, 10, and 11 due to insufficient automated coverage.

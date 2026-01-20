# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sanremo is an offline-first PWA for managing repeatable checklists. It uses PouchDB for local storage with server synchronization, allowing users to create checklist templates and instances that work offline and sync when online.

**Hosted at:** https://sanremo.sdufresne.info
**GitHub:** https://github.com/SCdF/sanremo/

## Package Manager

**IMPORTANT: This project uses Yarn, NOT npm.**
- Always use `yarn` or `yarn add` commands
- Never use `npm install` or `npm` commands
- Package manager is enforced via `.yarnrc` configuration
- Yarn is located at `/home/scdf/.volta/bin/yarn`

## Development Commands

### Essential Commands
```bash
# Install dependencies
yarn

# Development (client only, no server needed)
yarn dev

# Build entire application
yarn build

# Linting and type checking
yarn check                # Runs Biome linter + TypeScript type checking
yarn biome                # Biome linter only

# Testing
yarn test                 # Run all tests (client + server) once
yarn test:client          # Run client tests in watch mode
yarn test:server          # Run server tests in watch mode

# Run specific test files
# IMPORTANT: Use --run flag to disable watch mode when verifying tests
yarn test:client --run src/client/features/User/UserProvider.test.tsx
yarn test:server --run src/server/sync/sync.test.ts

# Only use watch mode (without --run) when actively developing and watching for changes
```

### Server Commands (requires PostgreSQL)
```bash
# Start production server
yarn start

# Start local development server
yarn start:local          # Uses postgres://postgres:postgres@localhost:15432

# Access PostgreSQL
yarn psql                 # Connect to local dev database

# Build targets separately
yarn build:client
yarn build:server
```

### Database Setup
PostgreSQL must be initialized with both the session store schema and application schema:
```bash
psql < node_modules/connect-pg-simple/table.sql
psql < src/server/sql/20210525\ init.sql
psql < src/server/sql/20210602\ json.sql
```

## Architecture

### Client/Server Split
- **Client (`src/client/`)**: React + Redux Toolkit PWA using PouchDB for offline storage
- **Server (`src/server/`)**: Express + Socket.IO server with PostgreSQL backend
- **Shared (`src/shared/`)**: Common types and utilities

### Client Architecture

**State Management**: Redux Toolkit with feature-based slices:
- `user`: Authentication state
- `docs`: PouchDB document cache
- `sync`: Synchronization state and queues
- `page`: UI page state
- `debug`: Debug information
- `update`: Service worker update notifications

**Database**: PouchDB with IndexedDB adapter
- Local-first storage in `sanremo-{username}` database
- Custom `userPut()` method that updates both PouchDB and sync queue
- Database handle stored outside Redux (non-serializable)

**Features** (located in `src/client/features/`):
- **Repeatable**: Checklist instances
- **Template**: Checklist templates
- **User**: Authentication and user management
- **Sync**: Server synchronization via HTTP + Socket.IO
- **Page**: Navigation and UI state
- **Debug**: Development debugging tools
- **Update**: PWA update notifications

### Server Architecture

**Stack**: Express + PostgreSQL + Socket.IO

**Authentication**: Dual-cookie system
- Server cookie (httpOnly): Used by express-session
- Client cookie (non-httpOnly): Allows offline logout
- Both required for valid session
- All `/api/*` endpoints (except auth) require both cookies

**Synchronization** (see `ARCHITECTURE.md` for details):
- Full sync on connection: Client sends all doc IDs, server computes diff
- Streaming updates: Socket.IO broadcasts changes to connected clients
- Client-side queue: Local changes batched and pushed via socket
- Race conditions exist between full sync and socket ready state

**Database Schema**:
- `users`: User accounts with bcrypt passwords
- `session`: Express session store (from connect-pg-simple)
- `raw_client_documents`: Stores full client document state per user

### Data Model

**Template Document** (`repeatable:template:<uuid>:<version>`):
- Versioned checklist templates
- Markdown content with checkboxes (`- [ ] item`)
- Default values and slug configuration
- Immutable versioning: new version created if instances exist

**Repeatable Document** (`repeatable:instance:<uuid>`):
- Instance of a template
- References template ID for version locking
- Checkbox values aligned to template
- Slug for identification (date, URL, timestamp, or string)
- Optional completion timestamp and notes

## Pre-Commit Workflow

### CRITICAL: Branch Strategy
**NEVER commit code changes directly to `main`.**

**When starting NEW work:**
1. Check out latest main: `git checkout main`
2. Pull latest changes: `git pull`
3. Create a new branch: `git checkout -b descriptive-branch-name`
4. Make code changes
5. Run pre-commit checks
6. Commit and push

**If you already made changes on the wrong branch:**
1. Stash changes: `git stash`
2. Check out main: `git checkout main`
3. Pull latest: `git pull`
4. Create new branch: `git checkout -b descriptive-branch-name`
5. Restore changes: `git stash pop`
6. Continue with pre-commit checks and commit

### Pre-Commit Checklist
Always run before committing:
```bash
yarn check && yarn test
```

Both must pass with no errors before committing.

### After Pushing
1. Create PR: `gh pr create`
2. Check CI status: `gh pr checks`
3. Fix any CI failures on the branch
4. Note: CI environment differs (locale, timezone, Node version)
5. Report results with PR link and status

## Code Style

### Linting: Biome
- Import ordering: Library imports → React → Local imports
- Single quotes, 100 char line width
- Semicolons required
- Formatted with Biome (not Prettier)

Example import order:
```typescript
import { screen } from '@testing-library/react';
import React from 'react';
import { MyComponent } from './MyComponent';
```

### TypeScript Configuration
- **Client**: React JSX, DOM types, ES2017 target
- **Server**: ES2022 modules, ES2020 target, Node resolution
- Strict mode enabled for both

### Testing
- **Client tests**: Vitest with jsdom, setup in `src/client/test-utils/test-setup.ts`
- **Server tests**: Vitest with default Node environment
- Testing library for React components
- **vitest-when**: Use for binding mock return values to specific parameters

**CRITICAL: Test Fixing Policy**
- **NEVER fix failing tests by deleting or skipping them**
- **NEVER use `.skip()` or `.only()` to avoid test failures**
- When tests fail after code changes:
  1. Investigate the root cause of the failure
  2. Fix the test setup, mocks, or assertions to properly handle the new behavior
  3. If the code change is correct and the test expectation is wrong, update the test
  4. If the code change broke functionality, fix the code, not the test
- Failing tests indicate either:
  - A regression in functionality (fix the code)
  - Outdated test expectations (update the test properly)
  - Incorrect test setup/mocks (fix the mocks)

**Mock Best Practices**:
- Don't just mock return values - use `vitest-when` to bind return values to expected parameters
- This tests both how the mock is called AND what's done with the response
- Example:
  ```typescript
  import { when } from 'vitest-when';

  // Good: Binds mock response to specific input
  when(handle.get).calledWith('doc-id').thenResolve(mockDoc);

  // Bad: Doesn't verify the call parameters
  handle.get.mockResolvedValue(mockDoc);
  ```
- vitest-when API: `.thenReturn()` for sync, `.thenResolve()` for promises, `.thenThrow()` for errors
- When a component makes multiple calls to the same mock with different parameters, use `mockImplementation` instead of `mockResolvedValue` to handle each call pattern

**Locale Gotcha**: `toLocaleDateString()` and `toLocaleString()` format differently in CI vs local. Always use same formatting method in tests as component uses.

## Build System

**Parcel 2** with dual targets:
- **client**: Builds from `src/client/index.html`, outputs to `dist/client/`
- **server**: Builds from `src/server/index.ts`, outputs ES module

Service worker manifest injection via `scripts/inject-manifest.mjs` runs post-build.

## Development Notes

- **PWA**: Service worker registration in `src/client/serviceWorkerRegistration.ts`
- **Dev proxy**: `.proxyrc` configures Parcel dev server proxy to API
- **Database migrations**: Applied in order from `src/server/sql/`
- **Feature flags**: None currently, code ships as-is
- **Debugging**: Uses `debug` package, enable with `DEBUG=sanremo:*` env var

# Plan: Replace Axios with Fetch

This document outlines the plan to remove axios from the codebase and replace it with the native `fetch` API.

## Current State

### Files Using Axios (4 total, all client-side)

1. **[UserProvider.tsx](src/client/features/User/UserProvider.tsx)** - Authentication check
   - `axios.get('/api/auth', { cancelToken, headers })`
   - `axios.CancelToken.source()` for timeout
   - `axios.isCancel(error)` for timeout detection
   - `axios.isAxiosError(error)` for error type checking

2. **[SyncManager.tsx](src/client/features/Sync/SyncManager.tsx)** - Server sync operations
   - Already has a TODO comment: `// TODO: drop axios and just use fetch`
   - `axios.post('/api/sync/begin', { docs })`
   - `axios.post('/api/sync/update', { docs })`
   - `axios.post('/api/sync/request', { docs })`
   - `axios.isAxiosError(e)` for 401 detection

3. **[UserAuthenticationWidget.tsx](src/client/features/User/UserAuthenticationWidget.tsx)** - Login/signup
   - `axios.post('/api/auth', { username, password })`
   - `axios.put('/api/auth', { username, password })`
   - `axios.isAxiosError(error)` for error type checking

4. **[About.tsx](src/client/pages/About.tsx)** - Deployment info
   - `axios.get('./api/deployment')`

### Test Files Mocking Axios (2 total)

1. **[UserProvider.test.tsx](src/client/features/User/UserProvider.test.tsx)** - 7 test cases
2. **[App.test.tsx](src/client/App.test.tsx)** - 8 test cases

## Axios Features We Use

| Feature | Fetch Equivalent | Notes |
|---------|-----------------|-------|
| `axios.get(url, config)` | `fetch(url, { method: 'GET', ...config })` | Direct mapping |
| `axios.post(url, data)` | `fetch(url, { method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} })` | Must set content-type |
| `axios.put(url, data)` | `fetch(url, { method: 'PUT', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'} })` | Must set content-type |
| `response.data` | `await response.json()` | Async in fetch |
| Auto-throw on 4xx/5xx | Check `response.ok` manually | Semantic difference |
| `axios.CancelToken.source()` | `AbortController` | Modern API |
| `axios.isCancel(error)` | Check for `AbortError` | `error.name === 'AbortError'` |
| `axios.isAxiosError(error)` | Custom error handling | Need our own approach |

## Key Semantic Differences

### 1. Error Handling
**Axios**: Throws on any non-2xx status code
```typescript
try {
  const response = await axios.get('/api/auth');
} catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Handle 401
  }
}
```

**Fetch**: Only throws on network failures, not HTTP errors
```typescript
const response = await fetch('/api/auth');
if (!response.ok) {
  if (response.status === 401) {
    // Handle 401
  }
}
```

### 2. Request Cancellation
**Axios**: Uses CancelToken (deprecated) or AbortController
```typescript
const source = axios.CancelToken.source();
setTimeout(() => source.cancel(), 1000);
await axios.get(url, { cancelToken: source.token });
```

**Fetch**: Uses AbortController
```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 1000);
await fetch(url, { signal: controller.signal });
```

### 3. Response Data Access
**Axios**: `response.data` (sync access)
**Fetch**: `await response.json()` (async)

## Test Mocking Strategy

### Current Approach (Axios mocking)
```typescript
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;
mockedAxios.get.mockResolvedValueOnce({ data: user });
mockedAxios.isAxiosError.mockImplementation((e) => e.isAxiosError);
```

### Recommended Approach: MSW (Mock Service Worker)

**Why MSW?**
- Mocks at the network level, not the library level
- Works with both axios and fetch (test migration can happen before code migration)
- More realistic testing (tests actual request/response cycle)
- Already available in node_modules via @reduxjs/toolkit
- Industry standard for frontend testing

**Alternative: Direct fetch mocking with vitest**
```typescript
vi.stubGlobal('fetch', vi.fn());
```
This is simpler but less realistic. Given that we want to migrate tests first while axios is still in use, MSW is the better choice.

## Implementation Plan

### Phase 1: Migrate Tests to MSW

**Goal**: Tests mock at network level, work with both axios AND fetch

1. Install MSW explicitly (it's a transitive dependency, but we should own it)
   ```bash
   yarn add -D msw
   ```

2. Create MSW handlers in `src/client/test-utils/msw-handlers.ts`:
   ```typescript
   import { http, HttpResponse } from 'msw';

   export const handlers = [
     http.get('/api/auth', ({ request }) => {
       // Return user or 401 based on test setup
     }),
     http.post('/api/auth', async ({ request }) => {
       // Handle login
     }),
     http.put('/api/auth', async ({ request }) => {
       // Handle signup
     }),
     http.post('/api/sync/begin', async ({ request }) => {
       // Handle sync begin
     }),
     // ... etc
   ];
   ```

3. Update test setup in `src/client/test-utils/test-setup.ts`:
   ```typescript
   import { setupServer } from 'msw/node';
   import { handlers } from './msw-handlers';

   export const server = setupServer(...handlers);

   beforeAll(() => server.listen());
   afterEach(() => server.resetHandlers());
   afterAll(() => server.close());
   ```

4. Migrate [UserProvider.test.tsx](src/client/features/User/UserProvider.test.tsx):
   - Remove `vi.mock('axios')` and axios imports
   - Use `server.use()` to override handlers per-test
   - Test the existing axios code passes with MSW mocks

5. Migrate [App.test.tsx](src/client/App.test.tsx):
   - Same approach as above
   - Keep the db mock (that's still needed)

6. **Verify all tests pass** with axios still in the code

### Phase 2: Add Missing Test Coverage

Review each axios usage and ensure adequate test coverage:

1. **UserProvider.tsx** - Well covered (7 tests)
   - ✅ Successful auth
   - ✅ 401 response
   - ✅ Server down (non-401 error)
   - ✅ Network issues
   - ✅ Request timeout (cancel)
   - ✅ No cookie scenarios

2. **SyncManager.tsx** - Currently NO direct tests
   - Need tests for sync begin/update/request flows
   - Need tests for 401 during sync (triggers unauthenticated state)
   - Need tests for sync error handling

3. **UserAuthenticationWidget.tsx** - Currently NO direct tests
   - Need tests for successful login
   - Need tests for successful signup
   - Need tests for 401/403 error display
   - Need tests for other error display

4. **About.tsx** - No critical need
   - Only fetches deployment info in production
   - Low risk, can be covered minimally

### Phase 3: Replace Axios with Fetch

#### 3.1 Create a fetch utility (optional but recommended)

Create `src/client/utils/api.ts`:
```typescript
export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, data);
  }

  return { data, status: response.status, ok: response.ok };
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
```

**Decision point**: We could also just use raw fetch everywhere since our usage is simple. The utility provides:
- Consistent JSON handling
- Error type checking (`isApiError`) similar to `isAxiosError`
- Abort detection (`isAbortError`) similar to `isCancel`

Given the small number of call sites (8 total), either approach works. Raw fetch is simpler but requires more code at each call site.

#### 3.2 Migrate each file

**Order** (simplest to most complex):

1. **About.tsx** - Simplest, single GET, no error handling
   ```typescript
   // Before
   axios.get('./api/deployment').then((response) => { ... response.data ... })

   // After
   fetch('./api/deployment')
     .then((response) => response.json())
     .then((data) => { ... data ... })
   ```

2. **UserAuthenticationWidget.tsx** - POST/PUT with error handling
   ```typescript
   // Before
   const response = await (action === Create ? axios.put : axios.post)('/api/auth', { username, password });
   const user: User = response.data;

   // After
   const response = await fetch('/api/auth', {
     method: action === Create ? 'PUT' : 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username, password }),
   });
   if (!response.ok) {
     if ([401, 403].includes(response.status)) {
       setError('Incorrect credentials');
       return;
     }
     throw new Error(`HTTP ${response.status}`);
   }
   const user: User = await response.json();
   ```

3. **UserProvider.tsx** - GET with timeout and cancel handling
   ```typescript
   // Before
   const source = axios.CancelToken.source();
   setTimeout(() => source.cancel(), 1000);
   const response = await axios.get('/api/auth', {
     cancelToken: source.token,
     headers: { 'Cache-Control': 'no-cache' },
   });
   return response.data;

   // After
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 1000);
   const response = await fetch('/api/auth', {
     signal: controller.signal,
     headers: { 'Cache-Control': 'no-cache' },
   });
   if (!response.ok) {
     if (response.status === 401) {
       return 'auth_error';
     }
     // Other errors - log and return undefined
     debug(`network issues: ${response.status}`);
     return undefined;
   }
   return await response.json();
   ```

4. **SyncManager.tsx** - Multiple POSTs with 401 handling
   ```typescript
   // Before
   const serverState: Requests = await axios
     .post('/api/sync/begin', { docs: stubs })
     .then(({ data }) => data);

   // After
   const response = await fetch('/api/sync/begin', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ docs: stubs }),
   });
   if (!response.ok) {
     if (response.status === 401) {
       dispatch(setUserAsUnauthenticated());
       dispatch(socketDisconnected());
       return;
     }
     throw new Error(`Sync failed: ${response.status}`);
   }
   const serverState: Requests = await response.json();
   ```

#### 3.3 Remove axios

1. Remove all axios imports from the 4 files
2. Remove axios from package.json: `yarn remove axios`
3. Run `yarn check && yarn test` to verify

### Phase 4: Cleanup and Verification

1. Run full test suite: `yarn test`
2. Run type checking: `yarn check`
3. Manual testing:
   - Test login/signup flow
   - Test offline -> online sync
   - Test with server down
   - Test About page in production mode
4. Remove any axios type imports that might remain

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Subtle behavior differences | MSW tests will catch these since they test network behavior |
| Missing error cases | Phase 2 adds test coverage before migration |
| Timeout handling differences | AbortController is the modern standard, well-supported |
| Cookie handling | fetch handles cookies by default (same-origin), no change needed |

## Estimated Scope

- **4 files** to modify
- **2 test files** to migrate to MSW
- **~2-3 new test files** for SyncManager and UserAuthenticationWidget
- **1 utility file** (optional)
- **0 server changes** (axios was client-only)

## Checklist

- [ ] Phase 1: Install MSW and setup test infrastructure
- [ ] Phase 1: Migrate UserProvider.test.tsx to MSW
- [ ] Phase 1: Migrate App.test.tsx to MSW
- [ ] Phase 1: Verify all tests pass with axios still in code
- [ ] Phase 2: Add SyncManager tests
- [ ] Phase 2: Add UserAuthenticationWidget tests
- [ ] Phase 2: Review About.tsx coverage needs
- [ ] Phase 3: Decide on utility vs raw fetch
- [ ] Phase 3: Migrate About.tsx
- [ ] Phase 3: Migrate UserAuthenticationWidget.tsx
- [ ] Phase 3: Migrate UserProvider.tsx
- [ ] Phase 3: Migrate SyncManager.tsx
- [ ] Phase 3: Remove axios dependency
- [ ] Phase 4: Full test suite passes
- [ ] Phase 4: Manual testing complete

import { HttpResponse, http, passthrough } from 'msw';

export const handlers = [
  // Socket.io polling requests - let them pass through (they'll fail silently in tests)
  http.get('/socket.io/*', () => {
    return passthrough();
  }),

  http.get('/api/auth', () => {
    return HttpResponse.json(null, { status: 401 });
  }),

  http.post('/api/auth', () => {
    return HttpResponse.json(null, { status: 401 });
  }),

  http.put('/api/auth', () => {
    return HttpResponse.json(null, { status: 401 });
  }),

  http.post('/api/sync/begin', () => {
    return HttpResponse.json({ server: [], client: [] });
  }),

  http.post('/api/sync/update', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/sync/request', () => {
    return HttpResponse.json([]);
  }),

  http.get('/api/deployment', () => {
    return HttpResponse.json({
      deploy_version: 'test',
      release_version: 'test',
      deploy_commit: 'abc1234',
      users: [],
    });
  }),
];

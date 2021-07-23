export interface User {
  id: number;
  name: string;
}

declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}

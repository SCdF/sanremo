import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/types';

type SyncSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Simple registry to make the socket accessible outside of React components
// This allows middleware to emit socket events without prop drilling
let registeredSocket: SyncSocket | null = null;

export function registerSocket(socket: SyncSocket | null): void {
  registeredSocket = socket;
}

export function getSocket(): SyncSocket | null {
  return registeredSocket;
}

// server/bus.ts — tiny in-process event bus (tickets → WebSocket push).
import { EventEmitter } from 'events';
export const bus = new EventEmitter();

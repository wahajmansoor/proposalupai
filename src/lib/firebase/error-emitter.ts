import { EventEmitter } from 'events';

// A simple, global event emitter to decouple error reporting
// from error handling in the UI.
export const errorEmitter = new EventEmitter();

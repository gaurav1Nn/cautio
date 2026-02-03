// Re-export socket events for convenience
export { SOCKET_EVENTS } from '@/utils/constants';

/**
 * Helper to create typed event handlers
 */
export const createEventHandler = (socket, event, callback) => {
  if (socket) {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }
  return () => {};
};
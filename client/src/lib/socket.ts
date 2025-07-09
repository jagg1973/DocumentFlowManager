import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
    });
    
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket?.id);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

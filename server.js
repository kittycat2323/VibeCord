const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  socket.on('create-room', (data) => {
    const roomCode = data.roomCode;
    socket.join(roomCode);
    
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, []);
    }
    rooms.get(roomCode).push(socket.id);
    
    socket.emit('room-created', { roomCode });
    console.log('Комната создана:', roomCode);
  });

  socket.on('join-room', (data) => {
    const roomCode = data.roomCode;
    const username = data.username;
    
    socket.join(roomCode);
    
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, []);
    }
    rooms.get(roomCode).push(socket.id);
    
    socket.to(roomCode).emit('user-connected', { 
      userId: socket.id,
      username: username 
    });
    
    socket.emit('room-joined', { roomCode });
    console.log('Пользователь присоединился к комнате:', roomCode);
  });

  socket.on('offer', (data) => {
    socket.to(data.roomCode).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomCode).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomCode).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  socket.on('message', (data) => {
    socket.to(data.roomCode).emit('message', {
      username: data.username,
      text: data.text
    });
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
    rooms.forEach((users, roomCode) => {
      const index = users.indexOf(socket.id);
      if (index !== -1) {
        users.splice(index, 1);
        socket.to(roomCode).emit('user-disconnected', { userId: socket.id });
        if (users.length === 0) {
          rooms.delete(roomCode);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`PelmeshCord сервер запущен на порту ${PORT}`);
});

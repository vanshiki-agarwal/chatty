const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // Set max buffer size to 50MB for file transfers
});

// Track active rooms and users
const rooms = new Map(); // Maps room name to set of socket IDs
const userRooms = new Map(); // Maps socketId to room
const userNames = new Map(); // Maps socketId to username

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining a room
  socket.on("join", ({ name, room }) => {
    // Store user name
    userNames.set(socket.id, name);

    // If user was in a previous room, leave it
    const previousRoom = userRooms.get(socket.id);
    if (previousRoom) {
      socket.leave(previousRoom);

      // Remove from previous room's user list
      if (rooms.has(previousRoom)) {
        const roomUsers = rooms.get(previousRoom);
        roomUsers.delete(socket.id);

        // Update user count for previous room
        io.to(previousRoom).emit("userCount", roomUsers.size);

        // Notify others in the room
        socket.to(previousRoom).emit("message", {
          name: "System",
          text: `${name} has left the chat.`,
          isFile: false,
        });
      }
    }

    // Join the new room
    socket.join(room);
    userRooms.set(socket.id, room);

    // Add to room's user list
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(socket.id);

    // Update user count for the new room
    const userCount = rooms.get(room).size;
    io.to(room).emit("userCount", userCount);

    console.log(`${name} joined room ${room} (${userCount} users)`);

    // Notify everyone in the room
    socket.to(room).emit("message", {
      name: "System",
      text: `${name} has joined the chat.`,
      isFile: false,
    });

    // Send welcome message only to the user who joined
    socket.emit("message", {
      name: "System",
      text: `Welcome to the room "${room}!"`,
      isFile: false,
    });
  });

  // Handle text messages
  socket.on("message", ({ name, room, text }) => {
    io.to(room).emit("message", { name, text, isFile: false });
  });

  // Handle file messages
  socket.on(
    "fileMessage",
    ({ name, room, fileName, fileType, fileSize, fileData }) => {
      // Broadcast file data to everyone in the room
      io.to(room).emit("fileMessage", {
        name,
        fileName,
        fileType,
        fileSize,
        fileData,
        isFile: true,
        timestamp: Date.now(),
      });

      // Log file upload (without the actual data)
      console.log(
        `${name} shared file "${fileName}" (${fileType}, ${formatFileSize(
          fileSize
        )}) in room "${room}"`
      );
    }
  );

  // Handle typing status
  socket.on("typing", ({ name, room, isTyping }) => {
    // Broadcast to everyone in the room except the sender
    socket.to(room).emit("userTyping", { name, isTyping });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const room = userRooms.get(socket.id);
    const name = userNames.get(socket.id) || "A user";

    if (room && rooms.has(room)) {
      const roomUsers = rooms.get(room);
      roomUsers.delete(socket.id);

      // Update user count
      io.to(room).emit("userCount", roomUsers.size);

      // Notify others
      socket.to(room).emit("message", {
        name: "System",
        text: `${name} has left the chat.`,
        isFile: false,
      });

      // Let other users know this user stopped typing
      socket.to(room).emit("userTyping", { name, isTyping: false });

      // Remove room if empty
      if (roomUsers.size === 0) {
        rooms.delete(room);
      }
    }

    // Clean up user data
    userRooms.delete(socket.id);
    userNames.delete(socket.id);

    console.log("A user disconnected:", socket.id);
  });
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(1) + " GB";
}

server.listen(4000, () => {
  console.log("Server running on port 4000");
});

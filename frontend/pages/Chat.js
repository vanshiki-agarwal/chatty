import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useRouter } from "next/router";

// Initialize socket connection
const socket = io("http://localhost:4000");

export default function Chat() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [joinedRoom, setJoinedRoom] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Add a ref for the messages container
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    // Listen for incoming messages
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Listen for file messages
    socket.on("fileMessage", (fileMsg) => {
      setMessages((prev) => [...prev, fileMsg]);
    });

    // Listen for typing events
    socket.on("userTyping", ({ name, isTyping }) => {
      setTypingUsers((prevUsers) => {
        if (isTyping) {
          // Add user to typing list if not already there
          if (!prevUsers.includes(name)) {
            return [...prevUsers, name];
          }
        } else {
          // Remove user from typing list
          return prevUsers.filter((user) => user !== name);
        }
        return prevUsers;
      });
    });

    return () => {
      socket.off("message");
      socket.off("fileMessage");
      socket.off("userTyping");
    };
  }, []);

  // Add useEffect for scrolling to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  const joinRoom = () => {
    if (name.trim() && roomId.trim()) {
      setJoinedRoom(roomId);
      setMessages([]); // Clear messages when joining a new room
      socket.emit("join", { name, room: roomId });
    }
  };

  const sendMessage = () => {
    if (message.trim() && joinedRoom) {
      socket.emit("message", { name, room: joinedRoom, text: message });
      setMessage("");

      // Stop typing indicator when message is sent
      handleStopTyping();
    }
  };

  const changeRoom = () => {
    // Reset to room selection view
    setJoinedRoom("");
    setRoomId("");
  };

  const handleTyping = () => {
    // Only emit typing if there's text in the input
    if (message.trim() !== "") {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit("typing", { name, room: joinedRoom, isTyping: true });
      }

      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set a new timeout
      const timeout = setTimeout(handleStopTyping, 2000);
      setTypingTimeout(timeout);
    } else {
      // If input is empty, stop showing typing
      handleStopTyping();
    }
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit("typing", { name, room: joinedRoom, isTyping: false });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  const handleInputChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // If input becomes empty, stop typing immediately
    if (newMessage.trim() === "") {
      handleStopTyping();
    } else {
      handleTyping();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current.click();
  };

  const sendFile = () => {
    if (file && joinedRoom) {
      setIsUploading(true);

      // Create a reader to convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          name,
          room: joinedRoom,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: e.target.result,
        };

        // Emit file data
        socket.emit("fileMessage", fileData);

        // Reset file state
        setFile(null);
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Auto-send file when selected
    if (file) {
      sendFile();
    }
  }, [file]);

  const renderMessage = (msg, index) => {
    // Text message
    if (!msg.isFile) {
      return (
        <div
          key={index}
          className={`p-3 rounded-xl ${
            msg.name === name
              ? "bg-gradient-to-r from-blue-600 to-purple-600 ml-auto max-w-[80%]"
              : msg.name === "System"
              ? "bg-gray-700/50 mx-auto text-center text-sm max-w-[90%] text-gray-300 italic"
              : "bg-white/10 mr-auto max-w-[80%] border border-white/10"
          }`}
        >
          {msg.name !== "System" && msg.name !== name && (
            <div className="font-medium text-sm text-blue-300 mb-1">
              {msg.name.charAt(0).toUpperCase() + msg.name.slice(1)}
            </div>
          )}
          <span className="text-white">
            {msg.text.charAt(0).toUpperCase() +
              msg.text.slice(1).replace(/\n/g, " ")}
          </span>
        </div>
      );
    }

    // File attachment message
    return (
      <div
        key={index}
        className={`p-3 rounded-xl ${
          msg.name === name
            ? "bg-gradient-to-r from-blue-600 to-purple-600 ml-auto max-w-[80%]"
            : "bg-white/10 mr-auto max-w-[80%] border border-white/10"
        }`}
      >
        {msg.name !== name && (
          <div className="font-medium text-sm text-blue-300 mb-1">
            {msg.name}
          </div>
        )}

        <div className="flex items-center space-x-2 mb-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <span className="text-white font-medium">File Attachment</span>
        </div>

        <div className="bg-black/30 p-3 rounded-lg space-y-2">
          <div className="text-sm text-white break-all">{msg.fileName}</div>
          <div className="text-xs text-gray-300">
            {formatFileSize(msg.fileSize)}
          </div>

          {/* Display image previews for image files */}
          {msg.fileType.startsWith("image/") && (
            <div className="mt-2">
              <img
                src={msg.fileData}
                alt={msg.fileName}
                className="max-w-full rounded-lg max-h-48 object-contain bg-black/40"
              />
            </div>
          )}

          <a
            href={msg.fileData}
            download={msg.fileName}
            className="flex items-center justify-center space-x-1 p-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm text-white mt-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download</span>
          </a>
        </div>
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
  };

  if (!joinedRoom) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-800 text-white p-4">
        <div className="p-8 bg-black/30 backdrop-blur-lg rounded-2xl shadow-2xl text-center w-full max-w-md border border-white/10">
          <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Join Chat
          </h1>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-left text-sm mb-2 font-medium text-gray-300">
              Your Name
            </label>
            <input
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Room ID input */}
          <div className="mb-6">
            <label className="block text-left text-sm mb-2 font-medium text-gray-300">
              Room ID
            </label>
            <input
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              type="text"
              placeholder="Enter room ID (new or existing)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <p className="text-xs text-left mt-2 text-purple-400">
              Enter any room ID. A new room will be created if it doesn't exist.
            </p>
          </div>

          {/* Join button */}
          <button
            className="mt-4 w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={joinRoom}
            disabled={!name.trim() || !roomId.trim()}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-800 text-white p-4">
      <div className="p-6 w-full max-w-md bg-black/30 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Room: {joinedRoom}
          </h1>
          <button
            className="p-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-sm border border-white/10"
            onClick={changeRoom}
          >
            Change Room
          </button>
        </div>

        <div className="border border-white/10 rounded-xl mb-4 bg-black/40 shadow-inner">
          {/* Added ref to the messages container div */}
          <div className="p-4 h-80 overflow-y-auto" ref={messagesContainerRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-gray-400 space-y-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, index) => renderMessage(msg, index))}
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Typing indicator - only show when there are users typing */}
          {typingUsers.length > 0 &&
            typingUsers.filter((user) => user !== name).length > 0 && (
              <div className="px-4 py-2 text-xs text-gray-400 border-t border-white/10">
                {typingUsers.filter((user) => user !== name).length === 1 ? (
                  <div className="flex items-center">
                    <span>
                      {typingUsers.filter((user) => user !== name)[0]} is typing
                    </span>
                    <span className="ml-1 flex">
                      <span className="animate-bounce mx-0.5">.</span>
                      <span className="animate-bounce animation-delay-200 mx-0.5">
                        .
                      </span>
                      <span className="animate-bounce animation-delay-400 mx-0.5">
                        .
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span>Multiple people are typing</span>
                    <span className="ml-1 flex">
                      <span className="animate-bounce mx-0.5">.</span>
                      <span className="animate-bounce animation-delay-200 mx-0.5">
                        .
                      </span>
                      <span className="animate-bounce animation-delay-400 mx-0.5">
                        .
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="flex space-x-2">
          <div className="flex-1 flex">
            <input
              className="flex-1 p-3 rounded-l-xl bg-white/5 border-y border-l border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              onBlur={handleStopTyping}
              disabled={isUploading}
            />
            <button
              onClick={handleAttachmentClick}
              className="p-3 bg-white/5 border-y border-r border-white/10 rounded-r-xl text-gray-300 hover:text-white transition-colors"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-t-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
            </button>
          </div>
          <button
            className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all flex items-center justify-center w-12 disabled:opacity-50"
            onClick={sendMessage}
            disabled={!message.trim() || isUploading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

# Realtime Chat Application

This is a full-stack realtime chat application built with **Next.js**, **Express**, and **Socket.IO**. It supports features like room-based messaging, file sharing, and typing indicators. The app is containerized using **Docker** and includes an **NGINX** reverse proxy for production deployment.

## Features

- **Room-based Chat**: Users can join specific chat rooms and communicate with others in real time.
- **File Sharing**: Share files (images, documents, etc.) with other users in the chat.
- **Typing Indicators**: See when other users are typing.
- **Responsive UI**: Built with modern UI/UX principles for a seamless experience.
- **Dockerized Deployment**: Easily deployable using Docker and Docker Compose.

## Project Structure

```
.
├── compose.yml          # Docker Compose configuration
├── frontend/            # Next.js frontend
│   ├── pages/           # React pages
│   ├── styles/          # Global styles
│   ├── Dockerfile.client # Dockerfile for the frontend
│   └── package.json     # Frontend dependencies and scripts
├── server/              # Express backend with Socket.IO
│   ├── server.js        # Main server logic
│   ├── Dockerfile.server # Dockerfile for the backend
│   └── package.json     # Backend dependencies and scripts
├── nginx/               # NGINX reverse proxy configuration
│   └── nginx.conf       # NGINX configuration file
└── .gitignore           # Git ignore file
```

## Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/vanshiki-agarwal/chatty.git
cd chatty
```

### 2. Start the Application

Run the following command to build and start the application using Docker Compose:

```bash
docker-compose up --build
```

This will start the following services:

- **Backend**: Accessible at `http://localhost:4000`
- **Frontend**: Accessible at `http://localhost:3000`
- **NGINX Proxy**: Accessible at `http://localhost`

### 3. Access the Application

Open your browser and navigate to `http://localhost` to use the chat application.

## Development

### Frontend

To run the frontend locally for development:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend

To run the backend locally for development:

```bash
cd server
npm install
npm start
```

The backend will be available at `http://localhost:4000`.

## Environment Variables

You can customize the application by modifying the following environment variables:

- **Frontend**: Update the API endpoint in `frontend/pages/Chat.js` if the backend URL changes.
- **Backend**: Update the CORS configuration in `server/server.js` if needed.

## Deployment

For production deployment, ensure the `compose.yml` file is configured correctly and run:

```bash
docker compose up --build -d
```

This will start the application in detached mode.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Express](https://expressjs.com/)
- [Socket.IO](https://socket.io/)
- [Docker](https://www.docker.com/)
- [NGINX](https://www.nginx.com/)

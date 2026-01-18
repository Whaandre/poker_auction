import WebSocket, { WebSocketServer } from "ws";
import { Player } from "./types";

// ----------------------------
// Server Configuration
// ----------------------------
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server started on ws://localhost:${PORT}`);

// ----------------------------
// Game State
// ----------------------------
let players: Player[] = [];
let playerIdCounter = 1;

// ----------------------------
// Handle Connections
// ----------------------------
wss.on("connection", (ws: WebSocket) => {
  const playerId = `Player${playerIdCounter++}`;
  console.log(`${playerId} connected`);

  // Add player to game state
  const newPlayer: Player = {
    id: playerId,
    money: 1000,
    hiddenCard: null, // will assign later
    ownedCards: [],
    guesses: null,
  };
  players.push(newPlayer);

  // Send welcome message to the player
  ws.send(JSON.stringify({ type: "welcome", playerId }));

  // Broadcast new player joined
  broadcast({ type: "playerJoined", playerId, totalPlayers: players.length });

  // Handle messages from client
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`Received from ${playerId}:`, msg);

      // Example: echo message back to all players
      if (msg.type === "chat") {
        broadcast({ type: "chat", from: playerId, message: msg.message });
      }
    } catch (err) {
      console.error("Invalid message:", data.toString());
    }
  });

  // Handle disconnect
  ws.on("close", () => {
    console.log(`${playerId} disconnected`);
    players = players.filter((p) => p.id !== playerId);
    broadcast({ type: "playerLeft", playerId, totalPlayers: players.length });
  });
});

// ----------------------------
// Broadcast to all connected clients
// ----------------------------
function broadcast(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

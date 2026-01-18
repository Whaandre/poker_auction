import WebSocket, { WebSocketServer } from "ws";

type Player = {
  ws: WebSocket;
  id: string;
};

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

const players: Player[] = [];
let nextId = 1;

wss.on("connection", (ws) => {
  const player: Player = {
    ws,
    id: `Player${nextId++}`,
  };
  players.push(player);

  console.log(`${player.id} connected`);

  // Send welcome message
  ws.send(JSON.stringify({ type: "welcome", playerId: player.id }));

  // Broadcast new player to all others
  players.forEach((p) => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(JSON.stringify({ type: "playerJoined", playerId: player.id, totalPlayers: players.length }));
    }
  });

  ws.on("close", () => {
    console.log(`${player.id} disconnected`);
    // Remove player from list
    const idx = players.indexOf(player);
    if (idx !== -1) players.splice(idx, 1);
  });

  ws.on("message", (data) => {
    console.log(`${player.id} sent: ${data.toString()}`);
  });
});

import express from "express";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { 
  addPlayer, 
  removePlayer, 
  receiveBid, 
  receiveGuess 
} from "./game";
import { Bid, Guess, BidMessage, GuessMessage } from "./types";

const app = express();
const PORT: number = Number(process.env.PORT) || 8080;
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;


console.log("=== NEW SERVER DEPLOYMENT V2 ===");
const clientDistPath = path.join(process.cwd(), "client/dist");
console.log("Express is trying to serve React files from:", clientDistPath);
app.use(express.static(clientDistPath));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// 3. Start the standard HTTP web server
const server = app.listen(port, () => {
  console.log(`HTTP and WebSocket server running on port ${port}`);
});

// 4. Attach your WebSocket server to the SAME port
const wss = new WebSocketServer({ server });

console.log("Server started on port " + PORT);

wss.on("connection", (ws: WebSocket) => {
  let player = null as any;

  ws.on("message", (message: string) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === "join") {
        // Attempt to add player (validates name)
        player = addPlayer(ws, msg.name);
        // If addPlayer returns null, the name was rejected (msg sent inside addPlayer)
        if (!player) {
           return;
        }
      } else if (player) {
        switch (msg.type) {
          case "bid": {
            const bidMsg = msg as BidMessage;
            // Map the client's simple bid objects to the server's Bid type (including player)
            const bids: Bid[] = bidMsg.bids.map((b) => ({
              player: player,
              lotId: b.lotId,
              amount: b.amount,
            }));
            receiveBid(player, bids);
            break;
          }

          case "guess": {
            const guessMsg = msg as GuessMessage;
            // Pass the card string directly, do not convert to Card object
            const guess: Guess = {
              targetPlayerId: guessMsg.targetPlayerId,
              card: guessMsg.card,
            };
            receiveGuess(player, guess);
            break;
          }
        }
      }
    } catch (e) {
      console.error("Error handling message:", e);
    }
  });

  ws.on("close", () => {
    if (player) {
      removePlayer(player);
    }
  });
});
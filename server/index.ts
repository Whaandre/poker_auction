import { WebSocketServer, WebSocket } from "ws";
import { 
  addPlayer, 
  removePlayer, 
  receiveBid, 
  receiveGuess 
} from "./game";
import { Bid, Guess, BidMessage, GuessMessage } from "./types";

const PORT: number = Number(process.env.PORT) || 8080;

const wss = new WebSocketServer({ port: PORT });

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
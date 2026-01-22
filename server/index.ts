import { WebSocketServer } from "ws";
import { addPlayer, removePlayer, receiveBid, receiveGuess } from "./game";
import { Bid, Card, BidMessage, GuessMessage, Player } from "./types";

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

function stringToCard(cardStr: string): Card {
  const suit = cardStr.charAt(0) as "H" | "D" | "C" | "S";
  const rank = parseInt(cardStr.slice(1));
  return { suit, rank };
}

wss.on("connection", (ws) => {
  let player: Player | null = null;

  ws.on("message", (data) => {
    const parsed = JSON.parse(data.toString());

    // First message must be join
    if (!player && parsed.type === "join") {
      player = addPlayer(ws, parsed.name);
      return;
    }
    
    if (!player) return;

    if (player.waitingFor === "bid" && parsed.type === "bid") {
      const bidMessage = parsed as BidMessage;
      const bid: Bid[] = bidMessage.bids.map(
        (item) => {
          const [lotId, amount] = item as [number, number];
          return {
            player: player as Player,
            lotId,
            amount
          };
        }
      );

      receiveBid(player, bid);
    }

    if (player.waitingFor === "guess" && parsed.type === "guess") {
      const guessMessage = parsed as GuessMessage;
      receiveGuess(player, {
        targetPlayerId: guessMessage.targetPlayerId,
        card: stringToCard(guessMessage.card)
      });
    }
  });

  ws.on("close", () => {
    if (player) removePlayer(player);
  });
});
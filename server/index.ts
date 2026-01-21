import { WebSocketServer } from "ws";
import { addPlayer, removePlayer, receiveBid, receiveGuess } from "./game";
import { Bid, Card, Guess, BidMessage, GuessMessage } from "./types";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

function ask(question: string): Promise<string> {
  return new Promise((resolve) => 
    rl.question(question, resolve));
}

function stringToCard(cardStr: string): Card {
  const suit = cardStr.charAt(0) as "H" | "D" | "C" | "S";
  const rank = parseInt(cardStr.slice(1));
  return { suit, rank };
}

wss.on("connection", async (ws) => {
  const name = await ask("Enter your name: ");
  const player = addPlayer(ws, name);

  ws.on("close", () => {
    console.log(`${player.id} disconnected`);
    removePlayer(player);
  });

  ws.on("message", (data) => {
    // // testing only
    // const parsed = JSON.parse(JSON.parse(data.toString()).message);

    const parsed = JSON.parse(data.toString());
    console.log(`Parsed message: ${JSON.stringify(parsed)}`);
    if (player.waitingFor === "bid" && parsed.type === "bid") {
      const bidMessage = parsed as BidMessage;
      const bid: Bid[] = [];
      bidMessage.bids.forEach((b: number[]) => {
        bid.push({ player: player, lotId: b[0]!, amount: b[1]! });
      });
      receiveBid(player, bid);
    } else if (player.waitingFor === "guess" && parsed.type === "guess") {
      const guessMessage = parsed as GuessMessage;
      const guess: Guess = {
        targetPlayerId: guessMessage.targetPlayerId,
        card: stringToCard(guessMessage.card)
      };
      receiveGuess(player, guess);
    } else {
      console.log(`${player.id} sent: ${data.toString()}`);
    }
  });
});

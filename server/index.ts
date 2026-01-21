import { WebSocketServer } from "ws";
import { addPlayer, removePlayer, receiveBid, receiveGuess } from "./game";
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

wss.on("connection", async (ws) => {
  const name = await ask("Enter your name: ");
  const player = addPlayer(ws, name);

  ws.on("close", () => {
    console.log(`${player.id} disconnected`);
    removePlayer(player);
  });

  ws.on("message", (data) => {
    if (player.waitingFor === "bid") {
      receiveBid(player, JSON.parse(data.toString()));
    } else if (player.waitingFor === "guess") {
      receiveGuess(player, JSON.parse(data.toString()));
    } else {
      console.log(`${player.id} sent: ${data.toString()}`);
    }
  });
});

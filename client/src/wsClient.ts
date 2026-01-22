import type { ServerMessage, BidMessage, GuessMessage } from "../../server/types";

// Prompt for player name
const name = prompt("Enter your name")!;

// Connect to WS server
const socket = new WebSocket("ws://localhost:8080");

// Send join message once connected
socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "join", name }));
});

// DOM elements
const messagesDiv = document.getElementById("messages")!;
const input = document.getElementById("msgInput") as HTMLInputElement;
const sendBtn = document.getElementById("sendBtn")!;

// Example DOM elements
const bidInputs = document.querySelectorAll<HTMLInputElement>(".bidInput"); // one input per lot
const bidBtn = document.getElementById("bidBtn")!;
const guessTargetInput = document.getElementById("guessTarget") as HTMLInputElement;
const guessCardInput = document.getElementById("guessCard") as HTMLInputElement;
const guessBtn = document.getElementById("guessBtn")!;

// ----- Send Bids -----
bidBtn.addEventListener("click", () => {
  const bids: [number, number][] = [];

  // Loop over bid inputs and collect lotId & amount
  bidInputs.forEach((input) => {
    const lotId = Number(input.dataset.lotid); // assume each input has data-lotid
    const amount = Number(input.value);
    if (!isNaN(lotId) && !isNaN(amount) && amount > 0) {
      bids.push([lotId, amount]);
    }
  });

  if (bids.length === 0) return;

  const bidMessage: BidMessage = {
    type: "bid",
    bids
  };

  socket.send(JSON.stringify(bidMessage));
  addMessage(`You placed bids: ${bids.map(b => `Lot ${b[0]} -> $${b[1]}`).join(", ")}`);
});

// ----- Send Guess -----
guessBtn.addEventListener("click", () => {
  const targetPlayerId = guessTargetInput.value.trim();
  const card = guessCardInput.value.trim(); // e.g. "H14"

  if (!targetPlayerId || !card) return;

  const guessMessage: GuessMessage = {
    type: "guess",
    targetPlayerId,
    card
  };

  socket.send(JSON.stringify(guessMessage));
  addMessage(`You guessed ${card} for ${targetPlayerId}`);
});

// Add a message to the screen
function addMessage(msg: string) {
  const p = document.createElement("p");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Handle incoming messages
socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data) as ServerMessage;
  handleServerMessage(msg);
});

// Handle connection
socket.addEventListener("open", () => addMessage("Connected to server!"));
socket.addEventListener("close", () => addMessage("Disconnected from server."));

// ---- Message handling using discriminated union ----
function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "gameStart":
      addMessage(`Game started! Your hidden card: ${msg.hiddenCard.suit}${msg.hiddenCard.rank}`);
      break;

    case "startAuction":
      addMessage(`Auction round ${msg.round} started! Lots: ${msg.lotIds.join(", ")} | Money Left: ${msg.money}`);
      break;

    case "auctionResult":
      msg.results.forEach(r => addMessage(`Lot ${r.lotId} won by ${r.winnerId} for ${r.pricePaid}`));
      break;

    case "startGuessing":
      addMessage(`Guess phase started. Cards per player: ${msg.cardsPerPlayer}`); // Format better
      break;

    case "gameOver":
      msg.scores.forEach(s => addMessage(`${s.playerId} total score: ${s.total}`));
      break;

    case "playerJoined":
      addMessage(`${msg.playerId} joined. Total players: ${msg.totalPlayers}`);
      break;

    case "playerLeft":
      addMessage(`${msg.playerId} left. Total players: ${msg.totalPlayers}`);
      break;

    default:
      const _exhaustiveCheck: never = msg; // TS ensures all types handled
      console.error("Unknown message type", _exhaustiveCheck);
  }
}

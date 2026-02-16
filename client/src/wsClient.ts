import type {
  ServerMessage,
  BidMessage,
  GuessMessage,
  StartAuctionMessage,
  StartGuessingMessage,
  Lot,
  Player,
  Card,
} from "../../server/types";

let myName = prompt("Enter your name") || "";
const socket = new WebSocket("ws://localhost:8080");

// Store players locally to populate dropdowns later
let knownPlayers: Player[] = [];

// DOM
const messages = document.getElementById("messages")!;
const auctionBox = document.getElementById("auctionBox")!;
const guessBox = document.getElementById("guessBox")!;
const lotsDiv = document.getElementById("lots")!;
const moneyDiv = document.getElementById("money")!;
const bidBtn = document.getElementById("bidBtn")!;

// FIX: Cast to HTMLButtonElement to access 'disabled' property
const guessBtn = document.getElementById("guessBtn") as HTMLButtonElement; 

const guessTarget = document.getElementById("guessTarget") as HTMLSelectElement;
const guessRank = document.getElementById("guessRank") as HTMLSelectElement;
const guessSuit = document.getElementById("guessSuit") as HTMLSelectElement;
const guessInfo = document.getElementById("guessInfo")!;

// Utilities
function log(msg: string) {
  const p = document.createElement("p");
  p.textContent = msg;
  messages.appendChild(p);
  messages.scrollTop = messages.scrollHeight;
}

function sendJoin() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "join", name: myName }));
  }
}

socket.addEventListener("open", () => {
  log("Connected to server");
  sendJoin();
});

socket.addEventListener("close", () => {
  log("Disconnected from server");
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data) as ServerMessage;
  handleServerMessage(msg);
});

// ---- Server message handler ----
function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "joinRejected":
      alert(msg.message);
      myName = prompt("Enter your name") || "";
      sendJoin();
      break;

    case "playerJoined":
      log(`${msg.playerId} joined (${msg.totalPlayers} players)`);
      break;

    case "playerLeft":
      log(`${msg.playerId} left`);
      break;

    case "gameStart":
      log(`Game started!`);
      renderPlayers(msg.players);
      renderLots(msg.lots);
      break;
      
    case "startAuction":
      renderAuction(msg);
      break;

    case "auctionResult":
      msg.results.forEach(r =>
        log(`Lot ${r.lotId} won by ${r.winnerId} for $${r.pricePaid}`)
      );
      renderPlayers(msg.players);
      break;

    case "startGuessing":
      renderGuessing(msg);
      break;

    case "gameOver":
      log("Game Over");
      msg.scores.forEach(s =>
        log(`${s.playerId}: ${s.total}`)
      );
      break;

    case "bidAccepted":
      log("Bid Accepted - Waiting for others...")
      auctionBox.style.display = "none";
      break;

    case "bidRejected":
      log(`Error: ${msg.message}`)
      break;
  }
}

// ---------------- Card Rendering Helpers ----------------
function formatRank(rank: number) {
  if (rank === 14 || rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function formatSuit(suit: string) {
  switch (suit) {
    case "H": return { symbol: "♥", color: "red" };
    case "D": return { symbol: "♦", color: "red" };
    case "S": return { symbol: "♠", color: "black" };
    case "C": return { symbol: "♣", color: "black" };
    default: return { symbol: "?", color: "black" };
  }
}

function createCardElement(card: Card) {
  const { symbol, color } = formatSuit(card.suit);
  const rank = formatRank(card.rank);

  const div = document.createElement("div");
  div.className = "card";
  div.style.color = color;
  div.innerHTML = `
    <div class="card-rank">${rank}</div>
    <div class="card-suit">${symbol}</div>
  `;
  return div;
}

function createUnknownCard() {
  const div = document.createElement("div");
  div.className = "card unknown";
  div.innerHTML = `
    <div class="card-rank">?</div>
    <div class="card-suit"></div>
  `;
  return div;
}

function renderCards(cards: Card[]) {
  const container = document.createElement("div");
  container.className = "cards";
  container.style.display = "inline-block";
  cards.forEach(c => container.appendChild(createCardElement(c)));
  return container;
}

function renderLots(lots: Lot[]) {
  const lotsDiv = document.getElementById("lots")!;
  lotsDiv.innerHTML = "";
  lots.forEach(lot => {
    const div = document.createElement("div");
    div.className = "lot";
    div.style.marginBottom = "10px";
    div.innerHTML = `<strong>Lot ${lot.id}</strong> `;
    div.appendChild(renderCards(lot.cards));
    lotsDiv.appendChild(div);
  });
}

function renderPlayers(players: Player[]) {
  // Update local state
  knownPlayers = players;

  const playersDiv = document.getElementById("players")!;
  playersDiv.innerHTML = "";
  
  players.forEach(player => {
    const div = document.createElement("div");
    div.className = "player";
    
    // Header
    const header = document.createElement("div");
    header.innerHTML = `<strong>${player.id}</strong> — $${player.money}`;
    div.appendChild(header);

    // Hidden Card Section
    const hiddenRow = document.createElement("div");
    hiddenRow.style.margin = "5px 0";
    const label = document.createElement("span");
    label.textContent = "Hidden: ";
    label.style.fontSize = "0.9em";
    hiddenRow.appendChild(label);

    if (player.id === myName && player.hiddenCard) {
      hiddenRow.appendChild(createCardElement(player.hiddenCard));
    } else {
      hiddenRow.appendChild(createUnknownCard());
    }
    div.appendChild(hiddenRow);

    // Earned Cards Section
    const earnedRow = document.createElement("div");
    const earnedLabel = document.createElement("span");
    earnedLabel.textContent = "Earned: ";
    earnedLabel.style.fontSize = "0.9em";
    earnedRow.appendChild(earnedLabel);
    earnedRow.appendChild(renderCards(player.earnedCards));
    
    div.appendChild(earnedRow);
    playersDiv.appendChild(div);
  });
}

// ---- Auction UI ----
function renderAuction(msg: StartAuctionMessage) {
  auctionBox.style.display = "block";
  guessBox.style.display = "none";
  lotsDiv.innerHTML = "";
  moneyDiv.textContent = `Money: $${msg.money}`;

  msg.lotIds.forEach(lotId => {
    const div = document.createElement("div");
    div.style.margin = "8px 0";
    div.innerHTML = `
      <label style="display:inline-block; width: 60px;">Lot ${lotId}:</label>
      <input data-lotid="${lotId}" type="number" placeholder="Bid (0)" style="width: 80px;" />
    `;
    lotsDiv.appendChild(div);
  });
}

bidBtn.onclick = () => {
  const bids: { lotId: number; amount: number }[] = [];
  
  lotsDiv.querySelectorAll("input").forEach(input => {
    const lotId = Number((input as HTMLInputElement).dataset.lotid);
    const val = (input as HTMLInputElement).value;
    const amount = val === "" ? 0 : Number(val);
    bids.push({ lotId, amount });
  });

  const msg: BidMessage = { type: "bid", bids: bids as any };
  socket.send(JSON.stringify(msg));
  log("Bids submitted");
};

// ---- Guessing UI ----
function renderGuessing(msg: StartGuessingMessage) {
  guessBox.style.display = "block";
  auctionBox.style.display = "none";
  
  guessInfo.innerHTML = "<h4>Guessing Phase Started</h4><p>Identify the hidden cards!</p>";

  // Populate Target Dropdown (Excluding self)
  guessTarget.innerHTML = "";
  knownPlayers.forEach(p => {
    if (p.id !== myName) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.id;
      guessTarget.appendChild(option);
    }
  });
  
  // Logic to disable buttons if no opponents is removed. 
  // We assume there are always valid targets.
  guessTarget.disabled = false;
  guessBtn.disabled = false;
}

guessBtn.onclick = () => {
  const target = guessTarget.value;
  const rank = guessRank.value;
  const suit = guessSuit.value;

  if (!target) {
    log("Please select a player to guess.");
    return;
  }

  // Construct card string, e.g., "H14", "D2", "S11"
  const cardString = suit + rank;

  const msg: GuessMessage = {
    type: "guess",
    targetPlayerId: target,
    card: cardString
  };

  socket.send(JSON.stringify(msg));
  log(`Guessed ${formatRank(Number(rank))} of ${formatSuit(suit).symbol} for ${target}`);
  guessBox.style.display = "none";
};
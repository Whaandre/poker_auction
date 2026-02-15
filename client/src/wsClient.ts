import type {
  ServerMessage,
  BidMessage,
  GuessMessage,
  StartAuctionMessage,
  StartGuessingMessage,
  Lot,
  Player,
} from "../../server/types";

const name = prompt("Enter your name")!;
const socket = new WebSocket("ws://localhost:8080");

// DOM
const messages = document.getElementById("messages")!;
const auctionBox = document.getElementById("auctionBox")!;
const guessBox = document.getElementById("guessBox")!;
const lotsDiv = document.getElementById("lots")!;
const moneyDiv = document.getElementById("money")!;
const bidBtn = document.getElementById("bidBtn")!;
const guessBtn = document.getElementById("guessBtn")!;
const guessTarget = document.getElementById("guessTarget") as HTMLInputElement;
const guessCard = document.getElementById("guessCard") as HTMLInputElement;
const guessInfo = document.getElementById("guessInfo")!;

// Utilities
function log(msg: string) {
  const p = document.createElement("p");
  p.textContent = msg;
  messages.appendChild(p);
}

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "join", name }));
  log("Connected to server");
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
    case "playerJoined":
      log(`${msg.playerId} joined (${msg.totalPlayers} players)`);
      break;

    case "playerLeft":
      log(`${msg.playerId} left`);
      break;

    case "gameStart":
      log(`Game started! Hidden card: ${msg.hiddenCard.suit}${msg.hiddenCard.rank}`);
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
      log("Bid Accepted")
      auctionBox.style.display = "none";
      break;

    case "bidRejected":
      log(msg.message)
      break;
  }
}

// ---------------- Card Rendering Helpers ----------------
function formatRank(rank: number) {
  if (rank === 1) return "A";
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

function createCardElement(card: { suit: string; rank: number }) {
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

function renderCards(cards: { suit: string; rank: number }[]) {
  const container = document.createElement("div");
  container.className = "cards";
  cards.forEach(c => container.appendChild(createCardElement(c)));
  return container;
}

function renderLots(lots: Lot[]) {
  const lotsDiv = document.getElementById("lots")!;
  lotsDiv.innerHTML = "";
  lots.forEach(lot => {
    const div = document.createElement("div");
    div.className = "lot";
    const title = document.createElement("h4");
    title.textContent = `Lot ${lot.id}`;
    div.appendChild(title);
    div.appendChild(renderCards(lot.cards));
    lotsDiv.appendChild(div);
  });
}

function renderPlayers(players: Player[]) {
  const playersDiv = document.getElementById("players")!;
  playersDiv.innerHTML = "";
  players.forEach(player => {
    const div = document.createElement("div");
    div.className = "player";
    const header = document.createElement("div");
    header.innerHTML = `<strong>${player.id}</strong> — $${player.money}`;
    div.appendChild(header);
    div.appendChild(renderCards(player.earnedCards));
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
    div.innerHTML = `
      Lot ${lotId}:
      <input data-lotid="${lotId}" type="number" placeholder="Bid amount" />
    `;
    lotsDiv.appendChild(div);
  });
}

bidBtn.onclick = () => {
  const bids: [number, number][] = [];
  lotsDiv.querySelectorAll("input").forEach(input => {
    const lotId = Number((input as HTMLInputElement).dataset.lotid);
    const amount = Number((input as HTMLInputElement).value);
    bids.push([lotId, amount]);
  });

  if (bids.length === 0) return;

  const msg: BidMessage = { type: "bid", bids };
  socket.send(JSON.stringify(msg));
  log("Bids submitted");
};

// ---- Guessing UI ----
function renderGuessing(msg: StartGuessingMessage) {
  guessBox.style.display = "block";
  auctionBox.style.display = "none";

  guessInfo.innerHTML = "";
  msg.cardsPerPlayer.forEach(([id, cards]) => {
    const p = document.createElement("p");
    p.textContent = `${id}: ${cards.join(", ")}`;
    guessInfo.appendChild(p);
  });
}

guessBtn.onclick = () => {
  const target = guessTarget.value.trim();
  const card = guessCard.value.trim();
  if (!target || !card) return;

  const msg: GuessMessage = {
    type: "guess",
    targetPlayerId: target,
    card
  };

  socket.send(JSON.stringify(msg));
  log(`Guessed ${card} for ${target}`);
  guessBox.style.display = "none";
};

import type {
  ServerMessage,
  BidMessage,
  GuessMessage,
  StartAuctionMessage,
  StartGuessingMessage,
  GameOverMessage,
  Lot,
  Player,
  Card,
  ScoreDetail
} from "../../server/types";

let myName = prompt("Enter your name") || "";
const socket = new WebSocket("ws://localhost:8080");

let knownPlayers: Player[] = [];

// DOM
const messages = document.getElementById("messages")!;
const auctionBox = document.getElementById("auctionBox")!;
const guessBox = document.getElementById("guessBox")!;
const lotsDiv = document.getElementById("lots")!;
const moneyDiv = document.getElementById("money")!;
const bidBtn = document.getElementById("bidBtn")!;
// Fix: Cast to correct types
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

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data) as ServerMessage;
  handleServerMessage(msg);
});

function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "joinRejected":
      alert(msg.message);
      myName = prompt("Enter your name") || "";
      sendJoin();
      break;
    case "playerJoined":
      log(`${msg.playerId} joined (${msg.totalPlayers})`);
      break;
    case "gameStart":
      log(`Game started!`);
      // Hide game over UI if present, reset view
      guessBox.style.display = "none"; 
      bidBtn.style.display = "inline-block";
      renderPlayers(msg.players);
      renderLots(msg.lots);
      break;
    case "startAuction":
      renderAuction(msg);
      break;
    case "auctionResult":
      msg.results.forEach(r => log(`Lot ${r.lotId} won by ${r.winnerId} ($${r.pricePaid})`));
      renderPlayers(msg.players);
      break;
    case "startGuessing":
      renderGuessing(msg);
      break;
    case "gameOver":
      log("Game Over! Scores calculated.");
      renderGameOver(msg);
      break;
    case "bidAccepted":
      log("Bid Accepted");
      auctionBox.style.display = "none";
      break;
    case "bidRejected":
      log(`Error: ${msg.message}`);
      break;
  }
}

// ---- Rendering ----

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

function createCardElement(card: Card, highlight = false) {
  const { symbol, color } = formatSuit(card.suit);
  const div = document.createElement("div");
  div.className = "card";
  div.style.color = color;
  
  if (highlight) {
    div.style.border = "2px solid gold";
    div.style.backgroundColor = "#fffbe6";
    div.style.boxShadow = "0 0 5px gold";
    div.style.transform = "scale(1.1)";
    div.style.zIndex = "1";
    div.style.position = "relative";
  }

  div.innerHTML = `<div class="card-rank">${formatRank(card.rank)}</div><div class="card-suit">${symbol}</div>`;
  return div;
}

function createUnknownCard() {
  const div = document.createElement("div");
  div.className = "card unknown";
  div.innerHTML = `<div class="card-rank">?</div><div class="card-suit"></div>`;
  return div;
}

function renderPlayers(players: Player[]) {
  knownPlayers = players;
  const playersDiv = document.getElementById("players")!;
  playersDiv.innerHTML = "";
  
  players.forEach(player => {
    const div = document.createElement("div");
    div.className = "player";
    div.innerHTML = `<strong>${player.id}</strong> — $${player.money}`;
    
    // Hidden
    const hiddenRow = document.createElement("div");
    hiddenRow.style.margin = "5px 0";
    hiddenRow.innerHTML = `<span style="font-size:0.9em">Hidden: </span>`;
    if (player.id === myName && player.hiddenCard) {
      hiddenRow.appendChild(createCardElement(player.hiddenCard));
    } else {
      hiddenRow.appendChild(createUnknownCard());
    }
    div.appendChild(hiddenRow);

    // Earned
    const earnedRow = document.createElement("div");
    earnedRow.innerHTML = `<span style="font-size:0.9em">Earned: </span>`;
    player.earnedCards.forEach(c => earnedRow.appendChild(createCardElement(c)));
    div.appendChild(earnedRow);
    
    playersDiv.appendChild(div);
  });
}

function renderLots(lots: Lot[]) {
  lotsDiv.innerHTML = "";
  lots.forEach(lot => {
    const div = document.createElement("div");
    div.className = "lot";
    div.style.marginBottom = "10px";
    div.innerHTML = `<strong>Lot ${lot.id}</strong> `;
    lot.cards.forEach(c => div.appendChild(createCardElement(c)));
    lotsDiv.appendChild(div);
  });
}

// ---- Game Over UI ----

function renderGameOver(msg: GameOverMessage) {
  // Use the auction box to show results
  auctionBox.style.display = "block";
  guessBox.style.display = "none";
  lotsDiv.innerHTML = "";
  moneyDiv.innerHTML = "<h2 style='color: #d32f2f'>Final Scores</h2>";
  bidBtn.style.display = "none"; // Hide bid button

  msg.scores.forEach((score, idx) => {
    const div = document.createElement("div");
    div.className = "box";
    div.style.borderLeft = idx === 0 ? "5px solid gold" : "1px solid #ddd";
    
    const isWinner = idx === 0 ? "👑 " : "";
    
    div.innerHTML = `
      <h3>${isWinner}#${idx + 1} ${score.playerId}</h3>
      <p><strong>Total Score: ${Math.floor(score.totalScore)}</strong></p>
      <ul style="font-size: 0.9em; margin-bottom: 10px;">
        <li>Hand Rank: ${score.handRankName} (${score.rank}th place prize: ${score.prizeScore})</li>
        <li>Guess Bonus: ${score.guessScore}</li>
        <li>Leftover Money: ${score.moneyScore}</li>
      </ul>
      <div style="font-size: 0.9em; font-weight: bold;">Best 5-Card Hand:</div>
    `;

    // Render Best Hand
    const cardContainer = document.createElement("div");
    cardContainer.style.marginTop = "5px";
    
    score.bestHand.forEach(card => {
        cardContainer.appendChild(createCardElement(card, true)); // Highlighted
    });

    // Show the hidden card separately if not already clear
    const hiddenLabel = document.createElement("div");
    hiddenLabel.style.marginTop = "10px";
    hiddenLabel.style.fontSize = "0.9em";
    hiddenLabel.innerHTML = "<strong>Hidden Card Revealed:</strong> ";
    hiddenLabel.appendChild(createCardElement(score.hiddenCard));

    div.appendChild(cardContainer);
    div.appendChild(hiddenLabel);
    lotsDiv.appendChild(div);
  });
}

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

function renderGuessing(msg: StartGuessingMessage) {
  guessBox.style.display = "block";
  auctionBox.style.display = "none";
  
  guessInfo.innerHTML = "<h4>Guessing Phase</h4><p>Identify hidden cards!</p>";
  guessTarget.innerHTML = "";
  knownPlayers.forEach(p => {
    if (p.id !== myName) {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.id;
      guessTarget.appendChild(option);
    }
  });
  guessTarget.disabled = false;
  guessBtn.disabled = false;
}

guessBtn.onclick = () => {
  const target = guessTarget.value;
  const rank = guessRank.value;
  const suit = guessSuit.value;
  if (!target) return;

  const msg: GuessMessage = { type: "guess", targetPlayerId: target, card: suit + rank };
  socket.send(JSON.stringify(msg));
  log(`Guessed ${target}`);
  guessBox.style.display = "none";
};
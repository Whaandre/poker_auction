import type {
  ServerMessage,
  BidMessage,
  GuessMessage,
  StartAuctionMessage,
  StartGuessingMessage,
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
      break;

    case "startAuction":
      renderAuction(msg);
      break;

    case "auctionResult":
      msg.results.forEach(r =>
        log(`Lot ${r.lotId} won by ${r.winnerId} for $${r.pricePaid}`)
      );
      auctionBox.style.display = "none";
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

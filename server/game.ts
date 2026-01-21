import { Player, Card, Lot, Bid, Guess, GameState } from "./types"
import { WebSocket } from "ws";

const gameState: GameState = {
    players: [],
    lots: [],
    currentRound: 0,
    bids: []
};
const rounds: number[][] = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13]];

function startGame() {
    generateLots();

    gameState.lots.forEach((lot) => {
        console.log(`Lot ${lot.id}: ${lot.cards.map(displayCard).join(", ")}`);
    });

    gameState.players.forEach((p) => {
        p.ownedCards = [];
        p.hiddenCard = randomCard();
        p.ownedCards.push(p.hiddenCard);
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(`GameStart!\nYour Hidden Card is ${displayCard(p.hiddenCard)}.\n Your Cards: ${p.ownedCards.map(displayCard).join(", ") }`);
        }
    });

    startAuction();
}

function startAuction() {
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(`Enter Your Bid for Lots${rounds[gameState.currentRound]!.join(", ")}: `);
        }
        p.waitingFor = "bid";
    });
}

function endAuction() {
    console.log(`Ending Auction for Round ${gameState.currentRound + 1}`);
    // distruibute cards
    gameState.currentRound += 1;
    if (gameState.currentRound >= rounds.length) {
        startGuessing();
    } else {
        startAuction();
    }
}

function startGuessing() {
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(`Enter Your Guess for Other Players' Hidden Cards: `);
        }
        p.waitingFor = "guess";
    });
}

function endGame(){
    // Reveal guesses and calculate scores
}

export function receiveBid(player: Player, bid: Bid[]) {
    console.log(`Received bid from ${player.id}: ${bid.join(", ")}`);
    if (player.waitingFor == "bid") {
        player.waitingFor = null;
        bid.forEach((b) => {
            gameState.lots[b.lotId]?.bids.push(b);
        });
    }
    const biddingDone = gameState.players.every((p) => p.waitingFor === null);
    if (biddingDone) {
        endAuction();
    }
}

export function receiveGuess(player: Player, guess: Guess) {
    console.log(`Received guess from ${player.id}: ${guess}`);
    if (player.waitingFor == "guess") {
        player.waitingFor = null;
        player.guess = guess;
    }
    const guessingDone = gameState.players.every((p) => p.waitingFor === null);
    if (guessingDone) {
        endGame();
    }
}

export function addPlayer(ws: WebSocket, name: string): Player {
    const player: Player = {
        ws: ws,
        id: name,
        money: 1000,
        hiddenCard: null,
        ownedCards: [],
        guess: null,
        waitingFor: null
    }
    gameState.players.push(player);

    console.log(`${player.id} connected`);

    // Broadcast
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({ type: "playerJoined", playerId: player.id, totalPlayers: gameState.players.length }));
        }
    });

    return player;
}

export function removePlayer(player: Player) {
    const idx = gameState.players.indexOf(player);
    if (idx !== -1) gameState.players.splice(idx, 1);
    // Broadcast
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({ type: "playerLeft", playerId: player.id, totalPlayers: gameState.players.length }));
        }
    });
}

function displayCard(card: Card): string {
    const rankStr = card.rank > 10 ? ["J", "Q", "K", "A"][card.rank - 11] : card.rank.toString();
    return `${rankStr}${["♥", "♦", "♣", "♠"][["H", "D", "C", "S"].indexOf(card.suit)]}`;
}

function randomCard(): Card {
    const suit = ["H", "D", "C", "S"][Math.floor(Math.random() * 4)] as "H" | "D" | "C" | "S";
    const rank = Math.floor(Math.random() * 13) + 2;
    return { suit, rank };
}

function generateLots() {
    const deck: Card[] = [];
    for (const suit of ["H", "D", "C", "S"] as ("H" | "D" | "C" | "S")[]) {
        for (let rank = 2; rank <= 14; rank++) {
            deck.push({ suit, rank });
        }
    }
    deck.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 13; i++) {
        gameState.lots[i] = { id: i + 1, cards:[deck[i * 4]!, deck[i * 4 + 1]!, deck[i * 4 + 2]!, deck[i * 4 + 3]!], bids: [] };
    }
}
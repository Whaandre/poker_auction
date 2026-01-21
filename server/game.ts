import { start } from "repl";
import { Player, Card, Lot, Bid, Guess, GameState } from "./types"
import { WebSocket } from "ws";

const gameState: GameState = {
    players: [],
    lots: [],
    currentRound: 0,
};
const rounds: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12]];

function startGame() {
    console.log("Starting Game...");
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
    console.log(`Starting Auction for Round ${gameState.currentRound + 1}`);
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ type: "startAuction", lots: rounds[gameState.currentRound], money: p.money }));
        }
        p.waitingFor = "bid";
    });
}

function endAuction() {
    console.log(`Ending Auction for Round ${gameState.currentRound + 1}`);
    rounds[gameState.currentRound]!.forEach((id) => {
        const lot = gameState.lots[id]!
        let highestBid: Bid[] = [];
        let secondHighestBid: number = 0;
        lot.bids.forEach((bid) => {
            if (highestBid.length === 0) {
                highestBid = [bid];            
            } else if (bid.amount > highestBid[0]!.amount) {
                secondHighestBid = highestBid[0]!.amount;
                highestBid = [bid];
            } else if (highestBid.length > 0 && bid.amount === highestBid[0]!.amount) {
                secondHighestBid = highestBid[0]!.amount;
                highestBid.push(bid);
            } else if (secondHighestBid < bid.amount) {
                secondHighestBid = bid.amount;
            }
        });
        console.log(`Lot ${id} highest bids: ${highestBid.map(b => `${b.player.id}(${b.amount})`).join(", ")}`);
        const winner = highestBid[Math.floor(Math.random() * highestBid.length)]!;
        console.log(`Lot ${id} won by ${winner.player.id} for ${secondHighestBid}`);
        winner.player.money -= secondHighestBid;
        winner.player.ownedCards.push(...lot.cards);
    });
    gameState.currentRound += 1;
    if (gameState.currentRound >= rounds.length) {
        startGuessing();
    } else {
        startAuction();
    }
}

function startGuessing() {
    console.log("Starting Guessing Phase");
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(`Enter Your Guess for Other Player's Hidden Card: `);
        }
        p.waitingFor = "guess";
    });
}

function endGame(){
    console.log("Calulating Scores...");
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

    if (gameState.players.length >= 2)
        startGame();

    return player;
}

export function removePlayer(player: Player) {
    console.log(`${player.id} disconnected`);
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
    console.log("Generating Lots...");
    const deck: Card[] = [];
    for (const suit of ["H", "D", "C", "S"] as ("H" | "D" | "C" | "S")[]) {
        for (let rank = 2; rank <= 14; rank++) {
            deck.push({ suit, rank });
        }
    }
    deck.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 13; i++) {
        gameState.lots[i] = { id: i, cards:[deck[i * 4]!, deck[i * 4 + 1]!, deck[i * 4 + 2]!, deck[i * 4 + 3]!], bids: [] };
    }
}
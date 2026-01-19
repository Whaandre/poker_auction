import { Player, Card, Lot } from "./types"
import { WebSocket } from "ws";

const players: Player[] = [];
const lots: Lot[] = [];

function startGame() {
    generateLots();

    lots.forEach((lot) => {
        console.log(`Lot ${lot.id}: ${lot.cards.map(displayCard).join(", ")}`);
    });

    players.forEach((p) => {
        p.ownedCards = [];
        p.hiddenCard = randomCard();
        p.ownedCards.push(p.hiddenCard);
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ type: "GameStart", hiddenCard: displayCard(p.hiddenCard), ownedCards: p.ownedCards.map(displayCard).join(", ") }));
        }
    });
}

function auctionRound(id: number) {
    const lot = lots[id];
}

export function addPlayer(ws: WebSocket, name: string): Player {
    const player: Player = {
        ws: ws,
        id: name,
        money: 1000,
        hiddenCard: null,
        ownedCards: [],
        guess: null
    }
    players.push(player);

    console.log(`${player.id} connected`);

    // Broadcast
    players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({ type: "playerJoined", playerId: player.id, totalPlayers: players.length }));
        }
    });

    startGame();
    return player;
}

export function removePlayer(player: Player) {
    const idx = players.indexOf(player);
    if (idx !== -1) players.splice(idx, 1);
    // Broadcast
    players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({ type: "playerLeft", playerId: player.id, totalPlayers: players.length }));
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

function generateLots(): Lot[]{
    const deck: Card[] = [];
    for (const suit of ["H", "D", "C", "S"] as ("H" | "D" | "C" | "S")[]) {
        for (let rank = 2; rank <= 14; rank++) {
            deck.push({ suit, rank });
        }
    }
    deck.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 13; i++) {
        lots[i] = { id: i + 1, cards:[deck[i * 4]!, deck[i * 4 + 1]!, deck[i * 4 + 2]!, deck[i * 4 + 3]!] };
    }
    return lots;
}
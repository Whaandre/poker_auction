// import { start } from "repl";
import { 
    Player, 
    Card, 
    Lot, 
    Bid, 
    Guess, 
    GameState, 
    GameStartMessage,
    StartAuctionMessage,
    AuctionResultMessage,
    StartGuessingMessage,
    GameOverMessage,
    AuctionResult, 
    PlayerJoinedMessage,
    PlayerLeftMessage} from "./types"
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
        p.earnedCards = [];
        p.hiddenCard = randomCard();
        if (p.ws.readyState === WebSocket.OPEN) {
            const msg: GameStartMessage = {
                type: "gameStart",
                hiddenCard: p.hiddenCard!,
                initialMoney: p.money
            };
            p.ws.send(JSON.stringify(msg));
        }
    });

    startAuction();
}

function startAuction() {
    console.log(`Starting Auction for Round ${gameState.currentRound + 1}`);
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            const msg: StartAuctionMessage = {
                type: "startAuction",
                round: gameState.currentRound + 1,
                lotIds: rounds[gameState.currentRound]!,
                money: p.money
            };
            p.ws.send(JSON.stringify(msg));
        }
        p.waitingFor = "bid";
    });
}

function endAuction() {
    console.log(`Ending Auction for Round ${gameState.currentRound + 1}`);
    const auctionResults: AuctionResult[] = [];
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
        winner.player.earnedCards.push(...lot.cards);
        const result: AuctionResult = {
            lotId: id,
            winnerId: winner.player.id,
            pricePaid: secondHighestBid,
            cards: lot.cards
        };
        auctionResults.push(result);
    });
    const msg: AuctionResultMessage = {
        type: "auctionResult",
        results: auctionResults
    };
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(msg));
        }
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
    const msg: StartGuessingMessage = {
        type: "startGuessing",
        cardsPerPlayer: gameState.players.map(p => [p.id, p.earnedCards.map(c => displayCard(c))])
    };
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(msg));
        }
        p.waitingFor = "guess";
    });
}

function endGame(){
    console.log("Calulating Scores...");
    // Reveal guesses and calculate scores
    const msg: GameOverMessage = {
        type: "gameOver",
        scores: []
    };
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(msg));
        }
    });
}

export function receiveBid(player: Player, bids: Bid[]) {
    if (player.waitingFor !== "bid") return;

    // ---- VALIDATION ----
    let totalBid = 0;

    for (const b of bids) {
        if (b.amount < 0){
            player.ws.send(JSON.stringify({
                type: "bidRejected",
                message: "You cannot bid negative amount."
            }));
            return;
        }
        totalBid += b.amount;
    }

    if (totalBid > player.money) {
        console.log(`❌ ${player.id} overbid: ${totalBid} > ${player.money}`);

        player.ws.send(JSON.stringify({
            type: "bidRejected",
            message: "You cannot bid more than your available money."
        }));
        return;
    }

    // ---- ACCEPT BIDS ----
    player.waitingFor = null;

    for (const b of bids) {
        gameState.lots[b.lotId]?.bids.push(b);
    }

    // Send confirmation
    if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
            type: "bidAccepted"
        }));
    }

    // ---- CHECK ROUND COMPLETION ----
    const biddingDone = gameState.players.every(p => p.waitingFor === null);
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
        earnedCards: [],
        guess: null,
        waitingFor: null
    }
    gameState.players.push(player);

    console.log(`${player.id} connected`);

    // Broadcast
    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            const msg: PlayerJoinedMessage = {
                type: "playerJoined",
                playerId: player.id,
                totalPlayers: gameState.players.length
            };
            p.ws.send(JSON.stringify(msg));
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
            const msg: PlayerLeftMessage = {
                type: "playerLeft",
                playerId: player.id,
                totalPlayers: gameState.players.length
            };
            p.ws.send(JSON.stringify(msg));
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
        const lot: Lot = {
            id: i,
            cards: [deck[i * 4]!, deck[i * 4 + 1]!, deck[i * 4 + 2]!, deck[i * 4 + 3]!],
            bids: []
        };
        gameState.lots[i] = lot;
    }
}
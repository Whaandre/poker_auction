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
    ScoreDetail,
    AuctionResult, 
    PlayerJoinedMessage,
    PlayerLeftMessage,
    JoinRejectedMessage 
} from "./types";
import { WebSocket } from "ws";
import { findBestHand } from "./poker";

const gameState: GameState = {
    players: [],
    lots: [],
    currentRound: 0,
};
const rounds: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12]];

function startGame() {
    console.log("Starting Game...");
    generateLots();
    gameState.currentRound = 0;

    gameState.players.forEach((p) => {
        p.earnedCards = [];
        p.hiddenCard = randomCard();
        p.guess = null;
        p.money = 1000;
        
        if (p.ws.readyState === WebSocket.OPEN) {
            const msg: GameStartMessage = {
                type: "gameStart",
                hiddenCard: p.hiddenCard!,
                initialMoney: p.money,
                players: gameState.players,
                lots: gameState.lots
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
        const lot = gameState.lots[id]!;
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

        if (highestBid.length > 0) {
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
        }
    });

    const msg: AuctionResultMessage = {
        type: "auctionResult",
        results: auctionResults,
        players: gameState.players
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

// ---------------- SCORING ----------------

function getHandName(rankIndex: number): string {
    const names: Record<number, string> = {
        10: "Royal Flush",
        9: "Straight Flush",
        8: "Four of a Kind",
        7: "Full House",
        6: "Flush",
        5: "Straight",
        4: "Three of a Kind",
        3: "Two Pair",
        2: "One Pair",
        1: "High Card"
    };
    return names[rankIndex] || "Unknown";
}

// Compare sorting arrays: [rank, high1, high2...]
// Returns positive if A > B, negative if B > A
function compareHands(a: number[], b: number[]): number {
    for (let i = 0; i < a.length; i++) {
        if (a[i]! > b[i]!) return 1;
        if (a[i]! < b[i]!) return -1;
    }
    return 0;
}

function endGame() {
    console.log("Calculating Scores...");
    const n = gameState.players.length;

    // 1. Evaluate Poker Hands
    const playerEvals = gameState.players.map(p => {
        const allCards = [...p.earnedCards];
        if (!allCards.some(c => c.suit === p.hiddenCard!.suit && c.rank === p.hiddenCard!.rank)) {
            allCards.push(p.hiddenCard!);
        }
        
        try {
            const [scoreArray, bestHand] = findBestHand(allCards);
            return { player: p, scoreArray, bestHand, valid: true };
        } catch (e) {
            // Handle case where player has < 5 cards (unlikely but possible)
            return { 
                player: p, 
                scoreArray: [0,0,0,0,0,0], 
                bestHand: allCards, 
                valid: false 
            };
        }
    });

    // 2. Sort by Poker Strength (Descending)
    playerEvals.sort((a, b) => compareHands(b.scoreArray, a.scoreArray));

    // 3. Assign Prize Score
    const scoreMap = new Map<string, ScoreDetail>();

    playerEvals.forEach((entry, index) => {
        const k = index + 1; // Rank (1st, 2nd...)
        
        // Formula: (n - k)(n - k + 1) / 2 * 100
        const prizeScore = ((n - k) * (n - k + 1) / 2) * 100;

        const detail: ScoreDetail = {
            playerId: entry.player.id,
            rank: k,
            handRankName: entry.valid ? getHandName(entry.scoreArray[0]!) : "Insufficient Cards",
            bestHand: entry.bestHand,
            hiddenCard: entry.player.hiddenCard!,
            prizeScore: prizeScore,
            guessScore: 0,
            moneyScore: entry.player.money,
            totalScore: 0 // calculated after guesses
        };
        scoreMap.set(entry.player.id, detail);
    });

    // 4. Calculate Guess Scores
    gameState.players.forEach(guesser => {
        if (!guesser.guess) return;
        
        const targetId = guesser.guess.targetPlayerId;
        const targetPlayer = gameState.players.find(p => p.id === targetId);

        if (targetPlayer && targetPlayer.hiddenCard) {
            // Expected format e.g., "H14"
            const actualCardStr = targetPlayer.hiddenCard.suit + targetPlayer.hiddenCard.rank;
            
            if (guesser.guess.card === actualCardStr) {
                const targetScore = scoreMap.get(targetId);
                const guesserScore = scoreMap.get(guesser.id);
                
                if (targetScore && guesserScore) {
                    // Gain half of the target's prize score
                    const bonus = targetScore.prizeScore / 2;
                    guesserScore.guessScore += bonus;
                    console.log(`${guesser.id} guessed ${targetId} correctly! (+${bonus})`);
                }
            }
        }
    });

    // 5. Final Totals & Sort for Display
    const finalScores: ScoreDetail[] = [];
    scoreMap.forEach(score => {
        score.totalScore = score.prizeScore + score.guessScore + score.moneyScore;
        finalScores.push(score);
    });

    // Sort by Total Score (Highest first)
    finalScores.sort((a, b) => b.totalScore - a.totalScore);

    const msg: GameOverMessage = {
        type: "gameOver",
        scores: finalScores
    };

    gameState.players.forEach((p) => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(msg));
        }
    });
}

// ---------------- HELPERS & EXPORTS ----------------

export function receiveBid(player: Player, bids: Bid[]) {
    if (player.waitingFor !== "bid") return;
    let totalBid = 0;
    for (const b of bids) {
        if (b.amount < 0) {
             player.ws.send(JSON.stringify({ type: "bidRejected", message: "Negative bid." }));
             return;
        }
        totalBid += b.amount;
    }
    if (totalBid > player.money) {
        player.ws.send(JSON.stringify({ type: "bidRejected", message: "Overbid." }));
        return;
    }
    player.waitingFor = null;
    for (const b of bids) {
        gameState.lots[b.lotId]?.bids.push(b);
    }
    if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({ type: "bidAccepted" }));
    }
    const biddingDone = gameState.players.every(p => p.waitingFor === null);
    if (biddingDone) endAuction();
}

export function receiveGuess(player: Player, guess: Guess) {
    if (player.waitingFor == "guess") {
        player.waitingFor = null;
        player.guess = guess;
    }
    const guessingDone = gameState.players.every((p) => p.waitingFor === null);
    if (guessingDone) endGame();
}

export function addPlayer(ws: WebSocket, name: string): Player | null {
    if (!name || name.trim() === "") {
        ws.send(JSON.stringify({ type: "joinRejected", message: "Empty name" }));
        return null;
    }
    if (gameState.players.some(p => p.id === name)) {
        ws.send(JSON.stringify({ type: "joinRejected", message: "Name taken" }));
        return null;
    }

    const player: Player = {
        ws, id: name, money: 1000, hiddenCard: null, earnedCards: [], guess: null, waitingFor: null
    };
    gameState.players.push(player);
    
    gameState.players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ 
                type: "playerJoined", playerId: player.id, totalPlayers: gameState.players.length 
            }));
        }
    });

    if (gameState.players.length >= 8) startGame();
    return player;
}

export function removePlayer(player: Player) {
    const idx = gameState.players.indexOf(player);
    if (idx !== -1) gameState.players.splice(idx, 1);
    gameState.players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ 
                type: "playerLeft", playerId: player.id, totalPlayers: gameState.players.length 
            }));
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
        gameState.lots[i] = { id: i, cards: deck.slice(i*4, i*4+4), bids: [] };
    }
}
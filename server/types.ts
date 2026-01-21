import { WebSocket } from "ws";

export interface Card {
  suit: "H" | "D" | "C" | "S";
  rank: number; // 2-14 (11=J,12=Q,13=K,14=A)
}

export interface Guess {
  targetPlayer: Player;
  card: Card;
}

export interface Player {
  ws: WebSocket;
  id: string;
  money: number;
  hiddenCard: Card | null;
  ownedCards: Card[];
  guess: Guess | null;
  waitingFor: "bid" | "guess" | null;
}

export interface Lot {
  id: number;
  cards: Card[];
  bids: Bid[];
}

export interface Bid {
  player: Player;
  lotId: number;
  amount: number;
}

export interface GameState {
  players: Player[];
  lots: Lot[];
  currentRound: number;
  bids: Bid[];
}

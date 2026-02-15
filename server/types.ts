import { WebSocket } from "ws";

export type ServerMessage =
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage
  | StartAuctionMessage
  | AuctionResultMessage
  | StartGuessingMessage
  | GameOverMessage
  | BidAcceptedMessage
  | BidRejectedMessage;

export type ClientMessage =
  | BidMessage
  | GuessMessage;

export interface BaseMessage {
  type: string;
}

export interface PlayerJoinedMessage extends BaseMessage {
  type: "playerJoined";
  playerId: string;
  totalPlayers: number;
}

export interface PlayerLeftMessage extends BaseMessage {
  type: "playerLeft";
  playerId: string;
  totalPlayers: number;
}

export interface GameStartMessage extends BaseMessage {
  type: "gameStart";
  hiddenCard: Card;
  initialMoney: number;
}

export interface StartAuctionMessage extends BaseMessage {
  type: "startAuction";
  round: number;
  lotIds: number[];
  money: number;
}

export interface BidMessage extends BaseMessage {
  type: "bid";
  bids: number[][];
}

export interface AuctionResult {
  lotId: number;
  winnerId: string;
  pricePaid: number;
  cards: Card[];
}

export interface AuctionResultMessage extends BaseMessage {
  type: "auctionResult";
  results: AuctionResult[];
}

export interface StartGuessingMessage extends BaseMessage {
  type: "startGuessing";
  cardsPerPlayer: [string, string[]][];
}

export interface GuessMessage extends BaseMessage {
  type: "guess";
  targetPlayerId: string;
  card: string;
}

export interface BidAcceptedMessage extends BaseMessage {
  type: "bidAccepted";
}

export interface BidRejectedMessage extends BaseMessage {
  type: "bidRejected";
  message: string;
}

export interface FinalScore {
  playerId: string;
  rank: number;
  money: number;
  prize: number;
  guessIncome: number;
  total: number;
}

export interface GameOverMessage extends BaseMessage {
  type: "gameOver";
  scores: FinalScore[];
}

export interface Card {
  suit: "H" | "D" | "C" | "S";
  rank: number; // 2-14 (11=J,12=Q,13=K,14=A)
}

export interface Guess {
  targetPlayerId: string;
  card: Card;
}

export interface Player {
  ws: WebSocket;
  id: string;
  money: number;
  hiddenCard: Card | null;
  earnedCards: Card[];
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
}

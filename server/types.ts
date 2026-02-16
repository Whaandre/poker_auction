import { WebSocket } from "ws";

export type Card = {
  suit: "H" | "D" | "C" | "S";
  rank: number;
};

export type Lot = {
  id: number;
  cards: Card[];
  bids: Bid[];
};

export type Player = {
  ws: WebSocket;
  id: string;
  money: number;
  hiddenCard: Card | null;
  earnedCards: Card[];
  guess: Guess | null;
  waitingFor: "bid" | "guess" | null;
};

export type Bid = {
  player: Player;
  lotId: number;
  amount: number;
};

export type Guess = {
  targetPlayerId: string;
  card: string;
};

export type GameState = {
  players: Player[];
  lots: Lot[];
  currentRound: number;
};

// ---- Messages ----

export type PlayerJoinedMessage = {
  type: "playerJoined";
  playerId: string;
  totalPlayers: number;
};

export type PlayerLeftMessage = {
  type: "playerLeft";
  playerId: string;
  totalPlayers: number;
};

export type GameStartMessage = {
  type: "gameStart";
  hiddenCard: Card;
  initialMoney: number;
  players: Player[];
  lots: Lot[];
};

export type StartAuctionMessage = {
  type: "startAuction";
  round: number;
  lotIds: number[];
  money: number;
};

export type AuctionResult = {
  lotId: number;
  winnerId: string;
  pricePaid: number;
  cards: Card[];
};

export type AuctionResultMessage = {
  type: "auctionResult";
  results: AuctionResult[];
  players: Player[];
};

export type StartGuessingMessage = {
  type: "startGuessing";
  cardsPerPlayer: [string, string[]][];
};

export type GameOverMessage = {
  type: "gameOver";
  scores: { playerId: string; total: number }[];
};

export type BidAcceptedMessage = {
  type: "bidAccepted";
};

export type BidRejectedMessage = {
  type: "bidRejected";
  message: string;
};

export type JoinRejectedMessage = {
  type: "joinRejected";
  message: string;
};

export type ServerMessage =
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage
  | StartAuctionMessage
  | AuctionResultMessage
  | StartGuessingMessage
  | GameOverMessage
  | BidAcceptedMessage
  | BidRejectedMessage
  | JoinRejectedMessage;

// Client Messages
export type BidMessage = {
  type: "bid";
  bids: { lotId: number; amount: number }[];
};

export type GuessMessage = {
  type: "guess";
  targetPlayerId: string;
  card: string;
};
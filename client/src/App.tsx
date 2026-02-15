// client/src/App.tsx
import React, { useState, useEffect } from "react";
import { PlayerHand } from "./components/PlayerHand";
import { AuctionLot } from "./components/AuctionLot";
import { BidInput } from "./components/BidInput";
import { Card, BidMessage, GuessMessage } from "../../server/types";

type Message =
  | { type: "startAuction"; lots: number[]; money: number }
  | { type: "playerJoined"; playerId: string; totalPlayers: number }
  | { type: "playerLeft"; playerId: string; totalPlayers: number }
  | { type: "auctionResult"; winnerId: string; lotId: number; price: number }
  | { type: "guessPhase" }
  | { type: "bidAccepted" }
  | { type: "bidRejected"; message: string };

export const ws = new WebSocket("ws://localhost:8080");

const App: React.FC = () => {
  const [playerName, setPlayerName] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [lots, setLots] = useState<number[]>([]);
  const [money, setMoney] = useState<number>(1000);
  const [hand, setHand] = useState<Card[]>([]);

  useEffect(() => {
    ws.onopen = () => {
      console.log("Connected to server");
      setConnected(true);
      if (!playerName) {
        const name = prompt("Enter your name") || "Player";
        setPlayerName(name);
      }
    };

    ws.onmessage = (event) => {
      const msg: Message = JSON.parse(event.data);
      console.log("Server message:", msg);

      switch (msg.type) {
        case "startAuction":
          setLots(msg.lots);
          setMoney(msg.money);
          break;
        case "playerJoined":
        case "playerLeft":
          alert(`Players: ${msg.totalPlayers}`);
          break;
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from server");
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Card Auction Game</h1>
      {connected ? (
        <>
          <p>Your money: ${money}</p>
          <PlayerHand cards={hand} />
          <AuctionLot lots={lots} />
          <BidInput lots={lots} />
        </>
      ) : (
        <p>Connecting...</p>
      )}
    </div>
  );
};

export default App;

/// <reference types="vite/client" />

import React, { useState, useEffect, useRef } from "react";
import { PlayerHand } from "./components/PlayerHand";
import { AuctionLot } from "./components/AuctionLot";
import { BidInput } from "./components/BidInput";
import { GuessPhase } from "./components/GuessPhase";
import { GameOver } from "./components/GameOver";
import type { Card, Lot, Player, ScoreDetail, ServerMessage, BidMessage, GuessMessage } from "../../server/types";

// Auto-switch between local testing and production
const wsUrl = import.meta.env.PROD 
  ? "wss://poker-auction.onrender.com" 
  : "ws://localhost:8080";

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState<string>("");
  
  // Game State
  const [phase, setPhase] = useState<"lobby" | "auction" | "guessing" | "gameOver">("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [allLots, setAllLots] = useState<Lot[]>([]); // All 13 lots from gameStart
  const [activeLotIds, setActiveLotIds] = useState<number[]>([]); // Lots active in the current round
  const [money, setMoney] = useState<number>(1000);
  const [hiddenCard, setHiddenCard] = useState<Card | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // End Game State
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [guessOptions, setGuessOptions] = useState<[string, string[]][]>([]);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg].slice(-10)); // Keep last 10 logs

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      const name = prompt("Enter your name") || `Player${Math.floor(Math.random() * 1000)}`;
      setPlayerName(name);
      socket.send(JSON.stringify({ type: "join", name }));
      addLog("Connected to server.");
    };

    socket.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      
      switch (msg.type) {
        case "joinRejected":
          alert(msg.message);
          window.location.reload();
          break;
        case "playerJoined":
          addLog(`${msg.playerId} joined (${msg.totalPlayers}/8)`);
          break;
        case "gameStart":
          addLog("Game Started!");
          setAllLots(msg.lots);
          setHiddenCard(msg.hiddenCard);
          setMoney(msg.initialMoney);
          setPlayers(msg.players);
          setPhase("auction");
          break;
        case "startAuction":
          setActiveLotIds(msg.lotIds);
          setMoney(msg.money);
          setPhase("auction");
          break;
        case "auctionResult":
          msg.results.forEach(r => addLog(`Lot ${r.lotId + 1} won by ${r.winnerId} for $${r.pricePaid}`));
          setPlayers(msg.players);
          break;
        case "startGuessing":
          setGuessOptions(msg.cardsPerPlayer);
          setPhase("guessing");
          break;
        case "gameOver":
          setScores(msg.scores);
          setPhase("gameOver");
          break;
        case "bidAccepted":
          addLog("Your bids were accepted. Waiting for others...");
          break;
        case "bidRejected":
          addLog(`Bid Error: ${msg.message}`);
          break;
      }
    };

    return () => socket.close();
  }, []);

  const handleBid = (bids: { lotId: number; amount: number }[]) => {
    if (ws) ws.send(JSON.stringify({ type: "bid", bids }));
  };

  const handleGuess = (targetPlayerId: string, card: string) => {
    if (ws) ws.send(JSON.stringify({ type: "guess", targetPlayerId, card }));
  };

  // Filter the full lots array to only show the ones active in this round
  const activeLots = allLots.filter(lot => activeLotIds.includes(lot.id));
  const myPlayer = players.find(p => p.id === playerName);

  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6">
      {/* Left Column: Game Board */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">🂡 Card Auction Game</h1>
        
        {!connected ? (
          <p className="text-xl">Connecting to server...</p>
        ) : phase === "lobby" ? (
          <div className="bg-white p-6 rounded-xl shadow border">
            <h2 className="text-xl font-bold">Waiting in Lobby...</h2>
            <p>The game will start automatically when 8 players join.</p>
          </div>
        ) : phase === "auction" ? (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
            
            {/* Header: Hand & Money */}
            <div className="flex justify-between items-start mb-6 border-b-2 border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900 mb-3">Auction Phase</h2>
                <PlayerHand hiddenCard={hiddenCard} earnedCards={myPlayer?.earnedCards || []} />
              </div>
              <div className="bg-green-100 text-green-800 px-6 py-3 rounded-xl text-2xl font-extrabold border-2 border-green-300 shadow-sm">
                ${money}
              </div>
            </div>
            
            {/* The Lots & Bidding */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
               <AuctionLot allLots={allLots} activeLotIds={activeLotIds} />
            </div>
            
            <BidInput activeLotIds={activeLotIds} onSubmit={handleBid} />
          </div>
        ) : phase === "guessing" ? (
          <GuessPhase players={players} playerName={playerName} onSubmit={handleGuess} />
        ) : phase === "gameOver" ? (
          <GameOver scores={scores} />
        ) : null}
      </div>

      {/* Right Column: Status & Logs */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl shadow border">
          <h2 className="font-bold text-lg mb-2 border-b pb-2">Event Log</h2>
          <div className="h-48 overflow-y-auto flex flex-col-reverse text-sm text-gray-600">
            {[...logs].reverse().map((log, i) => <p key={i} className="mb-1">{log}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
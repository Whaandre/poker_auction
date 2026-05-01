import React, { useState } from "react";
import type { Player } from "../../../server/types";

export const GuessPhase: React.FC<{ players: Player[], playerName: string, onSubmit: (target: string, card: string) => void }> = ({ players, playerName, onSubmit }) => {
  const [target, setTarget] = useState("");
  const [rank, setRank] = useState("14");
  const [suit, setSuit] = useState("H");

  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h2 className="text-2xl font-bold mb-2">Guessing Phase</h2>
      <p className="text-gray-600 mb-6">Guess another player's hidden card to steal some of their points!</p>
      
      <div className="flex flex-col gap-4 max-w-sm">
        <div>
          <label className="block font-bold mb-1">Target Player</label>
          <select value={target} onChange={e => setTarget(e.target.value)} className="w-full border p-2 rounded">
            <option value="">Select a player...</option>
            {players.filter(p => p.id !== playerName).map(p => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block font-bold mb-1">Rank</label>
            <select value={rank} onChange={e => setRank(e.target.value)} className="w-full border p-2 rounded">
              <option value="14">A</option><option value="13">K</option><option value="12">Q</option>
              <option value="11">J</option><option value="10">10</option><option value="9">9</option>
              <option value="8">8</option><option value="7">7</option><option value="6">6</option>
              <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block font-bold mb-1">Suit</label>
            <select value={suit} onChange={e => setSuit(e.target.value)} className="w-full border p-2 rounded">
              <option value="H">♥ Hearts</option><option value="D">♦ Diamonds</option>
              <option value="C">♣ Clubs</option><option value="S">♠ Spades</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => target && onSubmit(target, suit + rank)}
          disabled={!target}
          className="mt-4 bg-purple-600 text-white font-bold py-2 rounded disabled:opacity-50"
        >
          Submit Guess
        </button>
      </div>
    </div>
  );
};
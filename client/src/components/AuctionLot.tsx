import React from "react";
import type { Lot, Card } from "../../../server/types";

const renderCard = (card: Card, index: number) => {
  const isRed = card.suit === "H" || card.suit === "D";
  const symbol = { H: "♥", D: "♦", C: "♣", S: "♠" }[card.suit];
  const rank = card.rank > 10 ? ["J", "Q", "K", "A"][card.rank - 11] : card.rank;
  
  return (
    <div key={index} className={`font-bold ${isRed ? "text-red-600" : "text-black"} bg-gray-50 border rounded px-2 py-1 m-1 inline-block text-sm`}>
      {rank}{symbol}
    </div>
  );
};

export const AuctionLot: React.FC<{ activeLots: Lot[] }> = ({ activeLots }) => (
  <div className="my-6">
    <h2 className="text-xl font-bold mb-4">Current Lots for Auction</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {activeLots.map((lot) => (
        <div key={lot.id} className="border-2 rounded-xl p-4 bg-white shadow-sm hover:border-blue-400 transition">
          <div className="text-sm text-gray-500 font-bold mb-2 uppercase tracking-wide">Lot {lot.id + 1}</div>
          <div className="flex flex-wrap">{lot.cards.map((c, i) => renderCard(c, i))}</div>
        </div>
      ))}
    </div>
  </div>
);
import React from "react";
import type { Lot, Card } from "../../../server/types";

const renderCard = (card: Card, index: number) => {
  const isRed = card.suit === "H" || card.suit === "D";
  const symbol = { H: "♥", D: "♦", C: "♣", S: "♠" }[card.suit];
  const rank = card.rank > 10 ? ["J", "Q", "K", "A"][card.rank - 11] : card.rank;
  
  return (
    <div key={index} className={`font-bold ${isRed ? "text-red-600" : "text-black"} bg-white border border-gray-300 rounded px-2 py-1 m-1 inline-block text-sm shadow-sm`}>
      {rank}{symbol}
    </div>
  );
};

interface Props {
  allLots: Lot[];
  activeLotIds: number[];
}

export const AuctionLot: React.FC<Props> = ({ allLots, activeLotIds }) => (
  <div className="my-2">
    <h3 className="text-lg font-bold text-gray-700 mb-4">Auction Board (All 13 Lots)</h3>
    
    {/* Using a tighter 4 or 5 column grid so all 13 fit nicely on the screen */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {allLots.map((lot) => {
        const isActive = activeLotIds.includes(lot.id);
        const isPast = activeLotIds.length > 0 && lot.id < Math.min(...activeLotIds);
        
        return (
          <div 
            key={lot.id} 
            className={`border-2 rounded-xl p-3 transition-all duration-300 ${
              isActive 
                ? "bg-blue-50 border-blue-500 shadow-md transform scale-105 z-10" // Active lots pop out
                : isPast
                  ? "bg-gray-200 border-gray-300 opacity-50 grayscale"           // Past lots are grayed out
                  : "bg-gray-50 border-gray-200 opacity-80"                      // Future lots are slightly dimmed
            }`}
          >
            <div className={`text-xs font-bold mb-2 uppercase tracking-wide flex justify-between items-center ${isActive ? "text-blue-800" : "text-gray-500"}`}>
              <span>Lot {lot.id + 1}</span>
              {/* Add a tiny pulsing dot to active lots to draw the eye */}
              {isActive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center">
              {lot.cards.map((c, i) => renderCard(c, i))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
import React from "react";
import type { Card } from "../../../server/types";

interface Props {
  hiddenCard: Card | null;
  earnedCards: Card[];
}

export const PlayerHand: React.FC<Props> = ({ hiddenCard, earnedCards }) => {
  const renderCard = (card: Card, index: number, isHidden = false) => {
    const isRed = card.suit === "H" || card.suit === "D";
    const symbol = { H: "♥", D: "♦", C: "♣", S: "♠" }[card.suit];
    const rank = card.rank > 10 ? ["J", "Q", "K", "A"][card.rank - 11] : card.rank;
    
    return (
      <div key={index} className={`font-bold text-lg p-3 rounded-lg shadow-sm border-2 inline-block bg-white ${isRed ? "text-red-600" : "text-black"} ${isHidden ? "border-purple-400 bg-purple-50" : "border-gray-200"}`}>
        {rank}{symbol}
      </div>
    );
  };

  return (
    <div>
      <h3 className="font-bold text-gray-700 mb-2">Your Hand</h3>
      <div className="flex flex-wrap gap-2">
        {hiddenCard && renderCard(hiddenCard, -1, true)}
        {earnedCards.map((c, i) => renderCard(c, i))}
      </div>
    </div>
  );
};
// client/src/components/PlayerHand.tsx
import React from "react";
import { Card } from "../../../server/types";

interface Props {
  cards: Card[];
}

export const PlayerHand: React.FC<Props> = ({ cards }) => {
  return (
    <div className="my-2 flex gap-2">
      {cards.map((card, i) => (
        <div key={i} className="border p-2 rounded bg-white shadow">
          {card.rank > 10 ? ["J", "Q", "K", "A"][card.rank - 11] : card.rank}
          {card.suit === "H" ? "♥" : card.suit === "D" ? "♦" : card.suit === "C" ? "♣" : "♠"}
        </div>
      ))}
    </div>
  );
};

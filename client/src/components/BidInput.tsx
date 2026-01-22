// client/src/components/BidInput.tsx
import React, { useState } from "react";
import { ws } from "../App";
import { BidMessage } from "../../../server/types";

interface Props {
  lots: number[];
}

export const BidInput: React.FC<Props> = ({ lots }) => {
  const [bids, setBids] = useState<number[]>(lots.map(() => 0));

  const handleChange = (index: number, value: number) => {
    const newBids = [...bids];
    newBids[index] = value;
    setBids(newBids);
  };

  const sendBids = () => {
    const message: BidMessage = {
      type: "bid",
      bids: lots.map((lotId, i) => [lotId, bids[i]]),
    };
    ws.send(JSON.stringify({ message: JSON.stringify(message) }));
    setBids(lots.map(() => 0));
  };

  return (
    <div className="my-4">
      <h3 className="font-semibold">Place Your Bids</h3>
      {lots.map((lotId, i) => (
        <div key={lotId} className="flex items-center gap-2 my-1">
          <label>Lot {lotId + 1}:</label>
          <input
            type="number"
            min={0}
            value={bids[i]}
            onChange={(e) => handleChange(i, parseInt(e.target.value))}
            className="border p-1 rounded w-20"
          />
        </div>
      ))}
      <button
        onClick={sendBids}
        className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Submit Bids
      </button>
    </div>
  );
};

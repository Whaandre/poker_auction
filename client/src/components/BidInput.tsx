// client/src/components/BidInput.tsx
import React, { useState, useEffect } from "react";
import { ws } from "../App";
import { BidMessage } from "../../../server/types";

interface Props {
  lots: number[];
}

export const BidInput: React.FC<Props> = ({ lots }) => {
  const [bids, setBids] = useState<number[]>(lots.map(() => 0));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const messageEvent = event as MessageEvent;
      const msg = JSON.parse(messageEvent.data);

      if (msg.type === "bidAccepted") {
        setBids(lots.map(() => 0));
        setSubmitting(false);
        setError(null);
      } else if (msg.type === "bidRejected") {
        setSubmitting(false);
        setError(msg.message);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [lots]);

  const handleChange = (index: number, value: number) => {
    const newBids = [...bids];
    newBids[index] = value;
    setBids(newBids);
  };

  const sendBids = () => {
    setSubmitting(true);
    setError(null);
    const message: BidMessage = {
      type: "bid",
      bids: lots.map((lotId, i) => [lotId, bids[i]]),
    };
    ws.send(JSON.stringify({ message: JSON.stringify(message) }));
  };

  return (
    <div className="my-4">
      <h3 className="font-semibold">Place Your Bids</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {lots.map((lotId, i) => (
        <div key={lotId} className="flex items-center gap-2 my-1">
          <label>Lot {lotId + 1}:</label>
          <input
            type="number"
            min={0}
            value={bids[i]}
            onChange={(e) => handleChange(i, parseInt(e.target.value))}
            disabled={submitting}
            className="border p-1 rounded w-20 disabled:opacity-50"
          />
        </div>
      ))}
      <button
        onClick={sendBids}
        disabled={submitting}
        className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting..." : "Submit Bids"}
      </button>
    </div>
  );
};

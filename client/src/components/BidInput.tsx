import React, { useState, useEffect } from "react";

interface Props {
  activeLotIds: number[];
  onSubmit: (bids: { lotId: number; amount: number }[]) => void;
}

export const BidInput: React.FC<Props> = ({ activeLotIds, onSubmit }) => {
  const [bids, setBids] = useState<{ [key: number]: number }>({});

  // Reset inputs when a new round starts
  useEffect(() => {
    setBids({});
  }, [activeLotIds]);

  const handleSubmit = () => {
    const formattedBids = activeLotIds.map(id => ({
      lotId: id,
      amount: bids[id] || 0
    }));
    onSubmit(formattedBids);
  };

  return (
    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mt-6">
      <h3 className="font-bold text-lg mb-4 text-blue-900">Place Your Bids</h3>
      <div className="flex flex-col gap-3 mb-4">
        {activeLotIds.map(lotId => (
          <div key={lotId} className="flex items-center gap-4">
            <label className="font-semibold w-16">Lot {lotId + 1}:</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={bids[lotId] || ""}
              onChange={(e) => setBids({ ...bids, [lotId]: parseInt(e.target.value) || 0 })}
              className="border border-gray-300 p-2 rounded-lg w-32 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        ))}
      </div>
      <button 
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
      >
        Submit Bids
      </button>
    </div>
  );
};
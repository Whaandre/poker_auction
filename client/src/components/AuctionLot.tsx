// client/src/components/AuctionLot.tsx
import React from "react";

interface Props {
  lots: number[];
}

export const AuctionLot: React.FC<Props> = ({ lots }) => {
  return (
    <div className="my-4">
      <h2 className="font-semibold">Current Lots</h2>
      <div className="flex gap-4">
        {lots.map((lotId) => (
          <div key={lotId} className="border p-2 rounded bg-gray-100">
            Lot {lotId + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

// client/src/components/AuctionLot.tsx
import React from "react";

interface Props {
  lots: number[];
}

export const AuctionLot: React.FC<Props> = ({ lots }) => {
  return (
    <div className="my-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Current Lots</h2>
      
      {/* Responsive grid: 3 columns on small screens, up to 7 on large screens */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
        {lots.map((lotId) => (
          <div 
            key={lotId} 
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:border-blue-400 hover:-translate-y-1 transition-all duration-200 aspect-[3/4]"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
              Lot
            </span>
            <span className="text-3xl font-bold text-gray-800">
              {lotId + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
import React from "react";
import type { ScoreDetail } from "../../../server/types";

export const GameOver: React.FC<{ scores: ScoreDetail[] }> = ({ scores }) => (
  <div className="bg-white p-6 rounded-xl shadow border">
    <h2 className="text-3xl font-bold text-red-600 mb-6">Final Scores</h2>
    <div className="flex flex-col gap-4">
      {scores.map((score, i) => (
        <div key={score.playerId} className={`p-4 border rounded-lg ${i === 0 ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}>
          <h3 className="text-xl font-bold">
            {i === 0 && "🏆 "}#{i + 1} {score.playerId} — {Math.floor(score.totalScore)} pts
          </h3>
          <p className="text-gray-600">
            Hand: <strong>{score.handRankName}</strong> | Base Prize: {score.prizeScore} | Guess Bonus: {score.guessScore} | Money Left: ${score.moneyScore}
          </p>
        </div>
      ))}
    </div>
  </div>
);
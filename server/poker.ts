import { Card } from "./types";

/**
 * Returns the best 5-card poker hand and a numeric representation for sorting
 * Numeric format: [handRank, high1, high2, high3, high4, high5]
 */
export function findBestHand(cards: Card[]): [number[], Card[]] {
  if (cards.length < 5) throw new Error("Need at least 5 cards");

  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<Card['suit'], Card[]>();
  for (const card of cards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    if (!suitCounts.has(card.suit)) suitCounts.set(card.suit, []);
    suitCounts.get(card.suit)!.push(card);
  }

  const sortDesc = (a: Card, b: Card) => b.rank - a.rank;

  function findStraight(ranks: number[]): number[] | null {
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
    if (uniqueRanks.includes(14)) uniqueRanks.push(1);

    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      const straight: number[] = [uniqueRanks[i]!];
      for (let j = i + 1; j < uniqueRanks.length && straight.length < 5; j++) {
        if (uniqueRanks[j] === straight[straight.length - 1]! - 1) {
          straight.push(uniqueRanks[j]!);
        } else if (uniqueRanks[j]! < straight[straight.length - 1]! - 1) {
          break;
        }
      }
      if (straight.length === 5) return straight.sort((a, b) => b - a);
    }
    return null;
  }

  // Flush check
  let flushSuit: Card['suit'] | null = null;
  for (const [suit, suitCards] of suitCounts.entries()) {
    if (suitCards.length >= 5) {
      flushSuit = suit;
      break;
    }
  }

  // Straight flush / Royal flush
  if (flushSuit) {
    const flushCards = suitCounts.get(flushSuit)!.sort(sortDesc);
    const flushRanks = flushCards.map(c => c.rank);
    const sf = findStraight(flushRanks);
    if (sf) {
      const handCards = sf.map(r => flushCards.find(c => c.rank === r)!);
      const handRank = sf[0] === 14 ? 10 : 9;
      const numbers = [handRank, ...sf];
      while (numbers.length < 6) numbers.push(0);
      return [numbers, handCards];
    }
  }

  // Four of a kind
  const quadsRank = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 4)
    .map(([r]) => r)
    .sort((a, b) => b - a)[0];
  if (quadsRank) {
    const quadCards = cards.filter(c => c.rank === quadsRank);
    const kicker = cards.filter(c => c.rank !== quadsRank).sort(sortDesc)[0];
    return [[8, quadsRank, kicker!.rank, 0, 0, 0], [...quadCards!, kicker!]];
  }

  // Full House
  const trips = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 3)
    .map(([r]) => r)
    .sort((a, b) => b - a);
  const pairs = Array.from(rankCounts.entries())
    .filter(([_, count]) => count === 2)
    .map(([r]) => r)
    .sort((a, b) => b - a);
  if (trips.length && (pairs.length || trips.length > 1)) {
    const tripRank = trips[0];
    const pairRank = pairs.length ? pairs[0] : trips[1];
    const handCards = [
      ...cards.filter(c => c.rank === tripRank).slice(0, 3),
      ...cards.filter(c => c.rank === pairRank).slice(0, 2),
    ];
    return [[7, tripRank!, pairRank!, 0, 0, 0], handCards];
  }

  // Flush
  if (flushSuit) {
    const flushCards = suitCounts.get(flushSuit)!.sort(sortDesc).slice(0, 5);
    const flushRanks = flushCards.map(c => c.rank);
    while (flushRanks.length < 5) flushRanks.push(0);
    return [[6, ...flushRanks], flushCards];
  }

  // Straight
  const straightRanks = findStraight(cards.map(c => c.rank));
  if (straightRanks) {
    const handCards = straightRanks.map(r => cards.find(c => c.rank === r)!);
    const numbers = [5, ...straightRanks];
    while (numbers.length < 6) numbers.push(0);
    return [numbers, handCards];
  }

  // Three of a Kind
  if (trips.length) {
    const tripRank = trips[0];
    const tripCards = cards.filter(c => c.rank === tripRank).slice(0, 3);
    const kickers = cards
      .filter(c => c.rank !== tripRank)
      .sort(sortDesc)
      .slice(0, 2);
    const numbers: number[] = [4, tripRank!, ...kickers.map(k => k.rank)];
    while (numbers.length < 6) numbers.push(0);
    return [numbers, [...tripCards, ...kickers]];
  }

  // Two Pair
  if (pairs.length >= 2) {
    const topPair = pairs[0];
    const secondPair = pairs[1];
    const pairCards = [
      ...cards.filter(c => c.rank === topPair).slice(0, 2),
      ...cards.filter(c => c.rank === secondPair).slice(0, 2),
    ];
    const kicker = cards
      .filter(c => c.rank !== topPair && c.rank !== secondPair)
      .sort(sortDesc)[0];
    return [[3, topPair!, secondPair!, kicker!.rank, 0, 0], [...pairCards!, kicker!]];
  }

  // One Pair
  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const pairCards = cards.filter(c => c.rank === pairRank).slice(0, 2);
    const kickers = cards
      .filter(c => c.rank !== pairRank)
      .sort(sortDesc)
      .slice(0, 3);
    const numbers: number[] = [2, pairRank!, ...kickers.map(k => k.rank)];
    while (numbers.length < 6) numbers.push(0);
    return [numbers, [...pairCards, ...kickers]];
  }

  // High Card
  const highCards = cards.sort(sortDesc).slice(0, 5);
  const numbers = [1, ...highCards.map(c => c.rank)];
  while (numbers.length < 6) numbers.push(0);
  return [numbers, highCards];
}

import { Chess } from 'chess.js';

export interface ParsedPgn {
  finalFen: string;
  positionFens: string[];
  piecePlacements: string[];
}

export function parsePgn(pgn: string): ParsedPgn {
  if (!pgn.trim()) {
    throw new Error('Enter a PGN with at least one move.');
  }

  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch {
    throw new Error('Enter a valid PGN with legal moves.');
  }

  const moves = game.history({ verbose: true });
  if (moves.length === 0) {
    throw new Error('Enter a PGN with at least one move.');
  }

  return {
    finalFen: game.fen(),
    positionFens: [moves[0].before, ...moves.map((move) => move.after)],
    piecePlacements: moves.map((move) => move.after.split(' ')[0]),
  };
}

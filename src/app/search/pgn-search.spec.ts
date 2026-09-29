import { parsePgn } from './pgn-search';

describe('parsePgn', () => {
  it('extracts the main-line position after every played move', () => {
    const result = parsePgn('[Event "Example"]\n\n1. e4 {comment} e5 (1... c5) 2. Nf3 *');

    expect(result.piecePlacements).toHaveLength(3);
    expect(result.piecePlacements[0]).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(result.piecePlacements[1]).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(result.finalFen.split(' ')[0]).toBe(result.piecePlacements[2]);
    expect(result.positionFens).toHaveLength(4);
    expect(result.positionFens[0].split(' ')[0]).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    );
  });

  it('uses a PGN setup FEN rather than the standard starting position', () => {
    const result = parsePgn('[SetUp "1"]\n[FEN "8/8/8/8/8/4k3/8/6K1 w - - 0 1"]\n\n1. Kf1 *');

    expect(result.piecePlacements).toEqual(['8/8/8/8/8/4k3/8/5K2']);
    expect(result.finalFen.startsWith('8/8/8/8/8/4k3/8/5K2')).toBe(true);
    expect(result.positionFens[0].startsWith('8/8/8/8/8/4k3/8/6K1')).toBe(true);
  });

  it('rejects blank, move-free, and illegal PGNs', () => {
    expect(() => parsePgn('   ')).toThrow('at least one move');
    expect(() => parsePgn('[Event "No moves"]\n\n*')).toThrow('at least one move');
    expect(() => parsePgn('1. e4 impossible')).toThrow('valid PGN');
  });
});

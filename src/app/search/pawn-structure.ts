export const STARTING_PAWN_PLACEMENT = '8/pppppppp/8/8/8/8/PPPPPPPP/8';
export type PawnSearchScope = 'both' | 'white' | 'black';

export function pawnStructureFromPlacement(
  piecePlacement: string,
  scope: PawnSearchScope = 'both',
): string {
  return piecePlacement
    .split('/')
    .map((rank) => {
      let squares = '';
      for (const piece of rank) {
        squares += /[1-8]/.test(piece)
          ? '.'.repeat(Number(piece))
          : (piece === 'P' && scope !== 'black') || (piece === 'p' && scope !== 'white')
            ? piece
            : '.';
      }
      return squares.replace(/\.+/g, (empty) => String(empty.length));
    })
    .join('/');
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chess } from 'chess.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBoard } from './search-board';

interface MockBoard {
  handler?: (event: { type: string; squareFrom?: string; squareTo?: string }) => boolean | void;
  position: string;
  orientation: string;
  props: Record<string, unknown>;
  input(type: string, squareFrom?: string, squareTo?: string): boolean | void;
}

const chessboardMock = vi.hoisted(() => ({ lastBoard: null as MockBoard | null }));

vi.mock('cm-chessboard', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const inputTypes = {
    moveInputCanceled: 'moveInputCanceled',
    moveInputFinished: 'moveInputFinished',
    moveInputStarted: 'moveInputStarted',
    movingOverSquare: 'movingOverSquare',
    validateMoveInput: 'validateMoveInput',
  };

  class MockChessboard implements MockBoard {
    handler?: MockBoard['handler'];
    position = startFen;
    orientation = 'w';

    constructor(
      _context: HTMLElement,
      readonly props: Record<string, unknown>,
    ) {
      chessboardMock.lastBoard = this;
    }

    enableMoveInput(handler: NonNullable<MockBoard['handler']>): void {
      this.handler = handler;
    }

    setPosition(fen: string): Promise<void> {
      this.position = fen;
      return Promise.resolve();
    }

    setOrientation(color: string): Promise<void> {
      this.orientation = color;
      return Promise.resolve();
    }

    destroy(): void {}

    input(type: string, squareFrom?: string, squareTo?: string): boolean | void {
      return this.handler?.({ type, squareFrom, squareTo });
    }
  }

  return {
    BORDER_TYPE: { frame: 'frame', none: 'none', thin: 'thin' },
    Chessboard: MockChessboard,
    COLOR: { black: 'b', white: 'w' },
    FEN: { empty: '8/8/8/8/8/8/8/8', start: startFen },
    INPUT_EVENT_TYPE: inputTypes,
    PIECES_FILE_TYPE: { svgSprite: 'svgSprite' },
  };
});

describe('SearchBoard', () => {
  let fixture: ComponentFixture<SearchBoard>;
  let board: MockBoard;
  let emittedPositions: Array<string | null>;

  beforeEach(async () => {
    chessboardMock.lastBoard = null;
    emittedPositions = [];
    await TestBed.configureTestingModule({ imports: [SearchBoard] }).compileComponents();
    fixture = TestBed.createComponent(SearchBoard);
    fixture.componentInstance.positionChange.subscribe((position) =>
      emittedPositions.push(position),
    );
    await fixture.whenStable();
    board = chessboardMock.lastBoard!;
  });

  afterEach(() => fixture.destroy());

  it('starts from the initial board and emits null once for the initial search', () => {
    expect(emittedPositions).toEqual([null]);
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(board.props['assetsUrl']).toBe(new URL('assets/cm-chessboard/', document.baseURI).href);
  });

  it('emits the exact piece-placement field for legal moves and rejects illegal moves', () => {
    expect(board.input('validateMoveInput', 'e2', 'e5')).toBe(false);
    expect(emittedPositions).toEqual([null]);

    expect(board.input('validateMoveInput', 'e2', 'e4')).toBe(true);
    expect(emittedPositions).toEqual([null, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR']);

    board.input('moveInputFinished');
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
  });

  it('navigates board history, drops the forward branch after a new move, and reset clears history', async () => {
    const host = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.trim() === label,
      ) as HTMLButtonElement;

    expect(button('Back').disabled).toBe(true);
    expect(button('Forward').disabled).toBe(true);

    board.input('validateMoveInput', 'e2', 'e4');
    board.input('moveInputFinished');
    board.input('validateMoveInput', 'e7', 'e5');
    board.input('moveInputFinished');
    fixture.detectChanges();
    expect(button('Back').disabled).toBe(false);
    expect(button('Forward').disabled).toBe(true);

    button('Back').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(emittedPositions.at(-1)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(button('Forward').disabled).toBe(false);

    button('Forward').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(board.position).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');

    button('Back').click();
    await fixture.whenStable();
    board.input('validateMoveInput', 'c7', 'c5');
    board.input('moveInputFinished');
    fixture.detectChanges();
    expect(board.position).toContain('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR');
    expect(button('Forward').disabled).toBe(true);

    button('Reset').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(button('Back').disabled).toBe(true);
    expect(button('Forward').disabled).toBe(true);
  });

  it('supports left and right history keys on the board without consuming keys from controls', async () => {
    board.input('validateMoveInput', 'e2', 'e4');
    board.input('moveInputFinished');
    board.input('validateMoveInput', 'e7', 'e5');
    board.input('moveInputFinished');

    const host = fixture.nativeElement as HTMLElement;
    const boardElement = host.querySelector<HTMLElement>('.board')!;
    boardElement.focus();
    const backKey = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    boardElement.dispatchEvent(backKey);
    await fixture.whenStable();
    expect(backKey.defaultPrevented).toBe(true);
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR');

    const forwardKey = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    boardElement.dispatchEvent(forwardKey);
    await fixture.whenStable();
    expect(forwardKey.defaultPrevented).toBe(true);
    expect(board.position).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');

    const flipButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Flip board',
    )!;
    const controlKey = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    flipButton.dispatchEvent(controlKey);
    await fixture.whenStable();
    expect(controlKey.defaultPrevented).toBe(false);
    expect(board.position).toContain('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
  });

  it('flips the view without changing the search, and reset preserves the flipped view', async () => {
    board.input('validateMoveInput', 'e2', 'e4');
    const host = fixture.nativeElement as HTMLElement;
    const flipButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Flip board',
    ) as HTMLButtonElement;
    flipButton.click();
    await fixture.whenStable();

    expect(board.orientation).toBe('b');
    expect(emittedPositions).toHaveLength(2);

    const resetButton = Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Reset',
    ) as HTMLButtonElement;
    resetButton.click();
    await fixture.whenStable();

    expect(board.orientation).toBe('b');
    expect(board.position).toContain('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(emittedPositions).toEqual([null, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR', null]);
  });

  it('offers all four legal promotion choices and emits the promoted placement', async () => {
    (fixture.componentInstance as unknown as { game: Chess }).game.load(
      '7k/P7/8/8/8/8/8/7K w - - 0 1',
    );

    expect(board.input('moveInputStarted', 'a7')).toBe(true);
    expect(board.input('validateMoveInput', 'a7', 'a8')).toBe(false);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.promotion-picker button')).toHaveLength(5);

    const queenButton = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.promotion-picker button'),
    ).find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Queen',
    ) as HTMLButtonElement;
    queenButton.click();
    await fixture.whenStable();

    expect(emittedPositions).toEqual([null, 'Q6k/8/8/8/8/8/8/7K']);
    expect(board.position).toContain('Q6k/8/8/8/8/8/8/7K');
  });
});

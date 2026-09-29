import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PawnBoard } from './pawn-board';
import { STARTING_PAWN_PLACEMENT } from '../search/pawn-structure';

interface MockBoard {
  position: string;
  orientation: string;
  input(event: {
    type: string;
    squareFrom?: string;
    squareTo?: string;
    reason?: string;
  }): boolean | void;
}

const chessboardMock = vi.hoisted(() => ({ lastBoard: null as MockBoard | null }));

vi.mock('cm-chessboard', () => {
  class MockChessboard implements MockBoard {
    position: string;
    orientation: string;
    private handler?: (event: {
      type: string;
      squareFrom?: string;
      squareTo?: string;
      reason?: string;
    }) => boolean | void;

    constructor(_context: HTMLElement, props: { position: string; orientation: string }) {
      this.position = props.position;
      this.orientation = props.orientation;
      chessboardMock.lastBoard = this;
    }

    enableMoveInput(handler: NonNullable<MockChessboard['handler']>): void {
      this.handler = handler;
    }

    input(event: {
      type: string;
      squareFrom?: string;
      squareTo?: string;
      reason?: string;
    }): boolean | void {
      return this.handler?.(event);
    }

    setPosition(position: string): Promise<void> {
      this.position = position;
      return Promise.resolve();
    }

    setOrientation(orientation: string): Promise<void> {
      this.orientation = orientation;
      return Promise.resolve();
    }

    cancelMoveInput(): void {}
    destroy(): void {}
  }

  return {
    BORDER_TYPE: { frame: 'frame' },
    Chessboard: MockChessboard,
    COLOR: { black: 'b', white: 'w' },
    INPUT_EVENT_TYPE: {
      moveInputStarted: 'moveInputStarted',
      validateMoveInput: 'validateMoveInput',
      moveInputFinished: 'moveInputFinished',
      moveInputCanceled: 'moveInputCanceled',
    },
    PIECES_FILE_TYPE: { svgSprite: 'svgSprite' },
  };
});

describe('PawnBoard', () => {
  let fixture: ComponentFixture<PawnBoard>;
  let board: MockBoard;
  let host: HTMLElement;
  let positions: Array<string | null>;

  function square(name: string): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-square', name);
    host.querySelector('.board')!.append(element);
    return element;
  }

  beforeEach(async () => {
    chessboardMock.lastBoard = null;
    positions = [];
    await TestBed.configureTestingModule({ imports: [PawnBoard] }).compileComponents();
    fixture = TestBed.createComponent(PawnBoard);
    fixture.componentInstance.positionChange.subscribe((position) => positions.push(position));
    await fixture.whenStable();
    host = fixture.nativeElement as HTMLElement;
    board = chessboardMock.lastBoard!;
  });

  afterEach(() => fixture.destroy());

  it('starts with both pawn ranks and waits for an edit before searching', () => {
    expect(board.position).toBe(STARTING_PAWN_PLACEMENT);
    expect(positions).toEqual([null]);
  });

  it('changes search scope without changing the pawns or placement color', () => {
    const scopes: string[] = [];
    fixture.componentInstance.scopeChange.subscribe((scope) => scopes.push(scope));
    const whiteOnly = host.querySelector<HTMLInputElement>('input[value="white"]');
    expect(whiteOnly).not.toBeNull();
    whiteOnly!.click();
    expect(scopes).toEqual(['white']);
    expect(board.position).toBe(STARTING_PAWN_PLACEMENT);
    expect(positions).toEqual([null]);
    square('e4').click();
    expect(board.position).toBe('8/pppppppp/8/8/4P3/8/PPPPPPPP/8');
  });

  it('places repeatable selected-color pawns by clicking squares', () => {
    host.querySelector<HTMLButtonElement>('[aria-label="Select black pawn"]')!.click();
    square('e4').click();
    square('f4').click();
    expect(board.position).toBe('8/pppppppp/8/8/4pp2/8/PPPPPPPP/8');
    expect(positions.at(-1)).toBe(board.position);
    square('a2').click();
    expect(board.position).toBe('8/pppppppp/8/8/4pp2/8/pPPPPPPP/8');
  });

  it('moves without chess rules and removes with right-click or off-board drag', async () => {
    expect(board.input({ type: 'moveInputStarted', squareFrom: 'a2' })).toBe(true);
    expect(board.input({ type: 'validateMoveInput', squareFrom: 'a2', squareTo: 'a8' })).toBe(true);
    board.input({ type: 'moveInputFinished' });
    expect(board.position).toBe('P7/pppppppp/8/8/8/8/1PPPPPPP/8');

    square('a8').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(board.position).toBe('8/pppppppp/8/8/8/8/1PPPPPPP/8');

    square('b2').dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }),
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 40, clientY: 40 }),
    );
    board.input({ type: 'moveInputCanceled', squareFrom: 'b2', reason: 'movedOutOfBoard' });
    expect(board.position).toBe('8/pppppppp/8/8/8/8/2PPPPPP/8');
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await fixture.whenStable();
  });

  it('reset restores the starting pawns and clears the query', () => {
    square('e4').click();
    host.querySelector<HTMLButtonElement>('.board-controls button:first-child')!.click();
    expect(board.position).toBe(STARTING_PAWN_PLACEMENT);
    expect(positions.at(-1)).toBeNull();
  });
});

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Chess, type Square } from 'chess.js';
import {
  BORDER_TYPE,
  Chessboard,
  COLOR,
  FEN,
  INPUT_EVENT_TYPE,
  PIECES_FILE_TYPE,
  type MoveInputEvent,
} from 'cm-chessboard';

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

interface PendingPromotion {
  from: Square;
  to: Square;
}

const PROMOTION_OPTIONS: ReadonlyArray<{ piece: PromotionPiece; label: string }> = [
  { piece: 'q', label: 'Queen' },
  { piece: 'r', label: 'Rook' },
  { piece: 'b', label: 'Bishop' },
  { piece: 'n', label: 'Knight' },
];

@Component({
  selector: 'app-search-board',
  standalone: true,
  templateUrl: './search-board.html',
  styleUrl: './search-board.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoard implements AfterViewInit, OnDestroy {
  readonly positionChange = output<string | null>();

  protected readonly promotionOptions = PROMOTION_OPTIONS;
  protected readonly pendingPromotion = signal<PendingPromotion | null>(null);
  protected readonly blackAtBottom = signal(false);
  protected readonly turnDescription = signal('White to move');
  protected readonly boardLabel = computed(
    () =>
      `Chessboard. ${this.turnDescription()}. ${this.blackAtBottom() ? 'Black' : 'White'} is at the bottom.`,
  );

  private readonly document = inject(DOCUMENT);
  private readonly boardHost = viewChild.required<ElementRef<HTMLDivElement>>('boardHost');
  private readonly game = new Chess();
  private readonly positionHistory = signal<readonly string[]>([FEN.start]);
  private readonly historyIndex = signal(0);
  private board: Chessboard | null = null;
  private moveWasApplied = false;

  protected readonly canGoBack = computed(() => this.historyIndex() > 0);
  protected readonly canGoForward = computed(
    () => this.historyIndex() < this.positionHistory().length - 1,
  );

  ngAfterViewInit(): void {
    this.board = new Chessboard(this.boardHost().nativeElement, {
      position: FEN.start,
      orientation: COLOR.white,
      responsive: true,
      assetsUrl: new URL('assets/cm-chessboard/', this.document.baseURI).href,
      style: {
        cssClass: 'green',
        showCoordinates: true,
        borderType: BORDER_TYPE.frame,
        aspectRatio: 1,
        pieces: {
          type: PIECES_FILE_TYPE.svgSprite,
          file: 'pieces/standard.svg',
          tileSize: 40,
        },
      },
    });

    this.board.enableMoveInput((event) => this.handleMoveInput(event));
    this.positionChange.emit(null);
  }

  ngOnDestroy(): void {
    this.board?.destroy();
    this.board = null;
  }

  protected reset(): void {
    this.game.reset();
    this.positionHistory.set([FEN.start]);
    this.historyIndex.set(0);
    this.pendingPromotion.set(null);
    this.moveWasApplied = false;
    this.turnDescription.set('White to move');
    this.board?.setPosition(FEN.start, false);
    this.positionChange.emit(null);
  }

  protected flip(): void {
    const blackAtBottom = !this.blackAtBottom();
    this.blackAtBottom.set(blackAtBottom);
    this.board?.setOrientation(blackAtBottom ? COLOR.black : COLOR.white);
  }

  protected goBack(): void {
    this.restoreHistoryPosition(this.historyIndex() - 1);
  }

  protected goForward(): void {
    this.restoreHistoryPosition(this.historyIndex() + 1);
  }

  protected handleBoardKeydown(event: KeyboardEvent): void {
    const target = event.target;
    const boardHost = this.boardHost().nativeElement;
    if (!(target instanceof Element) || !boardHost.contains(target)) return;
    if (
      target.closest(
        'button, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="textbox"]',
      )
    ) {
      return;
    }

    const navigated =
      event.key === 'ArrowLeft'
        ? this.restoreHistoryPosition(this.historyIndex() - 1)
        : event.key === 'ArrowRight'
          ? this.restoreHistoryPosition(this.historyIndex() + 1)
          : false;
    if (navigated) event.preventDefault();
  }

  protected promote(piece: PromotionPiece): void {
    const pending = this.pendingPromotion();
    if (!pending) return;

    try {
      this.game.move({ from: pending.from, to: pending.to, promotion: piece });
      this.pendingPromotion.set(null);
      this.recordCurrentPosition();
      this.updateAfterMove();
      this.board?.setPosition(this.game.fen(), false);
    } catch {
      this.pendingPromotion.set(null);
      this.board?.setPosition(this.game.fen(), false);
    }
  }

  protected cancelPromotion(): void {
    this.pendingPromotion.set(null);
  }

  private handleMoveInput(event: MoveInputEvent): boolean | void {
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      if (this.pendingPromotion()) return false;
      const from = event.squareFrom;
      return !!from && this.game.get(from as Square)?.color === this.game.turn();
    }

    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      if (this.pendingPromotion()) return false;

      const from = event.squareFrom;
      const to = event.squareTo;
      if (!from || !to) return false;

      const legalMove = this.game
        .moves({ square: from as Square, verbose: true })
        .find((move) => move.to === to);
      if (!legalMove) return false;

      if (legalMove.promotion) {
        this.pendingPromotion.set({ from: from as Square, to: to as Square });
        return false;
      }

      try {
        this.game.move({ from: from as Square, to: to as Square });
      } catch {
        return false;
      }

      this.moveWasApplied = true;
      this.recordCurrentPosition();
      this.updateAfterMove();
      return true;
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputFinished && this.moveWasApplied) {
      this.moveWasApplied = false;
      this.board?.setPosition(this.game.fen(), false);
    }
  }

  private updateAfterMove(): void {
    this.turnDescription.set(this.game.turn() === 'w' ? 'White to move' : 'Black to move');
    const piecePlacement = this.game.fen().split(' ')[0];
    this.positionChange.emit(piecePlacement ?? null);
  }

  private recordCurrentPosition(): void {
    const positions = this.positionHistory().slice(0, this.historyIndex() + 1);
    positions.push(this.game.fen());
    this.positionHistory.set(positions);
    this.historyIndex.set(positions.length - 1);
  }

  private restoreHistoryPosition(index: number): boolean {
    const fen = this.positionHistory()[index];
    if (fen === undefined) return false;

    try {
      this.game.load(fen);
    } catch {
      return false;
    }

    this.historyIndex.set(index);
    this.pendingPromotion.set(null);
    this.moveWasApplied = false;
    this.turnDescription.set(this.game.turn() === 'w' ? 'White to move' : 'Black to move');
    this.board?.setPosition(fen, false);
    const piecePlacement = fen.split(' ')[0];
    this.positionChange.emit(index === 0 && fen === FEN.start ? null : (piecePlacement ?? null));
    return true;
  }
}

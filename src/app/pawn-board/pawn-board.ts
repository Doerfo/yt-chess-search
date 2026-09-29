import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  BORDER_TYPE,
  Chessboard,
  COLOR,
  INPUT_EVENT_TYPE,
  PIECES_FILE_TYPE,
  type MoveInputEvent,
} from 'cm-chessboard';
import { STARTING_PAWN_PLACEMENT, type PawnSearchScope } from '../search/pawn-structure';
import type { BoardOrientation } from '../search/position-match';

type Pawn = 'P' | 'p';
type PawnColor = 'w' | 'b';

interface DragOrigin {
  square: string;
  x: number;
  y: number;
  dragged: boolean;
}

function startingPawns(): Map<string, Pawn> {
  const pawns = new Map<string, Pawn>();
  for (const file of 'abcdefgh') {
    pawns.set(`${file}2`, 'P');
    pawns.set(`${file}7`, 'p');
  }
  return pawns;
}

function placementFromPawns(pawns: ReadonlyMap<string, Pawn>): string {
  const ranks: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const file of 'abcdefgh') {
      const pawn = pawns.get(`${file}${rank}`);
      if (pawn) {
        if (empty) row += String(empty);
        row += pawn;
        empty = 0;
      } else {
        empty++;
      }
    }
    if (empty) row += String(empty);
    ranks.push(row);
  }
  return ranks.join('/');
}

@Component({
  selector: 'app-pawn-board',
  standalone: true,
  templateUrl: './pawn-board.html',
  styleUrl: './pawn-board.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PawnBoard implements AfterViewInit, OnDestroy {
  readonly positionChange = output<string | null>();
  readonly orientationChange = output<BoardOrientation>();
  readonly scopeChange = output<PawnSearchScope>();

  protected readonly selectedColor = signal<PawnColor>('w');
  protected readonly selectedScope = signal<PawnSearchScope>('both');
  protected readonly blackAtBottom = signal(false);
  protected readonly boardLabel = computed(
    () =>
      `Pawn structure board. ${this.blackAtBottom() ? 'Black' : 'White'} is at the bottom. Click a square to place the selected pawn. Drag a pawn to move it.`,
  );
  protected readonly spriteUrl = new URL(
    'assets/cm-chessboard/pieces/standard.svg',
    inject(DOCUMENT).baseURI,
  ).href;

  private readonly document = inject(DOCUMENT);
  private readonly boardHost = viewChild.required<ElementRef<HTMLDivElement>>('boardHost');
  private pawns = startingPawns();
  private board: Chessboard | null = null;
  private dragOrigin: DragOrigin | null = null;
  private moveWasApplied = false;
  private suppressClick = false;
  private clearClickTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.board = new Chessboard(this.boardHost().nativeElement, {
      position: STARTING_PAWN_PLACEMENT,
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
    this.orientationChange.emit('white_bottom');
    this.positionChange.emit(null);
  }

  ngOnDestroy(): void {
    if (this.clearClickTimer) clearTimeout(this.clearClickTimer);
    this.board?.destroy();
    this.board = null;
  }

  protected selectColor(color: PawnColor): void {
    this.selectedColor.set(color);
    this.board?.cancelMoveInput();
  }

  protected selectScope(scope: PawnSearchScope): void {
    if (this.selectedScope() === scope) return;
    this.selectedScope.set(scope);
    this.scopeChange.emit(scope);
  }

  protected addPawnOnClick(event: MouseEvent): void {
    if (this.suppressClick) return;
    const square = this.squareFromTarget(event.target);
    if (!square) return;
    this.board?.cancelMoveInput();
    const pawn = this.selectedColor() === 'w' ? 'P' : 'p';
    if (this.pawns.get(square) === pawn) return;
    this.pawns.set(square, pawn);
    this.commit();
  }

  protected removePawnOnRightClick(event: MouseEvent): void {
    event.preventDefault();
    const square = this.squareFromTarget(event.target);
    if (!square) return;
    this.board?.cancelMoveInput();
    this.removePawn(square);
  }

  protected startMouseTracking(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.startDragTracking(event.target, event.clientX, event.clientY);
  }

  protected startTouchTracking(event: TouchEvent): void {
    const touch = event.touches[0];
    if (touch) this.startDragTracking(event.target, touch.clientX, touch.clientY);
  }

  @HostListener('document:mousemove', ['$event'])
  protected trackMouse(event: MouseEvent): void {
    this.trackDrag(event.clientX, event.clientY);
  }

  @HostListener('document:touchmove', ['$event'])
  protected trackTouch(event: TouchEvent): void {
    const touch = event.touches[0];
    if (touch) this.trackDrag(touch.clientX, touch.clientY);
  }

  @HostListener('document:mouseup', ['$event'])
  protected finishMouseTracking(event: MouseEvent): void {
    this.finishDragTracking(this.squareFromTarget(event.target) === null);
  }

  @HostListener('document:touchend', ['$event'])
  protected finishTouchTracking(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const target = touch ? this.document.elementFromPoint(touch.clientX, touch.clientY) : null;
    this.finishDragTracking(this.squareFromTarget(target) === null);
  }

  @HostListener('document:touchcancel')
  protected cancelTouchTracking(): void {
    this.dragOrigin = null;
  }

  protected reset(): void {
    this.board?.cancelMoveInput();
    this.pawns = startingPawns();
    this.board?.setPosition(STARTING_PAWN_PLACEMENT, false);
    this.positionChange.emit(null);
  }

  protected flip(): void {
    const blackAtBottom = !this.blackAtBottom();
    this.blackAtBottom.set(blackAtBottom);
    this.board?.setOrientation(blackAtBottom ? COLOR.black : COLOR.white);
    this.orientationChange.emit(blackAtBottom ? 'black_bottom' : 'white_bottom');
  }

  private handleMoveInput(event: MoveInputEvent): boolean | void {
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      return !!event.squareFrom && this.pawns.has(event.squareFrom);
    }
    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      const from = event.squareFrom;
      const to = event.squareTo;
      const pawn = from ? this.pawns.get(from) : null;
      if (!from || !to || from === to || !pawn) return false;
      this.pawns.delete(from);
      this.pawns.set(to, pawn);
      this.moveWasApplied = true;
      this.positionChange.emit(placementFromPawns(this.pawns));
      return true;
    }
    if (event.type === INPUT_EVENT_TYPE.moveInputFinished && this.moveWasApplied) {
      this.moveWasApplied = false;
      this.board?.setPosition(placementFromPawns(this.pawns), false);
    }
    if (
      event.type === INPUT_EVENT_TYPE.moveInputCanceled &&
      event.reason === 'movedOutOfBoard' &&
      this.dragOrigin?.dragged &&
      event.squareFrom === this.dragOrigin.square
    ) {
      this.removePawn(event.squareFrom);
    }
  }

  private startDragTracking(target: EventTarget | null, x: number, y: number): void {
    const square = this.squareFromTarget(target);
    this.dragOrigin = square && this.pawns.has(square) ? { square, x, y, dragged: false } : null;
  }

  private trackDrag(x: number, y: number): void {
    const origin = this.dragOrigin;
    if (origin && (Math.abs(x - origin.x) > 4 || Math.abs(y - origin.y) > 4)) {
      origin.dragged = true;
    }
  }

  private finishDragTracking(offBoard: boolean): void {
    const origin = this.dragOrigin;
    if (!origin) return;
    if (origin.dragged) {
      this.suppressClick = true;
      if (this.clearClickTimer) clearTimeout(this.clearClickTimer);
      this.clearClickTimer = setTimeout(() => (this.suppressClick = false), 0);
    }
    queueMicrotask(() => {
      if (origin.dragged && offBoard) this.removePawn(origin.square);
      if (this.dragOrigin === origin) this.dragOrigin = null;
    });
  }

  private removePawn(square: string): void {
    if (!this.pawns.delete(square)) return;
    this.commit();
  }

  private commit(): void {
    const placement = placementFromPawns(this.pawns);
    this.board?.setPosition(placement, false);
    this.positionChange.emit(placement);
  }

  private squareFromTarget(target: EventTarget | null): string | null {
    if (!(target instanceof Element) || !this.boardHost().nativeElement.contains(target)) {
      return null;
    }
    return target.closest('[data-square]')?.getAttribute('data-square') ?? null;
  }
}

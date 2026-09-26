declare module 'cm-chessboard' {
  export const BORDER_TYPE: {
    readonly frame: string;
    readonly none: string;
    readonly thin: string;
  };

  export const COLOR: {
    readonly black: string;
    readonly white: string;
  };

  export const FEN: {
    readonly empty: string;
    readonly start: string;
  };

  export const INPUT_EVENT_TYPE: {
    readonly moveInputCanceled: string;
    readonly moveInputFinished: string;
    readonly moveInputStarted: string;
    readonly movingOverSquare: string;
    readonly validateMoveInput: string;
  };

  export const PIECES_FILE_TYPE: {
    readonly svgSprite: string;
  };

  export interface MoveInputEvent {
    type: string;
    squareFrom?: string;
    squareTo?: string;
  }

  export class Chessboard {
    constructor(context: HTMLElement, props?: {
      position?: string;
      orientation?: string;
      responsive?: boolean;
      assetsUrl?: string;
      style?: {
        cssClass?: string;
        showCoordinates?: boolean;
        borderType?: string;
        aspectRatio?: number;
        pieces?: {
          type?: string;
          file?: string;
          tileSize?: number;
        };
      };
    });
    enableMoveInput(handler: (event: MoveInputEvent) => boolean | void): void;
    setPosition(fen: string, animated?: boolean): Promise<void>;
    setOrientation(color: string, animated?: boolean): Promise<void>;
    destroy(): void;
  }
}

export interface PuzzleHandler<T = any> {
  id: string;
  label: string;
  render: (id: number, puzzle: T) => string;
  check: (id: number, puzzle: T) => boolean;
}

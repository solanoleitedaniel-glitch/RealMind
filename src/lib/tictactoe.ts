export type Mark = "X" | "O";
export type Cell = Mark | null;
export type Board = Cell[];

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => null);
}

export function winnerOf(board: Board): Mark | "draw" | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

export function winningLine(board: Board): number[] {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return [...line];
  }
  return [];
}

function empties(board: Board) {
  return board.flatMap((cell, index) => (cell ? [] : [index]));
}

export function easyMove(board: Board, ai: Mark): number {
  const open = empties(board);
  const opponent: Mark = ai === "X" ? "O" : "X";
  for (const index of open) {
    const next = board.slice();
    next[index] = ai;
    if (winnerOf(next) === ai) return index;
  }
  if (Math.random() < 0.45) {
    for (const index of open) {
      const next = board.slice();
      next[index] = opponent;
      if (winnerOf(next) === opponent) return index;
    }
  }
  if (board[4] === null && Math.random() < 0.35) return 4;
  return open[Math.floor(Math.random() * open.length)] ?? 0;
}

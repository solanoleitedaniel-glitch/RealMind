export type Side = "light" | "dark";
export type Kind = "man" | "king";
export type Cell = { side: Side; kind: Kind } | null;
export type Board = Cell[][];
export type Pos = { r: number; c: number };

export type Move = {
  from: Pos;
  to: Pos;
  captures: Pos[];
  kind: Kind;
};

const DIRS: Pos[] = [
  { r: -1, c: -1 },
  { r: -1, c: 1 },
  { r: 1, c: -1 },
  { r: 1, c: 1 },
];

function inside(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function key(pos: Pos) {
  return `${pos.r},${pos.c}`;
}

export function samePos(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function initialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null as Cell),
  );
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r < 3) board[r][c] = { side: "dark", kind: "man" };
      else if (r > 4) board[r][c] = { side: "light", kind: "man" };
    }
  }
  return board;
}

function other(side: Side): Side {
  return side === "light" ? "dark" : "light";
}

function promotes(side: Side, kind: Kind, land: Pos): Kind {
  if (kind === "king") return "king";
  if (side === "light" && land.r === 0) return "king";
  if (side === "dark" && land.r === 7) return "king";
  return "man";
}

type Option = { enemy: Pos; land: Pos };

function manOptions(
  board: Board,
  r: number,
  c: number,
  side: Side,
  captured: Set<string>,
): Option[] {
  const options: Option[] = [];
  for (const dir of DIRS) {
    const er = r + dir.r;
    const ec = c + dir.c;
    const lr = r + 2 * dir.r;
    const lc = c + 2 * dir.c;
    if (!inside(er, ec) || !inside(lr, lc)) continue;
    const enemy = board[er][ec];
    if (!enemy || enemy.side !== other(side)) continue;
    if (captured.has(key({ r: er, c: ec }))) continue;
    if (board[lr][lc]) continue;
    options.push({ enemy: { r: er, c: ec }, land: { r: lr, c: lc } });
  }
  return options;
}

function kingOptions(
  board: Board,
  r: number,
  c: number,
  side: Side,
  captured: Set<string>,
): Option[] {
  const options: Option[] = [];
  for (const dir of DIRS) {
    let rr = r + dir.r;
    let cc = c + dir.c;
    while (inside(rr, cc) && !board[rr][cc]) {
      rr += dir.r;
      cc += dir.c;
    }
    if (!inside(rr, cc)) continue;
    const enemy = board[rr][cc];
    if (!enemy || enemy.side !== other(side)) continue;
    if (captured.has(key({ r: rr, c: cc }))) continue;
    const enemyPos = { r: rr, c: cc };
    let lr = rr + dir.r;
    let lc = cc + dir.c;
    while (inside(lr, lc) && !board[lr][lc]) {
      options.push({ enemy: enemyPos, land: { r: lr, c: lc } });
      lr += dir.r;
      lc += dir.c;
    }
  }
  return options;
}

function walk(
  board: Board,
  r: number,
  c: number,
  captured: Set<string>,
  origin: Pos,
  acc: Pos[],
): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const options =
    piece.kind === "king"
      ? kingOptions(board, r, c, piece.side, captured)
      : manOptions(board, r, c, piece.side, captured);
  const found: Move[] = [];
  for (const option of options) {
    const next = cloneBoard(board);
    next[r][c] = null;
    next[option.enemy.r][option.enemy.c] = null;
    const kind = promotes(piece.side, piece.kind, option.land);
    next[option.land.r][option.land.c] = { side: piece.side, kind };
    const capSet = new Set(captured);
    capSet.add(key(option.enemy));
    const caps = [...acc, option.enemy];
    const deeper = walk(next, option.land.r, option.land.c, capSet, origin, caps);
    if (deeper.length === 0) {
      found.push({ from: origin, to: option.land, captures: caps, kind });
    } else {
      found.push(...deeper);
    }
  }
  return found;
}

function quietMoves(board: Board, r: number, c: number): Move[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: Move[] = [];
  if (piece.kind === "king") {
    for (const dir of DIRS) {
      let rr = r + dir.r;
      let cc = c + dir.c;
      while (inside(rr, cc) && !board[rr][cc]) {
        moves.push({
          from: { r, c },
          to: { r: rr, c: cc },
          captures: [],
          kind: "king",
        });
        rr += dir.r;
        cc += dir.c;
      }
    }
    return moves;
  }
  const dirs = piece.side === "light" ? [DIRS[0], DIRS[1]] : [DIRS[2], DIRS[3]];
  for (const dir of dirs) {
    const rr = r + dir.r;
    const cc = c + dir.c;
    if (!inside(rr, cc) || board[rr][cc]) continue;
    moves.push({
      from: { r, c },
      to: { r: rr, c: cc },
      captures: [],
      kind: promotes(piece.side, "man", { r: rr, c: cc }),
    });
  }
  return moves;
}

export function legalMoves(board: Board, side: Side): Move[] {
  const captures: Move[] = [];
  const quiet: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.side !== side) continue;
      captures.push(...walk(board, r, c, new Set(), { r, c }, []));
      quiet.push(...quietMoves(board, r, c));
    }
  }
  return captures.length > 0 ? captures : quiet;
}

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];
  if (!piece) return next;
  next[move.from.r][move.from.c] = null;
  for (const cap of move.captures) next[cap.r][cap.c] = null;
  next[move.to.r][move.to.c] = { side: piece.side, kind: move.kind };
  return next;
}

export function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null as Cell));
}

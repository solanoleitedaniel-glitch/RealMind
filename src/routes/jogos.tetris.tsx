import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QuietButton, Screen } from "@/components/screen";

export const Route = createFileRoute("/jogos/tetris")({ component: TetrisPage });

const W = 10;
const H = 20;

type Cell = readonly [number, number];
type Shape = readonly Cell[];

const KINDS: Shape[][] = [
  [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  [[[1, 0], [2, 0], [1, 1], [2, 1]]],
  [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
  [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
  ],
  [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
  ],
];

const FILLS = ["", "#cbb6f0", "#8fceb0", "#8b6fc4", "#d7c4b0", "#9bb7e0", "#e0b7d4", "#b7c8a8"];

type Live = { kind: number; rot: number; x: number; y: number };

function emptyBoard() {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
}

function cellsOf(live: Live) {
  const shape = KINDS[live.kind]?.[live.rot % (KINDS[live.kind]?.length || 1)] ?? [];
  return shape.map(([x, y]) => [x + live.x, y + live.y] as const);
}

function fits(board: number[][], live: Live) {
  return cellsOf(live).every(([x, y]) => x >= 0 && x < W && y < H && (y < 0 || board[y]?.[x] === 0));
}

function spawn(kind: number): Live {
  return { kind, rot: 0, x: 3, y: 0 };
}

function TetrisPage() {
  const boardRef = useRef(emptyBoard());
  const liveRef = useRef<Live>(spawn(0));
  const overRef = useRef(false);
  const pausedRef = useRef(false);
  const [view, setView] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const paint = () => setView((value) => value + 1);

  function placeNew(kind = Math.floor(Math.random() * KINDS.length)) {
    const next = spawn(kind);
    if (!fits(boardRef.current, next)) {
      overRef.current = true;
      setOver(true);
      return;
    }
    liveRef.current = next;
  }

  function lock() {
    const board = boardRef.current.map((row) => row.slice());
    const kind = liveRef.current.kind + 1;
    for (const [x, y] of cellsOf(liveRef.current)) {
      if (y >= 0 && y < H && x >= 0 && x < W) board[y][x] = kind;
    }
    const kept = board.filter((row) => row.some((cell) => cell === 0));
    while (kept.length < H) kept.unshift(Array.from({ length: W }, () => 0));
    boardRef.current = kept;
    placeNew();
  }

  function move(dx: number, dy: number) {
    if (overRef.current || pausedRef.current) return;
    const next = { ...liveRef.current, x: liveRef.current.x + dx, y: liveRef.current.y + dy };
    if (fits(boardRef.current, next)) {
      liveRef.current = next;
      paint();
      return;
    }
    if (dy > 0) lock();
    paint();
  }

  function rotate() {
    if (overRef.current || pausedRef.current) return;
    const kind = liveRef.current.kind;
    const rot = (liveRef.current.rot + 1) % KINDS[kind].length;
    const kicked = [0, -1, 1, -2, 2]
      .map((dx) => ({ ...liveRef.current, rot, x: liveRef.current.x + dx }))
      .find((candidate) => fits(boardRef.current, candidate));
    if (kicked) liveRef.current = kicked;
    paint();
  }

  function restart() {
    boardRef.current = emptyBoard();
    overRef.current = false;
    pausedRef.current = false;
    setOver(false);
    setPaused(false);
    placeNew();
    paint();
  }

  useEffect(() => {
    placeNew();
    paint();
    const timer = window.setInterval(() => move(0, 1), 900);
    return () => window.clearInterval(timer);
    // The loop always reads the latest board through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move( -1, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        move(0, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        rotate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = boardRef.current.map((row) => row.slice());
  if (!over) {
    for (const [x, y] of cellsOf(liveRef.current)) {
      if (y >= 0 && y < H && x >= 0 && x < W) shown[y][x] = liveRef.current.kind + 1;
    }
  }

  return (
    <Screen backHref="/jogos" backLabel="Jogos">
      <h1 className="font-serif text-3xl leading-tight font-medium">Tétris calmo</h1>
      <p className="mt-3 mb-5 text-base leading-relaxed text-muted">
        As peças descem devagar. Não há pontuação nem ranking. Pode pausar quando quiser.
      </p>
      <div
        className="mx-auto grid w-full max-w-56 grid-cols-10 gap-px rounded-card border border-line bg-line p-1"
        aria-label="Tabuleiro"
        data-frame={view}
      >
        {shown.flat().map((cell, index) => (
          <span
            key={index}
            className="aspect-square rounded-[2px]"
            style={{ background: cell === 0 ? "var(--color-bg)" : FILLS[cell] }}
          />
        ))}
      </div>
      {over && (
        <p className="mt-4 text-base leading-relaxed">
          As peças chegaram ao topo. Pode começar de novo, sem pressa.
        </p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuietButton onClick={() => move(-1, 0)}>Esquerda</QuietButton>
        <QuietButton onClick={rotate}>Girar</QuietButton>
        <QuietButton onClick={() => move(1, 0)}>Direita</QuietButton>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <QuietButton onClick={() => move(0, 1)}>Descer um passo</QuietButton>
        <QuietButton
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
          }}
        >
          {paused ? "Continuar" : "Pausar"}
        </QuietButton>
        <QuietButton onClick={restart}>Começar de novo</QuietButton>
      </div>
    </Screen>
  );
}

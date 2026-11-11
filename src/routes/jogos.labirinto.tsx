import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { PrimaryButton, QuietButton, Screen } from "@/components/screen";

export const Route = createFileRoute("/jogos/labirinto")({ component: MazePage });

type Walls = { n: boolean; e: boolean; s: boolean; w: boolean };
type Point = { x: number; y: number };

const LEVEL_KEY = "realmind-maze-level";

function sizeFor(level: number) {
  return {
    cols: Math.min(5 + level * 2, 17),
    rows: Math.min(7 + level * 2, 25),
  };
}

function carve(cols: number, rows: number): Walls[][] {
  const grid: Walls[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true })),
  );
  const seen = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const dirs = [
    { dx: 0, dy: -1, wall: "n", back: "s" },
    { dx: 1, dy: 0, wall: "e", back: "w" },
    { dx: 0, dy: 1, wall: "s", back: "n" },
    { dx: -1, dy: 0, wall: "w", back: "e" },
  ] as const;
  function walk(x: number, y: number) {
    seen[y][x] = true;
    const order = [...dirs].sort(() => Math.random() - 0.5);
    for (const dir of order) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (ny < 0 || nx < 0 || ny >= rows || nx >= cols || seen[ny][nx]) continue;
      grid[y][x][dir.wall] = false;
      grid[ny][nx][dir.back] = false;
      walk(nx, ny);
    }
  }
  walk(0, 0);
  return grid;
}

function openBetween(grid: Walls[][], from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const cell = grid[from.y]?.[from.x];
  if (!cell) return false;
  if (dx === 1) return !cell.e;
  if (dx === -1) return !cell.w;
  if (dy === 1) return !cell.s;
  return !cell.n;
}

function readLevel() {
  try {
    const value = Number(localStorage.getItem(LEVEL_KEY));
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
  } catch {
    return 1;
  }
}

function drawMaze(
  canvas: HTMLCanvasElement,
  grid: Walls[][],
  path: Point[],
) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!cols || !rows) return;
  const width = canvas.clientWidth;
  if (width === 0) return;
  const height = Math.round(width * (rows / cols));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cell = width / cols;
  ctx.fillStyle = "#1c1528";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#cbb6f0";
  ctx.lineWidth = Math.max(6, cell * 0.28);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  path.forEach((point, index) => {
    const px = (point.x + 0.5) * cell;
    const py = (point.y + 0.5) * cell;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.strokeStyle = "#8d82a3";
  ctx.lineWidth = 2;
  ctx.lineCap = "square";
  ctx.beginPath();
  grid.forEach((row, y) => {
    row.forEach((walls, x) => {
      const x0 = x * cell;
      const y0 = y * cell;
      if (walls.n) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + cell, y0);
      }
      if (walls.w) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 + cell);
      }
      if (x === cols - 1 && walls.e) {
        ctx.moveTo(x0 + cell, y0);
        ctx.lineTo(x0 + cell, y0 + cell);
      }
      if (y === rows - 1 && walls.s) {
        ctx.moveTo(x0, y0 + cell);
        ctx.lineTo(x0 + cell, y0 + cell);
      }
    });
  });
  ctx.stroke();
  ctx.fillStyle = "#8fceb0";
  ctx.beginPath();
  ctx.arc(cell * 0.5, cell * 0.5, Math.max(4, cell * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8fceb0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc((cols - 0.5) * cell, (rows - 0.5) * cell, Math.max(6, cell * 0.22), 0, Math.PI * 2);
  ctx.stroke();
}

function MazePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Walls[][]>([]);
  const pathRef = useRef<Point[]>([{ x: 0, y: 0 }]);
  const [level, setLevel] = useState(1);
  const [layout, setLayout] = useState(0);
  const [paint, setPaint] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLevel(readLevel());
  }, []);

  useEffect(() => {
    const { cols, rows } = sizeFor(level);
    gridRef.current = carve(cols, rows);
    pathRef.current = [{ x: 0, y: 0 }];
    setDone(false);
    setPaint((value) => value + 1);
  }, [level, layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMaze(canvas, gridRef.current, pathRef.current);
  }, [paint, done, level, layout]);

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>): Point | null {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || grid.length === 0 || !grid[0]) return null;
    const rect = canvas.getBoundingClientRect();
    const cols = grid[0].length;
    const rows = grid.length;
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }

  function follow(point: Point) {
    if (done) return;
    const path = pathRef.current;
    const last = path[path.length - 1];
    if (!last || (last.x === point.x && last.y === point.y)) return;
    const prev = path[path.length - 2];
    if (prev && prev.x === point.x && prev.y === point.y) {
      path.pop();
      setPaint((value) => value + 1);
      return;
    }
    if (!openBetween(gridRef.current, last, point)) return;
    path.push(point);
    const cols = gridRef.current[0]?.length ?? 1;
    const rows = gridRef.current.length;
    if (point.x === cols - 1 && point.y === rows - 1) setDone(true);
    setPaint((value) => value + 1);
  }

  function saveLevel(next: number) {
    setLevel(next);
    try {
      localStorage.setItem(LEVEL_KEY, String(next));
    } catch {
      /* the path still changes on this screen */
    }
  }

  return (
    <Screen backHref="/jogos" backLabel="Jogos">
      <h1 className="font-serif text-3xl leading-tight font-medium">Labirinto</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Apoie o dedo no ponto verde e risque até o círculo. O traço só anda pelo caminho aberto.
        Caminho {level}.
      </p>
      <canvas
        ref={canvasRef}
        className="mt-5 w-full touch-none rounded-card border border-line"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFromEvent(event);
          if (point) follow(point);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === "mouse") return;
          const point = pointFromEvent(event);
          if (point) follow(point);
        }}
      />
      {done && (
        <p className="mt-4 text-base leading-relaxed">Você chegou ao fim deste caminho.</p>
      )}
      <div className="mt-4 flex flex-col gap-3">
        {done && (
          <PrimaryButton
            onClick={() => {
              pathRef.current = [{ x: 0, y: 0 }];
              saveLevel(level + 1);
            }}
          >
            Próximo caminho
          </PrimaryButton>
        )}
        <QuietButton
          onClick={() => {
            pathRef.current = [{ x: 0, y: 0 }];
            setDone(false);
            setLayout((value) => value + 1);
          }}
        >
          Outro desenho desta fase
        </QuietButton>
        {level > 1 && (
          <QuietButton
            onClick={() => {
              pathRef.current = [{ x: 0, y: 0 }];
              saveLevel(level - 1);
            }}
          >
            Voltar uma fase
          </QuietButton>
        )}
      </div>
    </Screen>
  );
}

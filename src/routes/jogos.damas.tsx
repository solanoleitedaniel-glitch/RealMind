import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuietButton, Screen } from "@/components/screen";
import {
  applyMove,
  initialBoard,
  legalMoves,
  samePos,
  type Board,
  type Move,
  type Pos,
  type Side,
} from "@/lib/checkers";

export const Route = createFileRoute("/jogos/damas")({ component: Damas });

type Snap = { board: Board; side: Side };
type Mode = "two" | "basic";

function opening(): Snap[] {
  return [{ board: initialBoard(), side: "light" }];
}

function Damas() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [history, setHistory] = useState<Snap[]>(opening);
  const [selected, setSelected] = useState<Pos | null>(null);
  const snap = history[history.length - 1];
  const moves = legalMoves(snap.board, snap.side);
  const over = moves.length === 0;
  const selectedMoves = selected ? moves.filter((move) => samePos(move.from, selected)) : [];
  const mustCapture = moves.some((move) => move.captures.length > 0);
  const aiTurn = mode === "basic" && snap.side === "dark" && !over;

  useEffect(() => {
    if (!aiTurn || !mode) return;
    let cancel = false;
    const timer = window.setTimeout(() => {
      if (cancel) return;
      const options = legalMoves(snap.board, "dark");
      if (options.length === 0) return;
      const move = options[Math.floor(Math.random() * options.length)];
      setHistory((current) => {
        const last = current[current.length - 1];
        if (!last || last.side !== "dark") return current;
        return [...current, { board: applyMove(last.board, move), side: "light" }];
      });
      setSelected(null);
    }, 700);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [aiTurn, mode, snap]);

  function restart(nextMode: Mode) {
    setMode(nextMode);
    setHistory(opening());
    setSelected(null);
  }

  function undo() {
    setSelected(null);
    setHistory((current) => {
      if (current.length <= 1) return current;
      let next = current.slice(0, -1);
      if (mode === "basic" && next.length > 1 && next[next.length - 1].side === "dark") {
        next = next.slice(0, -1);
      }
      return next.length > 0 ? next : current.slice(0, 1);
    });
  }

  function onSquare(pos: Pos) {
    if (over || aiTurn) return;
    const choices = selectedMoves.filter((move) => samePos(move.to, pos));
    if (selected && choices.length > 0) {
      const move = [...choices].sort((a, b) => b.captures.length - a.captures.length)[0];
      commit(move);
      return;
    }
    const piece = snap.board[pos.r][pos.c];
    if (piece?.side === snap.side && moves.some((move) => samePos(move.from, pos))) {
      setSelected(pos);
    }
  }

  function commit(move: Move) {
    setHistory((current) => {
      const last = current[current.length - 1];
      const side: Side = last.side === "light" ? "dark" : "light";
      return [...current, { board: applyMove(last.board, move), side }];
    });
    setSelected(null);
  }

  return (
    <Screen backHref="/jogos" backLabel="Jogos">
      <h1 className="font-serif text-3xl leading-tight font-medium">Damas</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Peças andam na diagonal. Se existir captura, ela acontece. A dama atravessa a diagonal.
        Sem tempo e sem ranking.
      </p>

      {mode === null ? (
        <div className="mt-6 flex flex-col gap-3">
          <QuietButton onClick={() => restart("two")}>Duas pessoas neste aparelho</QuietButton>
          <QuietButton onClick={() => restart("basic")}>Com uma ajuda bem básica</QuietButton>
        </div>
      ) : (
        <>
          <p className="mt-5 min-h-12 text-muted" aria-live="polite">
            {over
              ? snap.side === "light"
                ? "As peças de baixo não encontram um movimento. Podemos parar por aqui."
                : "As peças de cima não encontram um movimento. Podemos parar por aqui."
              : aiTurn
                ? "Um instante."
                : mustCapture
                  ? "Há uma captura possível. Toque na peça e depois na casa marcada."
                  : snap.side === "light"
                    ? "Vez das peças de baixo."
                    : "Vez das peças de cima."}
          </p>
          <div className="board mt-3" role="grid" aria-label="Tabuleiro de damas">
            {snap.board.map((row, r) =>
              row.map((cell, c) => {
                const playable = (r + c) % 2 === 1;
                if (!playable) return <div key={`${r}-${c}`} className="square" />;
                const pos = { r, c };
                const isSelected = selected ? samePos(selected, pos) : false;
                const dest = selectedMoves.find((move) => samePos(move.to, pos));
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={`square playable ${isSelected ? "selected" : ""}`}
                    onClick={() => onSquare(pos)}
                    aria-label={squareLabel(cell, dest)}
                  >
                    {cell && (
                      <span className={`piece ${cell.side} ${cell.kind === "king" ? "king" : ""}`} />
                    )}
                    {!cell && dest && (
                      <span className={`hint ${dest.captures.length > 0 ? "capture" : ""}`} />
                    )}
                  </button>
                );
              }),
            )}
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <QuietButton onClick={undo} disabled={history.length <= 1 || aiTurn}>
              Voltar jogada
            </QuietButton>
            <QuietButton onClick={() => restart(mode)}>Começar de novo</QuietButton>
            <QuietButton
              onClick={() => {
                setMode(null);
                setHistory(opening());
                setSelected(null);
              }}
            >
              Trocar o modo
            </QuietButton>
          </div>
        </>
      )}
    </Screen>
  );
}

function squareLabel(
  cell: { side: Side; kind: "man" | "king" } | null,
  dest: Move | undefined,
) {
  if (cell) {
    const who = cell.side === "light" ? "clara" : "escura";
    return cell.kind === "king" ? `Dama ${who}` : `Peça ${who}`;
  }
  if (dest?.captures.length) return "Casa de captura";
  if (dest) return "Casa de movimento";
  return "Casa vazia";
}

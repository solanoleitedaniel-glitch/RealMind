import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuietButton, Screen } from "@/components/screen";
import { easyMove, emptyBoard, winnerOf, winningLine, type Board, type Mark } from "@/lib/tictactoe";

export const Route = createFileRoute("/jogos/velha")({ component: Velha });

function Velha() {
  const [mode, setMode] = useState<"two" | "easy" | null>(null);
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<Mark>("X");
  const [thinking, setThinking] = useState(false);
  const result = winnerOf(board);
  const line = winningLine(board);

  useEffect(() => {
    if (mode !== "easy" || turn !== "O" || result) return;
    let cancel = false;
    setThinking(true);
    const timer = window.setTimeout(() => {
      if (cancel) return;
      const index = easyMove(board, "O");
      setBoard((current) => {
        if (current[index] || winnerOf(current)) return current;
        const next = current.slice();
        next[index] = "O";
        return next;
      });
      setTurn("X");
      setThinking(false);
    }, 520);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [mode, turn, board, result]);

  function play(index: number) {
    if (!mode || result || board[index] || thinking) return;
    if (mode === "easy" && turn !== "X") return;
    const next = board.slice();
    next[index] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  }

  function restart(nextMode: "two" | "easy") {
    setMode(nextMode);
    setBoard(emptyBoard());
    setTurn("X");
    setThinking(false);
  }

  return (
    <Screen backHref="/jogos" backLabel="Jogos">
      <h1 className="font-serif text-3xl leading-tight font-medium">Jogo da Velha</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Sem limite de tempo e sem ranking. A partida fácil deixa passar alguns lances.
      </p>

      {mode === null ? (
        <div className="mt-6 flex flex-col gap-3">
          <QuietButton onClick={() => restart("two")}>Duas pessoas neste aparelho</QuietButton>
          <QuietButton onClick={() => restart("easy")}>Partida fácil</QuietButton>
        </div>
      ) : (
        <>
          <p className="mt-6 min-h-6 text-muted" aria-live="polite">
            {result
              ? result === "draw"
                ? "O tabuleiro encheu, sem uma linha."
                : `As marcas ${result} formaram uma linha.`
              : mode === "easy"
                ? turn === "X"
                  ? "Sua vez, com as marcas X."
                  : "Um instante."
                : `Vez das marcas ${turn}.`}
          </p>
          <div className="ttt mt-4" role="grid" aria-label="Tabuleiro">
            {board.map((cell, index) => {
              const won = line.includes(index);
              return (
                <button
                  key={index}
                  type="button"
                  className={`cell ${won ? "win" : ""}`}
                  onClick={() => play(index)}
                  disabled={Boolean(result) || Boolean(cell) || thinking || (mode === "easy" && turn === "O")}
                  aria-label={cell ? `Marca ${cell}` : "Casa vazia"}
                >
                  {cell}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-col gap-3">
            <QuietButton onClick={() => restart(mode)}>Começar de novo</QuietButton>
            <QuietButton
              onClick={() => {
                setMode(null);
                setBoard(emptyBoard());
                setTurn("X");
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

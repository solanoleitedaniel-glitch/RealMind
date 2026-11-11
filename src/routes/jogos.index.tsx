import { createFileRoute } from "@tanstack/react-router";
import { Choice, Screen } from "@/components/screen";

export const Route = createFileRoute("/jogos/")({ component: GamesHome });

function GamesHome() {
  return (
    <Screen>
      <h1 className="font-serif text-3xl leading-tight font-medium">Jogos Relaxantes</h1>
      <p className="mt-3 mb-6 text-base leading-relaxed text-muted">
        Foco simples, sem ranking e sem pressa. Pode parar quando quiser.
      </p>
      <div className="flex flex-col gap-3">
        <Choice
          href="/jogos/velha"
          emoji="✖️"
          title="Jogo da Velha"
          detail="Duas pessoas, ou uma partida fácil"
        />
        <Choice
          href="/jogos/damas"
          emoji="⚫"
          title="Damas"
          detail="Movimentos claros, no mesmo aparelho ou com uma ajuda básica"
        />
        <Choice
          href="/jogos/tetris"
          emoji="🧩"
          title="Tétris calmo"
          detail="Peças que descem devagar. Sem pontuação e sem ranking"
        />
        <Choice
          href="/jogos/labirinto"
          emoji="〰️"
          title="Labirinto"
          detail="Siga com o dedo. Cada caminho seguinte fica um pouco maior"
        />
      </div>
    </Screen>
  );
}

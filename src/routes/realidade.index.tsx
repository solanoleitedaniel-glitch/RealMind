import { createFileRoute } from "@tanstack/react-router";
import { Choice, Screen } from "@/components/screen";

export const Route = createFileRoute("/realidade/")({ component: RealityHome });

function RealityHome() {
  return (
    <Screen>
      <h1 className="font-serif text-3xl leading-tight font-medium">Teste de Realidade</h1>
      <p className="mt-3 mb-6 text-base leading-relaxed text-muted">
        Um jeito calmo de comparar o que você percebe com o que a câmera ou o microfone
        registram agora. Sem afirmações absolutas. A imagem e o áudio não são guardados.
      </p>
      <div className="flex flex-col gap-3">
        <Choice
          href="/realidade/visual"
          emoji="👁️"
          title="O que eu vejo"
          detail="Câmera ao vivo, sem foto e sem flash"
        />
        <Choice
          href="/realidade/audio"
          emoji="🎧"
          title="O que eu escuto"
          detail="Um trecho curto, que só toca se você quiser"
        />
      </div>
    </Screen>
  );
}

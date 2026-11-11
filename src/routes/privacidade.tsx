import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/screen";

export const Route = createFileRoute("/privacidade")({ component: Privacy });

function Privacy() {
  return (
    <Screen>
      <h1 className="font-serif text-3xl leading-tight font-medium">Privacidade</h1>
      <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-muted">
        <p>A câmera e o microfone funcionam neste aparelho. A imagem e o áudio não são enviados para o RealMind.</p>
        <p>O diário, os contatos e a fase do labirinto ficam só neste aparelho.</p>
        <p>
          A assinatura, quando houver, é cobrada pela Google Play. O RealMind não guarda o cartão. O valor
          previsto é R$ 5,99 por mês, com até 7 dias iniciais sem cobrança, se essa oferta estiver ativa na
          Play Store. Depois a cobrança se repete até o cancelamento, feito na própria Play Store.
        </p>
        <p>O RealMind não faz diagnóstico e não substitui um profissional de saúde.</p>
      </div>
    </Screen>
  );
}

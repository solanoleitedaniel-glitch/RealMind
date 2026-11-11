import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CalmNote, PrimaryButton, QuietButton, Screen } from "@/components/screen";
import { readAccess, restoreSubscription, startSubscription, type Access } from "@/lib/billing";

function Paywall({
  access,
  onChange,
}: {
  access: Access | null;
  onChange: (next: Access) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(access?.message || null);
  const price = access?.price || "R$ 5,99";

  async function run(action: () => Promise<Access>) {
    setBusy(true);
    setNote(null);
    try {
      const next = await action();
      onChange(next);
      if (!next.entitled) {
        setNote(next.message || "A assinatura não foi concluída. Você pode tentar de novo quando quiser.");
      }
    } catch {
      setNote("Não consegui abrir a Play Store agora. Pode tentar de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen backHref={false}>
      <p className="text-sm font-medium tracking-widest text-lilac uppercase">RealMind</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight font-medium">Um espaço só seu.</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        A assinatura é {price} por mês, cobrada pela Google Play. Não há versão gratuita permanente.
        Os primeiros 7 dias podem ser sem cobrança. Depois o valor se repete até você cancelar na Play Store.
      </p>
      {note && (
        <div className="mt-4">
          <CalmNote>{note}</CalmNote>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton disabled={busy} onClick={() => void run(startSubscription)}>
          Começar os 7 dias
        </PrimaryButton>
        <QuietButton disabled={busy} onClick={() => void run(restoreSubscription)}>
          Já assinei neste Google
        </QuietButton>
        <Link
          to="/privacidade"
          className="inline-flex min-h-12 items-center justify-center text-sm text-muted"
        >
          Privacidade
        </Link>
      </div>
    </Screen>
  );
}

export function StoreGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [access, setAccess] = useState<Access | null>(null);
  const refresh = useCallback(async () => {
    const next = await readAccess();
    setAccess(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const locked = access?.mode === "store" && !access.entitled;
  if (locked && pathname !== "/privacidade") {
    return <Paywall access={access} onChange={setAccess} />;
  }
  return children;
}

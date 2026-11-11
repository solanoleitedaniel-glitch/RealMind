import { createFileRoute, Link } from "@tanstack/react-router";
import { Choice, Screen } from "@/components/screen";

export const Route = createFileRoute("/")({ component: Home });

const PATHS = [
  {
    href: "/realidade",
    emoji: "🌀",
    title: "Teste de Realidade",
    detail: "Olhar e escutar com calma",
  },
  {
    href: "/diario",
    emoji: "📖",
    title: "Meu Diário",
    detail: "Escrever, sem correção e sem análise",
  },
  {
    href: "/apoio",
    emoji: "🆘",
    title: "Apoio Imediato",
    detail: "Contatos, frases e linhas de escuta",
  },
  {
    href: "/relaxamento",
    emoji: "🌿",
    title: "Relaxamento",
    detail: "Sons e respiração, sem pressa",
  },
  {
    href: "/jogos",
    emoji: "🎮",
    title: "Jogos Relaxantes",
    detail: "Velha, damas, tétris e labirinto",
  },
] as const;

function Home() {
  return (
    <Screen backHref={false}>
      <header className="mb-8 mt-3">
        <p className="text-sm font-medium tracking-widest text-lilac uppercase">RealMind</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight font-medium text-fg">
          Você não está sozinho.
        </h1>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-muted">
          Um espaço para se orientar neste momento. Sem julgamento e sem diagnóstico.
        </p>
      </header>
      <nav className="flex flex-col gap-3" aria-label="Seções">
        {PATHS.map((path) => (
          <Choice key={path.href} {...path} />
        ))}
      </nav>
      <p className="mt-8 text-sm leading-relaxed text-muted">
        O RealMind acompanha. Não afirma o que é real e não substitui um profissional de saúde.
      </p>
      <Link to="/privacidade" className="mt-4 inline-flex min-h-11 items-center text-sm text-muted">
        Privacidade
      </Link>
    </Screen>
  );
}

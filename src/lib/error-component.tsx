import type { ErrorComponentProps } from "@tanstack/react-router";

const FALLBACK_MESSAGE = "Algo inesperado aconteceu. Você pode recarregar a página.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <h1 className="font-serif text-2xl">Algo inesperado aconteceu</h1>
      <p className="max-w-md text-sm leading-relaxed break-words text-muted">{errorMessage(error)}</p>
    </main>
  );
}

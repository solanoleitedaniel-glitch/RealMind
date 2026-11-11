import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function Screen({
  children,
  backHref = "/",
  backLabel = "Início",
}: {
  children: ReactNode;
  backHref?: LinkProps["to"] | false;
  backLabel?: string;
}) {
  return (
    <div className="safe-screen mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      {backHref !== false && (
        <Link
          to={backHref}
          className="mb-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full text-muted"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {backLabel}
        </Link>
      )}
      {children}
    </div>
  );
}

export function Choice({
  href,
  emoji,
  title,
  detail,
}: {
  href: LinkProps["to"];
  emoji: string;
  title: string;
  detail: string;
}) {
  return (
    <Link to={href} className="card flex min-h-20 items-center gap-4 px-4 py-4">
      <span
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-medium leading-tight">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-muted">{detail}</span>
      </span>
    </Link>
  );
}

export function CalmNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-line bg-raised px-4 py-4 text-base leading-relaxed">
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-lilac px-5 py-3 text-center font-medium text-bg disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3 text-center text-fg disabled:opacity-45"
    >
      {children}
    </button>
  );
}

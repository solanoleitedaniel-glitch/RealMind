import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrimaryButton, QuietButton, Screen } from "@/components/screen";
import { deleteDiaryEntry, loadDiary, saveDiaryEntry, type DiaryEntry } from "@/lib/storage";

export const Route = createFileRoute("/diario")({ component: Diary });

function formatWhen(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function Diary() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(loadDiary());
    setReady(true);
  }, []);

  function save() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setEntries(saveDiaryEntry(trimmed));
    setText("");
  }

  return (
    <Screen>
      <h1 className="font-serif text-3xl leading-tight font-medium">Meu Diário</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Escreva o que quiser. Nada aqui é corrigido ou analisado. Os registros ficam só neste
        aparelho.
      </p>
      <label className="mt-5 block">
        <span className="sr-only">Texto do diário</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          rows={7}
          placeholder="Pode começar por qualquer frase."
          className="w-full resize-y rounded-card border border-line bg-surface px-4 py-4 font-serif text-lg leading-relaxed outline-none placeholder:text-faint"
        />
      </label>
      <div className="mt-3">
        <PrimaryButton onClick={save} disabled={!text.trim()}>
          Guardar neste aparelho
        </PrimaryButton>
      </div>

      <section className="mt-8 flex flex-col gap-3" aria-label="Registros">
        {ready && entries.length === 0 && (
          <p className="text-muted">Ainda não há registros. Quando quiser, o primeiro pode ser curto.</p>
        )}
        {entries.map((entry) => {
          const open = openId === entry.id;
          return (
            <article key={entry.id} className="card px-4 py-4">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpenId(open ? null : entry.id)}
              >
                <time className="text-sm text-faint" dateTime={new Date(entry.createdAt).toISOString()}>
                  {formatWhen(entry.createdAt)}
                </time>
                <p className={`mt-2 font-serif text-lg leading-relaxed ${open ? "" : "line-clamp-3"}`}>
                  {entry.text}
                </p>
              </button>
              {open && (
                <div className="mt-4">
                  {pendingDelete === entry.id ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="w-full text-sm text-muted">Apagar este registro?</span>
                      <QuietButton
                        onClick={() => {
                          setEntries(deleteDiaryEntry(entry.id));
                          setPendingDelete(null);
                          setOpenId(null);
                        }}
                      >
                        Sim, apagar
                      </QuietButton>
                      <QuietButton onClick={() => setPendingDelete(null)}>Não</QuietButton>
                    </div>
                  ) : (
                    <QuietButton onClick={() => setPendingDelete(entry.id)}>Apagar</QuietButton>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </Screen>
  );
}

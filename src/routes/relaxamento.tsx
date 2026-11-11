import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QuietButton, Screen } from "@/components/screen";
import { Ambience, type AmbienceId } from "@/lib/ambience";

export const Route = createFileRoute("/relaxamento")({ component: Relax });

const SOUNDS: { id: AmbienceId; label: string }[] = [
  { id: "rain", label: "Chuva" },
  { id: "wind", label: "Vento" },
  { id: "water", label: "Água" },
  { id: "forest", label: "Floresta" },
  { id: "harp", label: "Harpa suave" },
];

const MESSAGES = [
  "Você pode ir no seu ritmo.",
  "Não há pressa nenhuma aqui.",
  "Um passo de cada vez já é movimento.",
  "Este instante pode ser só isto.",
  "Se quiser parar, tudo bem.",
];

const PHASES = [
  { label: "Inspire", scale: 1, ms: 4200 },
  { label: "Segure, se quiser", scale: 1, ms: 1800 },
  { label: "Solte o ar", scale: 0.84, ms: 6200 },
];

function Relax() {
  const ambienceRef = useRef<Ambience | null>(null);
  const [sound, setSound] = useState<AmbienceId | null>(null);
  const [volume, setVolume] = useState(55);
  const [message, setMessage] = useState(0);
  const [breathOn, setBreathOn] = useState(false);
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessage((current) => (current + 1) % MESSAGES.length);
    }, 14000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => ambienceRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!breathOn) return;
    let cancel = false;
    let index = 0;
    let timer = 0;
    const step = () => {
      if (cancel) return;
      setPhase(index);
      timer = window.setTimeout(() => {
        index = (index + 1) % PHASES.length;
        step();
      }, PHASES[index].ms);
    };
    step();
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [breathOn]);

  function engine() {
    if (!ambienceRef.current) ambienceRef.current = new Ambience();
    return ambienceRef.current;
  }

  async function chooseSound(id: AmbienceId) {
    try {
      const player = engine();
      if (sound === id) {
        player.stop();
        setSound(null);
        return;
      }
      player.setVolume((volume / 100) * 0.4);
      await player.play(id);
      setSound(id);
    } catch {
      ambienceRef.current?.stop();
      setSound(null);
    }
  }

  const breath = PHASES[phase];

  return (
    <Screen>
      <div className="relative mb-6 overflow-hidden rounded-card">
        <div className="drift top-0 -left-6 size-40" aria-hidden />
        <div className="drift b top-10 right-0 size-48" aria-hidden />
        <div className="drift c -bottom-8 left-1/3 size-36" aria-hidden />
        <div className="relative px-1 py-2">
          <h1 className="font-serif text-3xl leading-tight font-medium">Relaxamento</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Sons baixos e uma respiração guiada. Sem tempo, sem pontuação e sem desafio.
          </p>
        </div>
      </div>

      <p className="mb-6 min-h-12 font-serif text-xl leading-snug text-lilac" aria-live="polite">
        {MESSAGES[message]}
      </p>

      <section>
        <h2 className="text-lg font-medium">Sons</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {SOUNDS.map((item) => {
            const active = sound === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void chooseSound(item.id)}
                className={`min-h-14 rounded-card border px-3 py-3 ${
                  active ? "border-lilac bg-surface-2 text-fg" : "border-line bg-surface text-fg"
                }`}
                aria-pressed={active}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-muted">Volume baixo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              ambienceRef.current?.setVolume((next / 100) * 0.4);
            }}
            className="w-full accent-lilac"
          />
        </label>
        {sound && (
          <div className="mt-3">
            <QuietButton
              onClick={() => {
                ambienceRef.current?.stop();
                setSound(null);
              }}
            >
              Silenciar
            </QuietButton>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Respiração</h2>
        <p className="mt-1 mb-5 text-sm text-muted">Siga o círculo só se quiser. Pode pausar.</p>
        <div className="flex flex-col items-center gap-5">
          <div
            className="grid size-56 place-items-center rounded-full border border-line bg-surface text-center"
            style={{
              transform: breathOn && !reduced ? `scale(${breath.scale})` : "scale(0.84)",
              transitionProperty: "transform",
              transitionDuration: breathOn && !reduced ? `${breath.ms}ms` : "400ms",
              transitionTimingFunction: "ease-in-out",
            }}
          >
            <span className="px-6 font-serif text-2xl leading-snug">
              {breathOn ? breath.label : "Quando quiser"}
            </span>
          </div>
          <QuietButton onClick={() => setBreathOn((value) => !value)}>
            {breathOn ? "Pausar" : "Começar a respirar"}
          </QuietButton>
        </div>
      </section>
    </Screen>
  );
}

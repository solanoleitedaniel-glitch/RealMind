import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalmNote, PrimaryButton, QuietButton, Screen } from "@/components/screen";
import { classifySamples, readingMessage, type Sample } from "@/lib/audio-classify";

export const Route = createFileRoute("/realidade/audio")({ component: AudioTest });

const MAX_MS = 8000;
const BARS = 14;

type Phase = "idle" | "recording" | "review" | "played";

function AudioTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.15));
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function discard() {
    stopRef.current?.();
    stopRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  async function record() {
    discard();
    setError(null);
    setReading(null);
    setNote(null);
    setProgress(0);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Não consegui analisar agora, mas isso acontece. Você está seguro neste momento.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setError("Não consegui analisar agora, mas isso acontece. Você está seguro neste momento.");
      setNote("O microfone não abriu. Você pode tentar de novo ou voltar.");
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const time = new Uint8Array(analyser.fftSize);
    const samples: Sample[] = [];
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    let sampleTimer = 0;
    let stopTimer = 0;
    const started = performance.now();
    let stopped = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      window.clearInterval(sampleTimer);
      window.clearTimeout(stopTimer);
      const sampleRate = ctx.sampleRate;
      const fftSize = analyser.fftSize;
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const result = classifySamples(samples, sampleRate, fftSize);
        setReading(readingMessage(result));
        setNote("Você teve controle do processo. Isso é importante.");
        setPhase("review");
        setProgress(1);
      };
      if (recorder.state !== "inactive") recorder.stop();
      else {
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
      }
    };

    stopRef.current = finish;
    recorder.start();
    setPhase("recording");

    sampleTimer = window.setInterval(() => {
      analyser.getByteFrequencyData(bins);
      analyser.getByteTimeDomainData(time);
      let sum = 0;
      for (const value of time) {
        const sample = (value - 128) / 128;
        sum += sample * sample;
      }
      samples.push({ rms: Math.sqrt(sum / time.length), bins: bins.slice() });
      if (!reduced) {
        const next = Array.from({ length: BARS }, (_, index) => {
          const start = Math.floor((index / BARS) * bins.length);
          const end = Math.floor(((index + 1) / BARS) * bins.length);
          let acc = 0;
          for (let i = start; i < end; i++) acc += bins[i];
          const avg = acc / Math.max(1, end - start);
          return Math.max(0.08, Math.min(1, avg / 140));
        });
        setLevels(next);
      }
      setProgress(Math.min(1, (performance.now() - started) / MAX_MS));
    }, 120);
    stopTimer = window.setTimeout(finish, MAX_MS);
  }

  function decline() {
    discard();
    setPhase("idle");
    setReading(null);
    setNote(null);
    setError(null);
    setLevels(Array.from({ length: BARS }, () => 0.15));
    setProgress(0);
  }

  async function play() {
    if (!urlRef.current) return;
    const audio = new Audio(urlRef.current);
    audio.volume = 0.7;
    audioRef.current = audio;
    audio.onended = () => {
      setPhase("played");
      setNote("Vamos com calma. Um passo de cada vez.");
    };
    try {
      await audio.play();
    } catch {
      setError("Não consegui analisar agora, mas isso acontece. Você está seguro neste momento.");
    }
  }

  return (
    <Screen backHref="/realidade" backLabel="Teste de Realidade">
      <h1 className="font-serif text-3xl leading-tight font-medium">O que eu escuto</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Um trecho curto, de alguns segundos. Ele não toca sozinho. O app não tenta entender
        frases, só se o som parece voz, ambiente ou muito baixo.
      </p>

      <div className="mt-6 flex h-28 items-end justify-between gap-1 rounded-card border border-line bg-raised px-3 py-4">
        {levels.map((level, index) => (
          <span
            key={index}
            className="block w-full rounded-full bg-lilac"
            style={{ height: `${Math.round(level * 100)}%`, opacity: phase === "recording" ? 0.9 : 0.35 }}
          />
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full bg-lilac" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="mt-5 flex flex-col gap-3" aria-live="polite">
        {reading && <p className="text-base leading-relaxed">{reading}</p>}
        {note && <CalmNote>{note}</CalmNote>}
        {error && <CalmNote>{error}</CalmNote>}

        {phase === "idle" && (
          <PrimaryButton onClick={() => void record()}>Gravar um trecho</PrimaryButton>
        )}
        {phase === "recording" && (
          <>
            <p className="text-muted">Gravando. Você pode parar quando quiser.</p>
            <QuietButton onClick={() => stopRef.current?.()}>Parar</QuietButton>
          </>
        )}
        {phase === "review" && (
          <>
            <p className="text-lg">Deseja reproduzir a gravação?</p>
            <PrimaryButton onClick={() => void play()}>Sim, reproduzir</PrimaryButton>
            <QuietButton onClick={decline}>Não, voltar</QuietButton>
          </>
        )}
        {phase === "played" && (
          <>
            <PrimaryButton onClick={decline}>Gravar de novo</PrimaryButton>
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
            >
              Voltar ao início
            </Link>
          </>
        )}
        {phase === "idle" && (
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
          >
            Voltar ao início
          </Link>
        )}
      </div>
    </Screen>
  );
}

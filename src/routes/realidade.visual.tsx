import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalmNote, PrimaryButton, QuietButton, Screen } from "@/components/screen";

export const Route = createFileRoute("/realidade/visual")({ component: VisualTest });

type Facing = "environment" | "user";

type Box = {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const ALLOWED: Record<string, string> = {
  person: "Pessoa detectada",
  dog: "Cachorro detectado",
  cat: "Gato detectado",
};

const EMPTY_LINES = [
  "Não foi possível identificar alguém neste momento",
  "Nada identificável apareceu agora",
];

type Detector = {
  detect: (
    img: HTMLVideoElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<{ bbox: [number, number, number, number]; class: string; score: number }[]>;
  dispose: () => void;
};

function projectBox(
  pred: { bbox: [number, number, number, number]; class: string },
  video: HTMLVideoElement,
  index: number,
  mirror: boolean,
): Box | null {
  const label = ALLOWED[pred.class];
  if (!label) return null;
  const elementW = video.clientWidth;
  const elementH = video.clientHeight;
  if (elementW === 0 || elementH === 0 || video.videoWidth === 0) return null;
  const videoRatio = video.videoWidth / video.videoHeight;
  const elementRatio = elementW / elementH;
  let renderW: number;
  let renderH: number;
  let offsetX: number;
  let offsetY: number;
  if (elementRatio > videoRatio) {
    renderH = elementH;
    renderW = elementH * videoRatio;
    offsetX = (elementW - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = elementW;
    renderH = elementW / videoRatio;
    offsetX = 0;
    offsetY = (elementH - renderH) / 2;
  }
  const [bx, by, bw, bh] = pred.bbox;
  const widthPx = (bw / video.videoWidth) * renderW;
  const heightPx = (bh / video.videoHeight) * renderH;
  const leftPx = offsetX + (bx / video.videoWidth) * renderW;
  const topPx = offsetY + (by / video.videoHeight) * renderH;
  const xPx = mirror ? elementW - (leftPx + widthPx) : leftPx;
  return {
    key: `${pred.class}-${index}`,
    label,
    x: (xPx / elementW) * 100,
    y: (topPx / elementH) * 100,
    w: (widthPx / elementW) * 100,
    h: (heightPx / elementH) * 100,
  };
}

async function openCamera(facing: Facing) {
  const video = { facingMode: facing };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

function VisualTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"intro" | "live" | "denied">("intro");
  const [facing, setFacing] = useState<Facing>("environment");
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [lines, setLines] = useState<string[]>(["A câmera ainda não foi aberta."]);
  const [note, setNote] = useState<string | null>(null);
  const emptyIndex = useRef(0);

  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    const holder = {
      cancel: false,
      stream: null as MediaStream | null,
      model: null as Detector | null,
    };
    setReady(false);
    setFailed(false);
    setBoxes([]);
    setNote(null);
    setLines(["Preparando a análise, no seu tempo."]);

    const run = async () => {
      try {
        const stream = await openCamera(facing);
        holder.stream = stream;
        if (holder.cancel || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
      } catch {
        if (!holder.cancel) setPhase("denied");
        return;
      }

      try {
        const tf = await import("@tensorflow/tfjs");
        const coco = await import("@tensorflow-models/coco-ssd");
        try {
          await tf.setBackend("webgl");
          await tf.ready();
        } catch {
          await tf.setBackend("cpu");
          await tf.ready();
        }
        if (holder.cancel) return;
        const model = await coco.load({ base: "lite_mobilenet_v2" });
        holder.model = model;
        if (holder.cancel) {
          model.dispose();
          return;
        }
        setReady(true);
        let misses = 0;
        let shown: "boot" | "found" | "empty" = "boot";
        while (!holder.cancel) {
          const started = performance.now();
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            try {
              const preds = await model.detect(video, 8, 0.6);
              if (holder.cancel) break;
              misses = 0;
              const nextBoxes = preds.flatMap((pred, index) => {
                const box = projectBox(pred, video, index, facing === "user");
                return box ? [box] : [];
              });
              setBoxes(nextBoxes);
              if (nextBoxes.length > 0) {
                shown = "found";
                setLines([...new Set(nextBoxes.map((box) => box.label))]);
              } else if (shown !== "empty") {
                const line = EMPTY_LINES[emptyIndex.current % EMPTY_LINES.length];
                emptyIndex.current += 1;
                shown = "empty";
                setLines([line]);
              }
            } catch {
              misses += 1;
              if (misses >= 3 && !holder.cancel) setFailed(true);
            }
          }
          const wait = Math.max(280, 560 - (performance.now() - started));
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      } catch {
        if (!holder.cancel) setFailed(true);
      }
    };

    void run();
    return () => {
      holder.cancel = true;
      holder.stream?.getTracks().forEach((track) => track.stop());
      holder.model?.dispose();
      if (video) video.srcObject = null;
    };
  }, [phase, facing, retry]);

  function verify() {
    if (phase !== "live") return;
    if (failed || !ready) {
      setNote("Não consegui analisar agora, mas isso acontece. Você está seguro neste momento.");
      return;
    }
    if (boxes.length > 0) {
      setNote("Ok. Algo foi identificado. Você está percebendo corretamente.");
      return;
    }
    setNote("Às vezes nossa mente preenche lacunas. Vamos respirar juntos.");
  }

  return (
    <Screen backHref="/realidade" backLabel="Teste de Realidade">
      <h1 className="font-serif text-3xl leading-tight font-medium">O que eu vejo</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">
        Vídeo contínuo, sem foto, sem flash e sem contagem. Só pessoas, cachorros e gatos
        entram na análise. A imagem fica neste aparelho.
      </p>

      {phase === "intro" && (
        <div className="mt-6 flex flex-col gap-3">
          <PrimaryButton onClick={() => setPhase("live")}>Abrir a câmera</PrimaryButton>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
          >
            Voltar ao início
          </Link>
        </div>
      )}

      {phase === "denied" && (
        <div className="mt-6 flex flex-col gap-3">
          <CalmNote>
            Não consegui abrir a câmera. Isso pode ser uma permissão do aparelho. Você pode
            tentar de novo ou escolher outro caminho.
          </CalmNote>
          <PrimaryButton onClick={() => setPhase("live")}>Tentar de novo</PrimaryButton>
          <Link
            to="/realidade/audio"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
          >
            Ir para o som
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
          >
            Voltar ao início
          </Link>
        </div>
      )}

      {phase === "live" && (
        <div className="mt-5 flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-card border border-line bg-bg">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={facing === "user" ? "camera-frame mirror" : "camera-frame"}
            />
            <div className="pointer-events-none absolute inset-0">
              {boxes.map((box) => (
                <div
                  key={box.key}
                  className="absolute border-2 border-sage"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                >
                  <span className="absolute top-0 left-0 max-w-full bg-sage px-1.5 py-0.5 text-xs leading-tight text-sage-ink">
                    {box.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-12 text-base leading-relaxed" aria-live="polite">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {failed && (
              <p className="mt-1 text-muted">
                A câmera continua aberta, mas a análise não ficou pronta desta vez.
              </p>
            )}
          </div>

          {note && <CalmNote>{note}</CalmNote>}

          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={verify}>Verificar o que vejo</PrimaryButton>
            <QuietButton
              onClick={() => setFacing((current) => (current === "environment" ? "user" : "environment"))}
            >
              {facing === "environment" ? "Usar a câmera da frente" : "Usar a câmera de trás"}
            </QuietButton>
            {failed && (
              <QuietButton onClick={() => setRetry((value) => value + 1)}>
                Tentar a análise de novo
              </QuietButton>
            )}
            <Link
              to="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 py-3"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      )}
    </Screen>
  );
}

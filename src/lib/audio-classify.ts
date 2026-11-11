export type SoundReading = "voice" | "ambient" | "quiet" | "unclear";

export type Sample = { rms: number; bins: Uint8Array };

export function classifySamples(
  samples: Sample[],
  sampleRate: number,
  fftSize: number,
): SoundReading {
  if (samples.length < 4) return "unclear";
  const rmsValues = samples.map((sample) => sample.rms);
  const mean = rmsValues.reduce((sum, value) => sum + value, 0) / rmsValues.length;
  if (!Number.isFinite(mean)) return "unclear";
  if (mean < 0.008) return "quiet";

  let voice = 0;
  let total = 0;
  for (const sample of samples) {
    for (let i = 1; i < sample.bins.length; i++) {
      const freq = (i * sampleRate) / fftSize;
      if (freq > 7600) continue;
      const energy = sample.bins[i] / 255;
      total += energy;
      if (freq >= 180 && freq <= 3400) voice += energy;
    }
  }
  const ratio = total > 0 ? voice / total : 0;
  const variance =
    rmsValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rmsValues.length;
  const variation = Math.sqrt(variance) / (mean || 1);

  if (mean < 0.016 && ratio < 0.62) return "quiet";
  if (ratio > 0.46 && variation > 0.16 && mean > 0.02) return "voice";
  if (mean >= 0.01) return "ambient";
  return "unclear";
}

export function readingMessage(reading: SoundReading): string {
  switch (reading) {
    case "voice":
      return "Houve presença de voz, mas sem identificação de origem";
    case "ambient":
      return "O som parece ser ambiente";
    case "quiet":
      return "O trecho parece muito baixo, próximo do silêncio";
    default:
      return "Não foi possível analisar com clareza";
  }
}

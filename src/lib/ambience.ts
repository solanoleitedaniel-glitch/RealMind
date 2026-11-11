export type AmbienceId = "rain" | "wind" | "water" | "forest" | "harp";

type Stoppable = { stop: () => void };

function noiseBuffer(ctx: AudioContext, kind: "white" | "brown", seconds = 2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") {
      data[i] = white * 0.6;
    } else {
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = brown * 3.2;
    }
  }
  return buffer;
}

function loopNoise(ctx: AudioContext, buffer: AudioBuffer, destination: AudioNode) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  source.start();
  return source;
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.22;
  private active: Stoppable | null = null;
  current: AmbienceId | null = null;

  private context() {
    if (!this.ctx || !this.master) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
    return this.ctx;
  }

  async play(id: AmbienceId) {
    const ctx = this.context();
    const master = this.master;
    if (!master) return;
    if (ctx.state === "suspended") await ctx.resume();
    this.active?.stop();
    this.active = null;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 1.3);
    this.current = id;
    if (id === "rain") this.active = this.rain(ctx, master);
    else if (id === "wind") this.active = this.wind(ctx, master);
    else if (id === "water") this.active = this.water(ctx, master);
    else if (id === "forest") this.active = this.forest(ctx, master);
    else this.active = this.harp(ctx, master);
  }

  setVolume(value: number) {
    this.volume = Math.min(0.4, Math.max(0, value));
    if (!this.ctx || !this.master || !this.current) return;
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
  }

  stop() {
    const ctx = this.ctx;
    const master = this.master;
    this.active?.stop();
    this.active = null;
    this.current = null;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    }
  }

  dispose() {
    this.active?.stop();
    this.active = null;
    this.current = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    void ctx?.close();
  }

  private forest(ctx: AudioContext, master: GainNode): Stoppable {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.42;
    filter.connect(gain);
    gain.connect(master);
    const bed = loopNoise(ctx, noiseBuffer(ctx, "brown", 4), filter);
    let timer = 0;
    const birds: OscillatorNode[] = [];
    const schedule = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const base = 1400 + Math.random() * 1600;
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(base * 1.18, ctx.currentTime + 0.12);
      const tone = ctx.createGain();
      const now = ctx.currentTime;
      tone.gain.setValueAtTime(0.0001, now);
      tone.gain.exponentialRampToValueAtTime(0.018 + Math.random() * 0.012, now + 0.03);
      tone.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(tone);
      tone.connect(master);
      osc.start();
      osc.stop(now + 0.24);
      birds.push(osc);
      timer = window.setTimeout(schedule, 1400 + Math.random() * 2600);
    };
    schedule();
    return {
      stop: () => {
        window.clearTimeout(timer);
        stopSource(bed);
        for (const bird of birds) stopOsc(bird);
      },
    };
  }

  private harp(ctx: AudioContext, master: GainNode): Stoppable {
    const notes = [196, 220, 246.94, 293.66, 329.63, 392];
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 98;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.03;
    drone.connect(droneGain);
    droneGain.connect(master);
    drone.start();
    let timer = 0;
    const tones: OscillatorNode[] = [];
    const schedule = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)] ?? 220;
      const tone = ctx.createGain();
      const now = ctx.currentTime;
      tone.gain.setValueAtTime(0.0001, now);
      tone.gain.exponentialRampToValueAtTime(0.045, now + 0.08);
      tone.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      osc.connect(tone);
      tone.connect(master);
      osc.start();
      osc.stop(now + 2.5);
      tones.push(osc);
      timer = window.setTimeout(schedule, 1700 + Math.random() * 1400);
    };
    schedule();
    return {
      stop: () => {
        window.clearTimeout(timer);
        stopOsc(drone);
        for (const tone of tones) stopOsc(tone);
      },
    };
  }

  private wind(ctx: AudioContext, master: GainNode): Stoppable {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    filter.connect(gain);
    gain.connect(master);
    const source = loopNoise(ctx, noiseBuffer(ctx, "brown", 3), filter);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 280;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    const amp = ctx.createOscillator();
    amp.frequency.value = 0.05;
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0.12;
    amp.connect(ampGain);
    ampGain.connect(gain.gain);
    lfo.start();
    amp.start();
    return {
      stop: () => {
        stopSource(source);
        stopOsc(lfo);
        stopOsc(amp);
      },
    };
  }

  private rain(ctx: AudioContext, master: GainNode): Stoppable {
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = "lowpass";
    bedFilter.frequency.value = 900;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.55;
    bedFilter.connect(bedGain);
    bedGain.connect(master);
    const bed = loopNoise(ctx, noiseBuffer(ctx, "brown", 3), bedFilter);
    let timer = 0;
    const drops: AudioBufferSourceNode[] = [];
    const schedule = () => {
      const burst = ctx.createBufferSource();
      const frames = Math.floor(ctx.sampleRate * 0.045);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      burst.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 700 + Math.random() * 1600;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.04, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      burst.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      burst.start();
      burst.stop(now + 0.09);
      drops.push(burst);
      timer = window.setTimeout(schedule, 160 + Math.random() * 520);
    };
    schedule();
    return {
      stop: () => {
        window.clearTimeout(timer);
        stopSource(bed);
        for (const drop of drops) stopSource(drop);
      },
    };
  }

  private water(ctx: AudioContext, master: GainNode): Stoppable {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 640;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    filter.connect(gain);
    gain.connect(master);
    const bed = loopNoise(ctx, noiseBuffer(ctx, "brown", 3), filter);
    let timer = 0;
    const tones: OscillatorNode[] = [];
    const schedule = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 160 + Math.random() * 220;
      const toneGain = ctx.createGain();
      const now = ctx.currentTime;
      toneGain.gain.setValueAtTime(0.0001, now);
      toneGain.gain.exponentialRampToValueAtTime(0.03, now + 0.03);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.connect(toneGain);
      toneGain.connect(master);
      osc.start();
      osc.stop(now + 0.46);
      tones.push(osc);
      timer = window.setTimeout(schedule, 420 + Math.random() * 900);
    };
    schedule();
    return {
      stop: () => {
        window.clearTimeout(timer);
        stopSource(bed);
        for (const tone of tones) stopOsc(tone);
      },
    };
  }
}

function stopSource(source: AudioBufferSourceNode) {
  try {
    source.stop();
  } catch {
    /* already stopped */
  }
  try {
    source.disconnect();
  } catch {
    /* already disconnected */
  }
}

function stopOsc(osc: OscillatorNode) {
  try {
    osc.stop();
  } catch {
    /* already stopped */
  }
  try {
    osc.disconnect();
  } catch {
    /* already disconnected */
  }
}

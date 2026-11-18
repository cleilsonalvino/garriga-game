import { WeatherType } from './types';

export interface AmbienceParams {
  active: boolean;
  worldHour: number;
  weather: WeatherType;
  weatherIntensity: number;
  isInterior: boolean;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastStepTime = 0;

  // Dynamic ambient audio graph
  private ambientMasterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private ambientInitialized = false;

  // Event timers for procedural nature sounds
  private birdTimer = 1.4;
  private cricketTimer = 0.8;
  private owlTimer = 10.0;
  private dropTimer = 0.4;
  private breezePhase = 0;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.ambientMasterGain) {
      const now = this.ctx.currentTime;
      this.ambientMasterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.08);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock() {
    if (this.muted) return;
    this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.ambientInitialized) {
      this.initAmbientGraph(this.ctx);
    }
    return this.ctx;
  }

  private initAmbientGraph(ctx: AudioContext) {
    this.ambientInitialized = true;

    // 3-second soft pink/brownish noise buffer for wind & rain synthesis
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.8;
    }

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);
    this.ambientMasterGain = master;

    // Wind / Countryside Breeze bed
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 360;
    windFilter.Q.value = 0.7;

    const windGain = ctx.createGain();
    windGain.gain.value = 0;

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();

    this.windFilter = windFilter;
    this.windGain = windGain;

    // Rain pattering bed (brighter noise shaped by bandpass/lowpass)
    const rainBuf = ctx.createBuffer(1, length, sampleRate);
    const rData = rainBuf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      rData[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.55;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;

    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();

    this.rainFilter = rainFilter;
    this.rainGain = rainGain;
  }

  /**
   * Updates continuous wind/rain beds and schedules dynamic time-of-day
   * nature sounds (morning birds, afternoon songbirds, night crickets & owls).
   */
  updateAmbience(dt: number, params: AmbienceParams) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') {
      if (this.ctx && this.ambientMasterGain) {
        this.ambientMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    if (!this.ambientInitialized) {
      this.initAmbientGraph(this.ctx);
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (!params.active) {
      this.ambientMasterGain?.gain.setTargetAtTime(0, now, 0.14);
      return;
    }
    this.ambientMasterGain?.gain.setTargetAtTime(1, now, 0.18);

    const h = ((params.worldHour % 24) + 24) % 24;
    const wi = Math.max(0, Math.min(1, params.weatherIntensity));
    const interiorScale = params.isInterior ? 0.2 : 1.0;

    // Gentle breathing wind modulation
    this.breezePhase += dt * 0.65;
    const breezeSwell = 0.78 + Math.sin(this.breezePhase) * 0.22;

    const baseWind =
      params.weather === 'RAINY'
        ? 0.055 * wi
        : params.weather === 'CLOUDY'
        ? 0.042 * wi
        : 0.022;
    const targetWindGain = baseWind * breezeSwell * interiorScale;
    const targetWindFreq =
      params.isInterior
        ? 220
        : params.weather === 'RAINY'
        ? 520 + Math.sin(this.breezePhase * 1.3) * 90
        : 340 + Math.sin(this.breezePhase) * 65;

    this.windGain?.gain.setTargetAtTime(targetWindGain, now, 0.25);
    this.windFilter?.frequency.setTargetAtTime(targetWindFreq, now, 0.3);

    // Rain bed (muffled warmer tone when indoors)
    const targetRainGain =
      params.weather === 'RAINY'
        ? 0.085 * wi * (params.isInterior ? 0.32 : 1.0)
        : 0;
    const targetRainFreq = params.isInterior ? 680 : 1850;
    this.rainGain?.gain.setTargetAtTime(targetRainGain, now, 0.28);
    this.rainFilter?.frequency.setTargetAtTime(targetRainFreq, now, 0.25);

    // Rain droplet plinks during rain outdoors
    if (params.weather === 'RAINY' && !params.isInterior) {
      this.dropTimer -= dt;
      if (this.dropTimer <= 0) {
        this.dropTimer = 0.22 + Math.random() * 0.55;
        this.playRainDrop(0.015 * wi);
      }
    }

    // Time-of-day factors
    const isDawnOrMorning = h >= 5.5 && h < 11.5;
    const isAfternoon = h >= 11.5 && h < 17.5;
    const isNightOrDusk = h >= 17.75 || h < 5.75;

    // Morning / Daytime Birds (suppressed during heavy rain; muffled inside)
    if (
      (isDawnOrMorning || isAfternoon) &&
      params.weather !== 'RAINY'
    ) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        const volScale =
          (isDawnOrMorning ? 1.0 : 0.62) *
          (params.weather === 'CLOUDY' ? 0.65 : 1.0) *
          (params.isInterior ? 0.16 : 1.0);
        this.playBirdChirp(volScale);
        this.birdTimer = isDawnOrMorning
          ? 2.1 + Math.random() * 2.8
          : 4.2 + Math.random() * 4.5;
      }
    }

    // Night & Dusk Crickets (active 17:45 -> 05:45; softer when raining)
    if (isNightOrDusk) {
      this.cricketTimer -= dt;
      if (this.cricketTimer <= 0) {
        const rainDamp = params.weather === 'RAINY' ? 0.25 : 1.0;
        const volScale = rainDamp * (params.isInterior ? 0.15 : 1.0);
        this.playCricketChirp(volScale);
        this.cricketTimer = 1.1 + Math.random() * 1.9;
      }

      // Occasional distant owl hoot deep at night (20:30 - 04:45, outdoors, non-rainy)
      const deepNight = h >= 20.5 || h < 4.75;
      if (deepNight && !params.isInterior && params.weather !== 'RAINY') {
        this.owlTimer -= dt;
        if (this.owlTimer <= 0) {
          this.playOwlHoot();
          this.owlTimer = 10 + Math.random() * 10;
        }
      }
    }
  }

  private playAmbientNote(
    freqStart: number,
    freqEnd: number,
    duration: number,
    volume: number,
    delay = 0,
    type: OscillatorType = 'sine',
    pan = 0
  ) {
    if (!this.ctx || !this.ambientMasterGain || this.muted || volume <= 0.0005) {
      return;
    }
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freqEnd),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.02, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    if (typeof ctx.createStereoPanner === 'function' && pan !== 0) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
      gain.connect(panner);
      panner.connect(this.ambientMasterGain);
    } else {
      gain.connect(this.ambientMasterGain);
    }

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playBirdChirp(scale = 1) {
    const pan = (Math.random() - 0.5) * 1.2;
    const base = 1850 + Math.random() * 950;
    const vol = 0.024 * scale;
    const variant = Math.floor(Math.random() * 3);

    if (variant === 0) {
      // Three-note cheerful morning call (estilo bem-te-vi suave)
      this.playAmbientNote(base, base * 1.18, 0.075, vol, 0, 'sine', pan);
      this.playAmbientNote(base * 1.12, base * 1.32, 0.085, vol, 0.11, 'sine', pan);
      this.playAmbientNote(base * 1.45, base * 1.15, 0.13, vol * 1.1, 0.24, 'sine', pan);
    } else if (variant === 1) {
      // Quick double trill
      this.playAmbientNote(base * 1.25, base * 1.55, 0.06, vol, 0, 'triangle', pan);
      this.playAmbientNote(base * 1.35, base * 1.05, 0.08, vol * 0.9, 0.08, 'sine', pan);
    } else {
      // Gentle rising whistle
      this.playAmbientNote(base * 0.9, base * 1.35, 0.14, vol, 0, 'sine', pan);
    }
  }

  private playCricketChirp(scale = 1) {
    const pan = (Math.random() - 0.5) * 1.3;
    const pitch = 4050 + Math.random() * 550;
    const pulses = 3 + Math.floor(Math.random() * 2);
    const vol = 0.016 * scale;

    for (let i = 0; i < pulses; i++) {
      this.playAmbientNote(
        pitch,
        pitch * 0.98,
        0.028,
        vol,
        i * 0.048,
        'sine',
        pan
      );
    }
  }

  private playOwlHoot() {
    const pan = (Math.random() - 0.5) * 1.1;
    this.playAmbientNote(430, 410, 0.28, 0.022, 0, 'sine', pan);
    this.playAmbientNote(395, 340, 0.48, 0.02, 0.36, 'sine', pan);
  }

  private playRainDrop(vol: number) {
    const pan = (Math.random() - 0.5) * 1.4;
    const f = 750 + Math.random() * 650;
    this.playAmbientNote(f, f * 1.45, 0.045, vol, 0, 'sine', pan);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    slideToFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideToFreq),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playFootstep(surface: 'grass' | 'stone' | 'dirt') {
    const now = performance.now();
    if (now - this.lastStepTime < 220) return;
    this.lastStepTime = now;

    if (surface === 'stone') {
      this.tone(240 + Math.random() * 40, 0.045, 'triangle', 0.035, 0, 140);
    } else if (surface === 'dirt') {
      this.tone(150 + Math.random() * 25, 0.055, 'sine', 0.03, 0, 90);
    } else {
      this.tone(185 + Math.random() * 35, 0.05, 'sine', 0.022, 0, 110);
    }
  }

  playCartCreak() {
    this.tone(110, 0.18, 'triangle', 0.04, 0, 92);
    this.tone(165, 0.14, 'sine', 0.025, 0.08, 145);
  }

  playDialogueBlip(pitch = 420) {
    this.tone(pitch + Math.random() * 45, 0.04, 'triangle', 0.035);
  }

  playSelect() {
    this.tone(520, 0.07, 'triangle', 0.06, 0, 680);
  }

  playCollect() {
    this.tone(587.33, 0.1, 'triangle', 0.07, 0);
    this.tone(880, 0.16, 'triangle', 0.08, 0.07);
  }

  playLevelUp() {
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      this.tone(n, 0.2, 'triangle', 0.08, idx * 0.08);
    });
  }

  playAgeUp() {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    notes.forEach((n, idx) => {
      this.tone(n, 0.28, 'sine', 0.085, idx * 0.09);
    });
  }

  playAchievement() {
    this.tone(523.25, 0.14, 'triangle', 0.075, 0);
    this.tone(659.25, 0.14, 'triangle', 0.075, 0.09);
    this.tone(783.99, 0.14, 'triangle', 0.075, 0.18);
    this.tone(1046.5, 0.34, 'sine', 0.09, 0.27);
  }

  playSoccerKick() {
    this.tone(160, 0.12, 'sine', 0.11, 0, 55);
  }

  playGoal() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.08, idx * 0.07);
    });
  }

  playMiss() {
    this.tone(240, 0.18, 'sawtooth', 0.05, 0, 130);
  }

  playRadioTune(isLocked: boolean) {
    if (isLocked) {
      this.tone(660, 0.15, 'sine', 0.07, 0);
      this.tone(880, 0.25, 'sine', 0.08, 0.1);
    } else {
      this.tone(310 + Math.random() * 140, 0.06, 'sawtooth', 0.025);
    }
  }

  playDogBark() {
    this.tone(320, 0.07, 'triangle', 0.06, 0, 460);
    this.tone(360, 0.08, 'triangle', 0.06, 0.1, 240);
  }

  playChickenCluck() {
    this.tone(520, 0.05, 'triangle', 0.04, 0, 640);
    this.tone(480, 0.05, 'triangle', 0.04, 0.07, 580);
  }

  playDoorTransition(enteringInterior: boolean) {
    if (enteringInterior) {
      this.tone(180, 0.09, 'triangle', 0.05, 0, 240);
      this.tone(320, 0.08, 'sine', 0.04, 0.07, 260);
    } else {
      this.tone(260, 0.08, 'triangle', 0.05, 0, 190);
      this.tone(390, 0.1, 'sine', 0.04, 0.06, 480);
    }
  }
}

export const soundEngine = new SoundEngine();

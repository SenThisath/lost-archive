// Original, synthesized ambient score. No external audio request is made.
export class ArchiveSound {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private track: HTMLAudioElement | null = null;
  private enabled = true;
  async start(track?: string) {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.065;
      this.gain.connect(this.ctx.destination);
      [130.81, 196, 261.63, 329.63].forEach((f, i) => {
        const o = this.ctx!.createOscillator(),
          g = this.ctx!.createGain();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = i % 2 ? 4 : -4;
        g.gain.value = 0.16 / (i + 1);
        o.connect(g);
        g.connect(this.gain!);
        o.start();
        this.voices.push(o);
      });
    }
    await this.ctx.resume();
    if (track) this.setTrack(track);
  }
  setTrack(src: string) {
    this.track?.pause();
    this.track = new Audio(src);
    this.track.loop = true;
    this.track.volume = 0.3;
    if (this.gain) this.gain.gain.value = 0;
    if (this.enabled) this.track.play().catch(() => {});
  }
  mute(value: boolean) {
    this.enabled = !value;
    if (this.gain)
      this.gain.gain.setTargetAtTime(
        value || this.track ? 0 : 0.065,
        this.ctx!.currentTime,
        0.5,
      );
    if (this.track) {
      if (value) this.track.pause();
      else this.track.play().catch(() => {});
    }
  }
  celebrate(track?: string) {
    if (track) {
      this.setTrack(track);
      return;
    }
    if (!this.ctx) return;
    [174.61, 220, 261.63, 349.23].forEach((f, i) =>
      this.voices[i].frequency.exponentialRampToValueAtTime(
        f,
        this.ctx!.currentTime + 3,
      ),
    );
    this.chime();
  }
  chime() {
    if (!this.ctx || !this.gain || !this.enabled) return;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = this.ctx!.createOscillator(),
        g = this.ctx!.createGain(),
        t = this.ctx!.currentTime + i * 0.16;
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      o.connect(g);
      g.connect(this.gain!);
      o.start(t);
      o.stop(t + 2);
    });
  }
  dispose() {
    this.track?.pause();
    this.voices.forEach((o) => o.stop());
    this.ctx?.close();
  }
}

/**
 * A simple audio service using Web Audio API to provide background "music" 
 * without needing external assets.
 */

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private gainNode: GainNode | null = null;
  private interval: any = null;

  async init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);
      this.gainNode.gain.value = 0.5; // Significant volume boost
    }
    
    // Modern browsers require resuming the context after a user interaction
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  playMelody() {
    if (!this.audioCtx || this.isPlaying) return;
    this.isPlaying = true;
    
    // Ensure we are resumed
    this.audioCtx.resume();
    
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 Pentatonic
    let step = 0;

    this.interval = setInterval(() => {
      if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
      
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      
      // Main oscillator
      const osc = this.audioCtx.createOscillator();
      const node = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      
      node.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      node.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.2);
      
      osc.connect(node);
      node.connect(this.gainNode!);
      
      // Light harmony
      const osc2 = this.audioCtx.createOscillator();
      const node2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, this.audioCtx.currentTime);
      node2.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      node2.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
      
      osc2.connect(node2);
      node2.connect(this.gainNode!);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 1.2);
      osc2.start();
      osc2.stop(this.audioCtx.currentTime + 0.8);
      
      step++;
    }, 450); // Faster rhythm
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.isPlaying = false;
  }

  setVolume(v: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = v;
    }
  }

  playFailSound() {
    if (!this.audioCtx) return;
    this.audioCtx.resume();
    
    const osc = this.audioCtx.createOscillator();
    const node = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.5);
    
    node.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    node.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);
    
    osc.connect(node);
    node.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.5);
  }
}

export const audioService = new AudioService();

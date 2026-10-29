export const playVictorySound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    // Resume context if needed (browsers sometimes require it on fresh contexts)
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    
    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };
    
    // Cheerful arpeggio (magical sound)
    playTone(523.25, 0.0, 0.2, 'sine');     // C5
    playTone(659.25, 0.1, 0.2, 'sine');     // E5
    playTone(783.99, 0.2, 0.2, 'sine');     // G5
    playTone(1046.50, 0.3, 0.5, 'sine');    // C6
    
    // Add some harmony
    playTone(392.00, 0.0, 0.3, 'triangle'); // G4
    playTone(523.25, 0.1, 0.3, 'triangle'); // C5
    playTone(659.25, 0.2, 0.3, 'triangle'); // E5
    playTone(783.99, 0.3, 0.6, 'triangle'); // G5
    
  } catch (e) {
    console.log('AudioContext play failed', e);
  }
};

/**
 * Christmas Sounds Generator
 * Creates simple Christmas sounds using Web Audio API
 */

class ChristmasSounds {
    constructor() {
        this.audioContext = null;
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    // Play a simple bell sound
    playBell(frequency = 800, duration = 0.5) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // Play complete Jingle Bells melody
    playJingleBells() {
        if (!this.audioContext) return;
        
        // Complete Jingle Bells melody with proper timing
        const melody = [
            // "Jingle bells, jingle bells"
            { freq: 659.25, time: 0, duration: 0.25 },      // E
            { freq: 659.25, time: 0.3, duration: 0.25 },    // E
            { freq: 659.25, time: 0.6, duration: 0.5 },     // E
            
            { freq: 659.25, time: 1.2, duration: 0.25 },    // E
            { freq: 659.25, time: 1.5, duration: 0.25 },    // E
            { freq: 659.25, time: 1.8, duration: 0.5 },     // E
            
            // "Jingle all the way"
            { freq: 659.25, time: 2.4, duration: 0.25 },    // E
            { freq: 783.99, time: 2.7, duration: 0.25 },    // G
            { freq: 523.25, time: 3.0, duration: 0.35 },    // C
            { freq: 587.33, time: 3.4, duration: 0.15 },    // D
            { freq: 659.25, time: 3.6, duration: 0.8 },     // E
            
            // "Oh what fun it is to ride"
            { freq: 698.46, time: 4.5, duration: 0.25 },    // F
            { freq: 698.46, time: 4.8, duration: 0.25 },    // F
            { freq: 698.46, time: 5.1, duration: 0.3 },     // F
            { freq: 698.46, time: 5.5, duration: 0.15 },    // F
            { freq: 659.25, time: 5.7, duration: 0.25 },    // E
            { freq: 659.25, time: 6.0, duration: 0.25 },    // E
            { freq: 659.25, time: 6.3, duration: 0.15 },    // E
            { freq: 659.25, time: 6.5, duration: 0.15 },    // E
            
            // "In a one-horse open sleigh"
            { freq: 659.25, time: 6.7, duration: 0.25 },    // E
            { freq: 587.33, time: 7.0, duration: 0.25 },    // D
            { freq: 587.33, time: 7.3, duration: 0.25 },    // D
            { freq: 659.25, time: 7.6, duration: 0.25 },    // E
            { freq: 587.33, time: 7.9, duration: 0.5 },     // D
            { freq: 783.99, time: 8.5, duration: 0.8 },     // G
        ];
        
        melody.forEach(note => {
            setTimeout(() => {
                this.playNote(note.freq, note.duration);
            }, note.time * 1000);
        });
    }
    
    // Play a musical note with proper envelope
    playNote(frequency, duration = 0.3) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'triangle'; // Softer sound for melody
        
        const now = this.audioContext.currentTime;
        
        // ADSR envelope for musical note
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02); // Attack
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1); // Decay
        gainNode.gain.setValueAtTime(0.15, now + duration - 0.05); // Sustain
        gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release
        
        oscillator.start(now);
        oscillator.stop(now + duration);
    }
    
    // Play "Ho Ho Ho" sound effect - Improved version
    playHoHoHo() {
        if (!this.audioContext) return;
        
        console.log('🎅 Playing Ho Ho Ho sound...');
        
        // Create three "Ho" sounds with better quality
        const hoTimes = [0, 0.6, 1.2];
        
        hoTimes.forEach((time, index) => {
            setTimeout(() => {
                // Create multiple oscillators for richer sound
                const oscillator1 = this.audioContext.createOscillator();
                const oscillator2 = this.audioContext.createOscillator();
                const oscillator3 = this.audioContext.createOscillator();
                
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                // Connect oscillators
                oscillator1.connect(gainNode);
                oscillator2.connect(gainNode);
                oscillator3.connect(gainNode);
                gainNode.connect(filter);
                filter.connect(this.audioContext.destination);
                
                // Set frequencies for deep voice
                oscillator1.frequency.value = 120; // Base frequency
                oscillator2.frequency.value = 180; // Harmonic
                oscillator3.frequency.value = 240; // Higher harmonic
                
                oscillator1.type = 'sawtooth';
                oscillator2.type = 'square';
                oscillator3.type = 'triangle';
                
                // Filter for voice-like quality
                filter.type = 'lowpass';
                filter.frequency.value = 400;
                filter.Q.value = 5;
                
                // Volume envelope
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
                gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                // Start and stop
                oscillator1.start(now);
                oscillator2.start(now);
                oscillator3.start(now);
                
                oscillator1.stop(now + 0.5);
                oscillator2.stop(now + 0.5);
                oscillator3.stop(now + 0.5);
                
                console.log(`🎅 Ho #${index + 1}`);
            }, time * 1000);
        });
    }
    
    // Play sleigh bells
    playSleighBells() {
        if (!this.audioContext) return;
        
        const bellFrequencies = [800, 900, 1000, 1100];
        let delay = 0;
        
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const freq = bellFrequencies[Math.floor(Math.random() * bellFrequencies.length)];
                this.playBell(freq, 0.2);
            }, delay);
            delay += 150;
        }
    }
    
    // Play magical sparkle sound
    playSparkle() {
        if (!this.audioContext) return;
        
        const frequencies = [1200, 1600, 2000, 2400];
        frequencies.forEach((freq, i) => {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                const now = this.audioContext.currentTime;
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
            }, i * 50);
        });
    }
    
    // Play whoosh sound (for Santa flying)
    playWhoosh() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sawtooth';
        filter.type = 'lowpass';
        
        const now = this.audioContext.currentTime;
        
        // Sweep frequency for whoosh effect
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
        
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
    
    // Play "We Wish You a Merry Christmas" melody
    playMerryChristmas() {
        if (!this.audioContext) return;
        
        const melody = [
            // "We wish you a Merry Christmas"
            { freq: 523.25, time: 0, duration: 0.3 },       // C
            { freq: 698.46, time: 0.35, duration: 0.3 },    // F
            { freq: 698.46, time: 0.7, duration: 0.15 },    // F
            { freq: 783.99, time: 0.9, duration: 0.3 },     // G
            { freq: 698.46, time: 1.25, duration: 0.3 },    // F
            { freq: 659.25, time: 1.6, duration: 0.3 },     // E
            
            { freq: 587.33, time: 2.0, duration: 0.3 },     // D
            { freq: 587.33, time: 2.35, duration: 0.15 },   // D
            { freq: 783.99, time: 2.55, duration: 0.3 },    // G
            { freq: 783.99, time: 2.9, duration: 0.15 },    // G
            { freq: 880.00, time: 3.1, duration: 0.3 },     // A
            { freq: 783.99, time: 3.45, duration: 0.3 },    // G
            { freq: 698.46, time: 3.8, duration: 0.3 },     // F
            
            // "And a Happy New Year"
            { freq: 659.25, time: 4.2, duration: 0.3 },     // E
            { freq: 1046.50, time: 4.55, duration: 0.3 },   // C (high)
            { freq: 1046.50, time: 4.9, duration: 0.15 },   // C (high)
            { freq: 1046.50, time: 5.1, duration: 0.15 },   // C (high)
            { freq: 880.00, time: 5.3, duration: 0.3 },     // A
            { freq: 698.46, time: 5.65, duration: 0.3 },    // F
            { freq: 523.25, time: 6.0, duration: 0.6 },     // C
        ];
        
        melody.forEach(note => {
            setTimeout(() => {
                this.playNote(note.freq, note.duration);
            }, note.time * 1000);
        });
    }
    
    // Play complete intro sequence - Only We Wish You a Merry Christmas
    playIntroSequence() {
        console.log('🎄 Playing We Wish You a Merry Christmas...');
        
        // Play the full song
        this.playMerryChristmas();
    }
}

// Export for use in intro
window.ChristmasSounds = ChristmasSounds;

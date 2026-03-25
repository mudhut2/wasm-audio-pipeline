VoiceKernel is an Emscripten-backed audio processing module designed for low-latency microphone capture and chunked data accumulation. It provides a high-level JavaScript interface to handle complex Web Audio and WebAssembly interactions.

-- Installation --

Ensure the following files are located in your project directory:

    voice-kernel.js

    Supporting Emscripten .wasm and .worker.js files

    (all files in /dist)

Due to browser security policies, VoiceKernel requires an HTTPS connection (or localhost) and a user interaction (like a click) to initialize the AudioContext.

-- Basic Usage --

import VoiceKernel from './voice-kernel.js';

    async function initMic() {
        try {
            const mic = await VoiceKernel.create({
                mode: 'passthrough',    // 'passthrough', 'accumulate', or 'both'
                gain: 1.0,              // Input gain multiplier
                chunkDuration: 250,      // Callback interval in milliseconds
                onChunk: (samples) => {
                    // samples is a Float32Array
                    console.log("New audio chunk received:", samples);
                }
            });
    
            // Example: Update gain after 5 seconds
            setTimeout(() => mic.setGain(0.5), 5000);
    
        } catch (error) {
            console.error("Failed to initialize microphone:", error);
        }
    }

-- API Reference --

Static Methods

    VoiceKernel.create(options) // Initializes the microphone and returns a VoiceKernel instance.

    options.mode: String. Options: passthrough, accumulate, both.

    options.gain: Float. The volume multiplier.

    options.chunkDuration: Integer. The duration of audio (ms) per chunk callback.

    options.onChunk: Function. Called when a new buffer of samples is ready.

Instance Methods

    setGain(value) // Adjusts the input gain in real-time.

    value: Float (e.g., 1.0 is original volume, 0.0 is muted).

    setMode(mode, chunkDuration) // Changes the processing behavior without destroying the instance.

    mode: String (passthrough, accumulate, both).

    chunkDuration: Integer (ms).

    getAnalyser() // Returns the native Web Audio AnalyserNode. Use this for generating waveforms or frequency data.

    destroy() // Closes the microphone stream, stops the internal processing loop, and releases memory.
Operational Modes
Mode	Behavior	Use Case
    
    passthrough	Minimal processing latency.	Live monitoring and visualizers.
    
    accumulate	Collects samples into buffers of chunkDuration.	STT, recording, or server streaming.
    
    both	Simultaneous passthrough and accumulation.	Monitoring while recording.

    Sample Rate: Defaults to the browser's hardware sample rate (usually 44.1kHz or 48kHz).

    Buffer Format: 32-bit Floating Point (Float32Array).

    Architecture: Uses an Emscripten-compiled core for high-performance DSP tasks.

/**
 * VoiceKernel — low latency mic audio module
 * 
 * Usage:
 *   import VoiceKernel from './voice-kernel.js'
 * 
 *   const mic = await VoiceKernel.create({
 *       mode: 'passthrough',
 *       gain: 1.0,
 *       chunkDuration: 250,
 *       echoCancellation: false,
 *       noiseSuppression: false,
 *       autoGainControl: false,
 *       onChunk: (samples) => { ... }
 *   })
 * 
 *   mic.setGain(0.5)
 *   mic.setMode('accumulate')
 *   mic.destroy()
 */

const WORKLET_PATH = new URL('./worklet-processor.js', import.meta.url).href;
const WASM_PATH = new URL('./processor.wasm', import.meta.url).href;

class VoiceKernel {

    // private — use VoiceKernel.create() instead
    constructor({ audioCtx, workletNode, analyser, stream, options }) {
        this._audioCtx = audioCtx;
        this._workletNode = workletNode;
        this._analyser = analyser;
        this._stream = stream;
        this._mode = options.mode || 'passthrough';
        this._onChunk = options.onChunk || null;
    }

    static async create(options = {}) {
        const {
            mode = 'passthrough',
            gain = 1.0,
            chunkDuration = 250,
            echoCancellation = false,
            noiseSuppression = false,
            autoGainControl = false,
            onChunk = null,
        } = options;

        // 1. mic access
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation,
                noiseSuppression,
                autoGainControl,
                channelCount: 1,
            }
        });

        // 2. audio context
        const audioCtx = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 48000,
        });

        // 3. fetch WASM on main thread — worklet thread cannot use fetch()
        const res = await fetch(WASM_PATH);
        if (!res.ok) throw new Error(`VoiceKernel: failed to fetch WASM (${res.status})`);
        const wasmBytes = await res.arrayBuffer();

        // 4. load worklet module
        await audioCtx.audioWorklet.addModule(WORKLET_PATH);

        // 5. create worklet node
        const workletNode = new AudioWorkletNode(audioCtx, 'audio-kernel', {
            processorOptions: {
                wasmBytes,
                mode,
                gain,
                sampleRate: audioCtx.sampleRate,
                chunkDuration,
            },
            channelCount: 1,
            channelCountMode: 'explicit',
            channelInterpretation: 'discrete',
            numberOfOutputs: 1,
        });

        // 6. handle messages from worklet
        workletNode.port.onmessage = (e) => {
            if (e.data.type === 'chunk' && onChunk) {
                onChunk(new Float32Array(e.data.audio));
            }
        };

        // 7. wire audio graph
        // mic → worklet → analyser (for visualisation if needed)
        // worklet → destination (only when mode outputs to speakers)
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;

        const micSource = audioCtx.createMediaStreamSource(stream);
        micSource.connect(workletNode);
        workletNode.connect(analyser);

        if (mode !== 'accumulate') {
            workletNode.connect(audioCtx.destination);
        }

        return new VoiceKernel({ audioCtx, workletNode, analyser, stream, options });
    }

    /**
     * Set the output gain.
     * @param {number} value - 0.0 (silent) to 2.0 (double volume), 1.0 is unity
     */
    setGain(value) {
        this._workletNode.port.postMessage({ type: 'param', id: 0, value });
    }

    /**
     * Switch mode at runtime without restarting the pipeline.
     * @param {string} mode - 'passthrough' | 'accumulate' | 'both'
     * @param {number} chunkDuration - optional new chunk size in ms
     */
    setMode(mode, chunkDuration) {
        this._mode = mode;

        this._workletNode.port.postMessage({
            type: 'setMode',
            mode,
            sampleRate: this._audioCtx.sampleRate,
            chunkDuration: chunkDuration || undefined,
        });

        // rewire destination based on new mode
        try { this._workletNode.disconnect(this._audioCtx.destination); } catch (_) { }
        if (mode !== 'accumulate') {
            this._workletNode.connect(this._audioCtx.destination);
        }
    }

    /**
     * Expose the analyser node so devs can build their own visualisations.
     * @returns {AnalyserNode}
     */
    getAnalyser() {
        return this._analyser;
    }

    /**
     * Tear down the pipeline — stops mic, closes audio context, cleans up.
     */
    destroy() {
        if (this._workletNode) { this._workletNode.disconnect(); this._workletNode = null; }
        if (this._analyser) { this._analyser.disconnect(); this._analyser = null; }
        if (this._audioCtx) { this._audioCtx.close(); this._audioCtx = null; }
        if (this._stream) { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
    }
}

export default VoiceKernel;

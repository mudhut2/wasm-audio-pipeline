class AudioKernelProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.instance = null;
        this.heap = null;
        this.cppInstancePtr = null;

        const wasmBytes = options.processorOptions.wasmBytes;

        WebAssembly.instantiate(wasmBytes).then(result => {
            this.instance = result.instance;
            this.heap = new Float32Array(this.instance.exports.memory.buffer);
            this.cppInstancePtr = this.instance.exports.create_kernel();
        });

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_AMOUNT' && this.instance) {
                this.instance.exports.set_amount(this.cppInstancePtr, parseFloat(e.data.value));
            }
        };
    }

    process(inputs, outputs) {
        const input = inputs[0][0];       // Microphone (Mono)
        const outputChannels = outputs[0]; // Speaker channels (Stereo)

        // Safety check
        if (!input || !outputChannels[0]) return true;

        // Bypass if WASM is loading
        if (!this.instance || !this.cppInstancePtr) {
            outputChannels[0].set(input);
            if (outputChannels[1]) outputChannels[1].set(input);
            return true;
        }

        const numFrames = input.length;
        const inPtr = 0;
        const outPtr = 1024; // Buffer offset to prevent memory collision

        // 1. Copy Mic data to WASM memory
        this.heap.set(input, inPtr / 4);

        // 2. Run C++ 
        this.instance.exports.process_audio(
            this.cppInstancePtr,
            inPtr,
            outPtr,
            numFrames
        );

        // 3. Get the audio data back
        const audioData = this.heap.subarray(outPtr / 4, (outPtr / 4) + numFrames);

        // 4. Mirror to both channels for stereo audio
        for (let channel = 0; channel < outputChannels.length; channel++) {
            outputChannels[channel].set(audioData);
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioKernelProcessor);

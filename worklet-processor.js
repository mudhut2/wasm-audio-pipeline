class AudioKernelProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        const opts = options.processorOptions;

        this.mode = opts.mode || 'passthrough';
        this.chunkSize = Math.floor(
            (opts.sampleRate || 48000) * ((opts.chunkDuration || 250) / 1000)
        );

        this.instance = null;
        this.cppInstancePtr = null;
        this.inPtr = null;
        this.outPtr = null;
        this.inputView = null;
        this.outputView = null;
        this.isReady = false;

        // gain handled in JS — reliable across all browsers
        this.gain = 1.0;

        this.accumulator = new Float32Array(this.chunkSize);
        this.accumulatorIndex = 0;

        WebAssembly.instantiate(opts.wasmBytes).then(result => {
            this.instance = result.instance;
            const exp = this.instance.exports;

            this.cppInstancePtr = exp.create_kernel();
            this.inPtr = exp.get_input_ptr();
            this.outPtr = exp.get_output_ptr();

            this.inputView = new Float32Array(exp.memory.buffer, this.inPtr, 128);
            this.outputView = new Float32Array(exp.memory.buffer, this.outPtr, 128);

            this.isReady = true;
        });

        this.port.onmessage = (event) => {
            const { type, id, value, mode, chunkDuration, sampleRate } = event.data;

            if (type === 'param') {
                // gain applied in JS so it works regardless of WASM export issues
                if (id === 0) this.gain = value;
            }

            if (type === 'setMode') {
                this.mode = mode;
                this.accumulatorIndex = 0;
                if (chunkDuration && sampleRate) {
                    this.chunkSize = Math.floor(sampleRate * (chunkDuration / 1000));
                    this.accumulator = new Float32Array(this.chunkSize);
                }
            }
        };
    }

    process(inputs, outputs) {
        const input = inputs[0][0];
        const outputChannels = outputs[0];

        if (!input || !outputChannels[0]) return true;

        // bypass while WASM loads — apply gain so slider still works during load
        if (!this.isReady) {
            for (let i = 0; i < input.length; i++) {
                outputChannels[0][i] = input[i] * this.gain;
            }
            if (outputChannels[1]) outputChannels[1].set(outputChannels[0]);
            return true;
        }

        // reattach views if WASM memory grew
        if (this.inputView.buffer !== this.instance.exports.memory.buffer) {
            this.inputView = new Float32Array(this.instance.exports.memory.buffer, this.inPtr, 128);
            this.outputView = new Float32Array(this.instance.exports.memory.buffer, this.outPtr, 128);
        }

        // run WASM kernel (handles fade-in, any DSP you add later)
        this.inputView.set(input);
        this.instance.exports.process_audio(
            this.cppInstancePtr,
            this.inPtr,
            this.outPtr,
            input.length
        );

        // apply gain in JS after WASM — guaranteed to work
        if (this.mode === 'passthrough' || this.mode === 'both') {
            for (let i = 0; i < this.outputView.length; i++) {
                outputChannels[0][i] = this.outputView[i] * this.gain;
            }
            if (outputChannels[1]) outputChannels[1].set(outputChannels[0]);
        }

        if (this.mode === 'accumulate' || this.mode === 'both') {
            this._accumulate(this.outputView);
        }

        return true;
    }

    _accumulate(frame) {
        const remaining = this.chunkSize - this.accumulatorIndex;

        if (remaining >= 128) {
            this.accumulator.set(frame, this.accumulatorIndex);
            this.accumulatorIndex += 128;
        } else {
            const overflow = frame.subarray(remaining);
            this.accumulator.set(frame.subarray(0, remaining), this.accumulatorIndex);
            this.accumulatorIndex = this.chunkSize;
            this._postChunk();
            this.accumulator.set(overflow, 0);
            this.accumulatorIndex = overflow.length;
            return;
        }

        if (this.accumulatorIndex >= this.chunkSize) {
            this._postChunk();
            this.accumulatorIndex = 0;
        }
    }

    _postChunk() {
        const transfer = this.accumulator.buffer.slice(0);
        this.port.postMessage({ type: 'chunk', audio: transfer });
    }

    disconnectedCallback() {
        if (this.instance && this.cppInstancePtr) {
            this.instance.exports.destroy_kernel(this.cppInstancePtr);
        }
    }
}

registerProcessor('audio-kernel', AudioKernelProcessor);

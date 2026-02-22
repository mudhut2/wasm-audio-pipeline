#include <emscripten.h>

class AudioKernel {
public:
    float gain        = 1.0f;
    float currentFade = 0.0f;
    float fadeStep    = 0.002f; // fades in over ~500 samples (~10ms), prevents click on load

    void process(float* input, float* output, int numFrames) {
        for (int i = 0; i < numFrames; ++i) {
            if (currentFade < 1.0f) currentFade += fadeStep;

            float processed = input[i] * gain;

            // crossfade from raw to processed on startup — avoids click
            output[i] = (input[i] * (1.0f - currentFade)) + (processed * currentFade);
        }
    }
};

// C++ owns these — JS asks for their addresses, never invents them
static float inputBuffer[128];
static float outputBuffer[128];

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    AudioKernel* create_kernel() { return new AudioKernel(); }

    // JS calls these once on init to get real buffer addresses
    EMSCRIPTEN_KEEPALIVE float* get_input_ptr()  { return inputBuffer; }
    EMSCRIPTEN_KEEPALIVE float* get_output_ptr() { return outputBuffer; }

    EMSCRIPTEN_KEEPALIVE
    void process_audio(AudioKernel* kernel, float* input, float* output, int numFrames) {
        kernel->process(input, output, numFrames);
    }

    // id 0 = gain (expand with more ids as you add parameters)
    EMSCRIPTEN_KEEPALIVE
    void set_parameter(AudioKernel* kernel, int id, float value) {
        if (id == 0) kernel->gain = value;
    }

    EMSCRIPTEN_KEEPALIVE
    void destroy_kernel(AudioKernel* kernel) { delete kernel; }
}

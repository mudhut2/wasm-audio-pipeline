#include <emscripten.h>
#include <cmath>

class AudioKernel {
public:
    float amount = 1.0f;

    void process(float* input, float* output, int frames) {
        for(int i = 0; i < frames; i++) {
            output[i] = input[i];
        }
    }
};

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    AudioKernel* create_kernel() {
        return new AudioKernel();
    }
    EMSCRIPTEN_KEEPALIVE
        void set_amount(AudioKernel* instance, float newAmount) {
            if (instance) {
                instance->amount = newAmount;
            }
    }
    EMSCRIPTEN_KEEPALIVE
    void process_audio(AudioKernel* instance, float* in, float* out, int frames) {
        instance->process(in, out, frames);
    }
}


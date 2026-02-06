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

    void setParameter(int paramId, float value) {
        switch (paramId) {
            // A dev can add Case 3, 4, 5 without touching JS!
        }
    }
};

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    AudioKernel* create_kernel() {
        return new AudioKernel();
    }

    EMSCRIPTEN_KEEPALIVE
    void process_audio(AudioKernel* instance, float* in, float* out, int frames) {
        instance->process(in, out, frames);
    }

    EMSCRIPTEN_KEEPALIVE
    void destroy_kernel(AudioKernel* kernel) {
        if(kernel != nullptr) {
            delete kernel;
        }
    }
    EMSCRIPTEN_KEEPALIVE
    void set_parameter(AudioKernel* kernel, int paramID, float value) {
        kernel->setParameter(paramID, value);
    }
}


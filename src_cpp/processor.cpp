#include <emscripten.h>
#include <cmath>

class BitCrusher {
public:
    float amount = 1.0f;

    void process(float* input, float* output, int frames) {
        for(int i = 0; i < frames; i++) {
            // output[i] = std::floor(input[i] / amount) * amount;
            output[i] = input[i];
        }
    }
};

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    BitCrusher* create_crusher() {
        return new BitCrusher();
    }
    EMSCRIPTEN_KEEPALIVE
        void set_amount(BitCrusher* instance, float newAmount) {
            if (instance) {
                instance->amount = newAmount;
            }
    }

    EMSCRIPTEN_KEEPALIVE
    void process_crusher(BitCrusher* instance, float* in, float* out, int frames) {
        instance->process(in, out, frames);
    }
}

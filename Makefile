CC = emcc
SRC = processor.cpp
OUT = processor.wasm

FLAGS = -O3 \
        -s EXPORTED_FUNCTIONS='["_create_kernel","_get_input_ptr","_get_output_ptr","_process_audio","_set_parameter","_destroy_kernel"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
        -s ALLOW_MEMORY_GROWTH=1 \
        --no-entry

all:
	$(CC) $(SRC) -o $(OUT) $(FLAGS)
	@echo "Build complete: $(OUT)"

clean:
	rm -rf build

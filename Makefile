# Compiler settings
CC = emcc
SRC = src_cpp/processor.cpp
OUT = build/processor.wasm

# Emscripten flags
# Note: Ensure these match the functions you've defined in extern "C"
FLAGS = -s EXPORTED_FUNCTIONS="['_create_crusher','_process_crusher','_set_amount']" \
        -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']" \
        -s ALLOW_MEMORY_GROWTH=1 \
        --no-entry

# Default build rule
all:
	@mkdir -p build
	$(CC) $(SRC) -o $(OUT) $(FLAGS)
	@echo "Build complete: $(OUT)"

# Clean the build directory
clean:
	rm -rf build/*.wasm

CC = gcc
CFLAGS = -std=c99 -Wall -Wextra -Wpedantic -O2

.PHONY: all demo test clean
all: build/mini_compiler

build/mini_compiler: src/mini_compiler.c
	mkdir -p build
	$(CC) $(CFLAGS) $< -o $@

demo: all
	./build/mini_compiler examples/hello.str

test: all
	MINI_COMPILER="$(CURDIR)/build/mini_compiler" python3 -m unittest discover -s tests -v

clean:
	rm -f build/mini_compiler build/ast.dot

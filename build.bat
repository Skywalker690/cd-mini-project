@echo off
setlocal
cd /d "%~dp0"
if not exist build mkdir build
where gcc >nul 2>nul
if not errorlevel 1 (
  goto build_gcc
)
where clang >nul 2>nul
if not errorlevel 1 (
  goto build_clang
)
where zig >nul 2>nul
if not errorlevel 1 (
  goto build_zig
)
if exist .build\tools\zig-windows-x86_64-0.13.0\zig.exe (
  goto build_local_zig
)
echo A C compiler is required. Put GCC, Clang or Zig on PATH.
echo See README.md for build commands. The source uses standard C99 only.
exit /b 2

:build_gcc
gcc -std=c99 -Wall -Wextra -Wpedantic -O2 src\mini_compiler.c -o build\mini_compiler.exe
exit /b %errorlevel%
:build_clang
clang -std=c99 -Wall -Wextra -Wpedantic -O2 src\mini_compiler.c -o build\mini_compiler.exe
exit /b %errorlevel%
:build_zig
zig cc -std=c99 -Wall -Wextra -Wpedantic -O2 src\mini_compiler.c -o build\mini_compiler.exe
exit /b %errorlevel%
:build_local_zig
.build\tools\zig-windows-x86_64-0.13.0\zig.exe cc -std=c99 -Wall -Wextra -Wpedantic -O2 src\mini_compiler.c -o build\mini_compiler.exe
exit /b %errorlevel%

@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
if not exist build\mini_compiler.exe call build.bat
if not exist build\mini_compiler.exe exit /b 2
echo Running the valid program...
build\mini_compiler.exe examples\hello.str
echo.
pause
echo Showing AST and exporting a fresh DOT file in build...
build\mini_compiler.exe examples\ast_demo.str --ast --dot build\demo_ast_%RANDOM%.dot
echo.
pause
echo Showing a lexical error...
build\mini_compiler.exe examples\lexical_error.str --check
echo.
pause
echo Showing a syntax error...
build\mini_compiler.exe examples\syntax_error.str --check
echo.
pause
echo Showing semantic errors...
build\mini_compiler.exe examples\semantic_error.str --check
echo.
pause

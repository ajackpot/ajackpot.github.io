@echo off
setlocal
call "%~dp0\_path-context.bat"
node "%~dp0\make-mpc-runtime-variant.mjs" %*

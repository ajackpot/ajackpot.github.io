@echo off
setlocal
call "%~dp0..\evaluator-training\_path-context.bat"
node "%~dp0run-stage133-classic-mtdf-adoption-suite.mjs" %*

@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "SOURCE_SUITE_DIR=%~1"
if "%SOURCE_SUITE_DIR%"=="" (
  echo Usage: tools\evaluator-training\run-evaluation-profile-patch-suite.bat ^<source-suite-dir^> [output-dir] [additional-flags...]
  echo Example: tools\evaluator-training\run-evaluation-profile-patch-suite.bat tools\evaluator-training\out\stage130-suite
  echo Example: tools\evaluator-training\run-evaluation-profile-patch-suite.bat tools\evaluator-training\out\stage130-suite tools\evaluator-training\out\stage130-patch --config tools\evaluator-training\examples\evaluation-profile-patch-suite.patch-plus-bench.example.json --resume
  exit /b 1
)

set "OUTPUT_DIR=%~2"
if "%OUTPUT_DIR%"=="" set "OUTPUT_DIR=%EVALUATOR_TRAINING_OUT%\evaluation-profile-patch-suite"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-evaluation-profile-patch-suite.mjs" ^
  --source-suite-dir "%SOURCE_SUITE_DIR%" ^
  --output-dir "%OUTPUT_DIR%" !EXTRA_ARGS!

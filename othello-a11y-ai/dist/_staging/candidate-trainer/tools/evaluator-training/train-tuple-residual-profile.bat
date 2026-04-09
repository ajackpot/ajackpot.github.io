@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\train-tuple-residual-profile.bat ^<input-file-or-dir^> [output-json] [output-module] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-tuple-residual-profile.json"

set "OUTPUT_MODULE=%~3"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_TRAINING_OUT_GENERATED_MODULE%"

shift
shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\train-tuple-residual-profile.mjs" ^
  --input "%INPUT%" ^
  --layout-name orthogonal-adjacent-pairs-outer2-v1 ^
  --phase-buckets midgame-c,late-a,late-b,endgame ^
  --target-scale 3000 ^
  --holdout-mod 10 ^
  --sample-stride 4 ^
  --epochs 1 ^
  --learning-rate 0.05 ^
  --l2 0.0005 ^
  --gradient-clip 90000 ^
  --min-visits 32 ^
  --progress-every 250000 ^
  --output-json "%OUTPUT_JSON%" ^
  --output-module "%OUTPUT_MODULE%" !EXTRA_ARGS!

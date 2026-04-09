@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\calibrate-mpc-profile.bat ^<input-file-or-dir^> [output-json] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-mpc-profile.json"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\calibrate-mpc-profile.mjs" ^
  --input "%INPUT%" ^
  --calibration-buckets 18-21:4^>8,22-25:4^>8,26-29:6^>10,30-33:6^>10 ^
  --sample-stride 200 ^
  --max-samples-per-bucket 400 ^
  --holdout-mod 10 ^
  --time-limit-ms 120000 ^
  --progress-every 20 ^
  --output-json "%OUTPUT_JSON%" !EXTRA_ARGS!

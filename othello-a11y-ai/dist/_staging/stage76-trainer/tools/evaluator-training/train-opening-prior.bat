@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\train-opening-prior.bat ^<input-file-or-dir^> [output-json] [output-module] [additional-flags...]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-opening-prior-profile.json"

set "OUTPUT_MODULE=%~3"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_TRAINING_OUT_OPENING_PRIOR_MODULE%"

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
node "%EVALUATOR_TRAINING_DIR%\train-opening-prior.mjs" ^
  --input "%INPUT%" ^
  --max-ply 18 ^
  --min-position-count 3 ^
  --min-move-count 1 ^
  --max-candidates-per-position 8 ^
  --holdout-mod 10 ^
  --score-source hybrid ^
  --theoretical-score-weight 0.65 ^
  --actual-score-weight 0.35 ^
  --progress-every 5000 ^
  --output-json "%OUTPUT_JSON%" ^
  --output-module "%OUTPUT_MODULE%" !EXTRA_ARGS!

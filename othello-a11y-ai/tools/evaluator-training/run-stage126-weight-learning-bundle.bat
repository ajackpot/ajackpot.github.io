@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\run-stage126-weight-learning-bundle.bat ^<input-file-or-dir^> [output-root] [additional-flags...]
  echo Example: tools\evaluator-training\run-stage126-weight-learning-bundle.bat D:\othello-data\Egaroucid_Train_Data
  echo Example: tools\evaluator-training\run-stage126-weight-learning-bundle.bat D:\othello-data\Egaroucid_Train_Data tools\evaluator-training\out\stage126-weight-learning --resume
  echo Example: tools\evaluator-training\run-stage126-weight-learning-bundle.bat D:\othello-data\Egaroucid_Train_Data tools\evaluator-training\out\stage126-weight-learning --phase all --resume
  exit /b 1
)

set "OUTPUT_ROOT=%~2"
if "%OUTPUT_ROOT%"=="" set "OUTPUT_ROOT=%EVALUATOR_TRAINING_OUT%\stage126-weight-learning"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-stage126-weight-learning-bundle.mjs" ^
  --input "%INPUT%" ^
  --output-root "%OUTPUT_ROOT%" !EXTRA_ARGS!

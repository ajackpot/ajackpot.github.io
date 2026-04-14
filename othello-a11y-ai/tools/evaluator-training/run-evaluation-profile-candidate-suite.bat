@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\run-evaluation-profile-candidate-suite.bat ^<input-file-or-dir^> [output-dir] [additional-flags...]
  echo Example: tools\evaluator-training\run-evaluation-profile-candidate-suite.bat D:\othello-data\Egaroucid_Train_Data
  echo Example: tools\evaluator-training\run-evaluation-profile-candidate-suite.bat D:\othello-data\Egaroucid_Train_Data tools\evaluator-training\out\stage130-suite --config tools\evaluator-training\examples\evaluation-profile-candidate-suite.train-plus-bench.example.json --resume
  exit /b 1
)

set "OUTPUT_DIR=%~2"
if "%OUTPUT_DIR%"=="" set "OUTPUT_DIR=%EVALUATOR_TRAINING_OUT%\evaluation-profile-candidate-suite"

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-evaluation-profile-candidate-suite.mjs" ^
  --input "%INPUT%" ^
  --output-dir "%OUTPUT_DIR%" !EXTRA_ARGS!

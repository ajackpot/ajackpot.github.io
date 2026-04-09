@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
set "SEED_PROFILE=%~2"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\run-tuple-retrain-pipeline.bat ^<corpus-dir-or-file^> ^<seed-profile.json^> [additional-flags...]
  echo Example: tools\evaluator-training\run-tuple-retrain-pipeline.bat D:\othello-data\Egaroucid_Train_Data C:\weights\trained-tuple-residual-profile.calibrated.json --preset top24-retrain-lateb-endgame --output-dir tools\evaluator-training\out\tuple-pipeline\top24_lateb_endgame
  exit /b 1
)
if "%SEED_PROFILE%"=="" (
  echo Usage: tools\evaluator-training\run-tuple-retrain-pipeline.bat ^<corpus-dir-or-file^> ^<seed-profile.json^> [additional-flags...]
  exit /b 1
)

shift
shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-tuple-retrain-pipeline.mjs" --input "%INPUT%" --seed-profile "%SEED_PROFILE%" !EXTRA_ARGS!

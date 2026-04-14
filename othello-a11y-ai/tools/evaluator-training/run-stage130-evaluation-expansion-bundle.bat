@echo off
setlocal EnableDelayedExpansion
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\run-stage130-evaluation-expansion-bundle.bat ^<input-file-or-dir^> [additional-flags...]
  echo Example: tools\evaluator-training\run-stage130-evaluation-expansion-bundle.bat D:\othello-data\Egaroucid_Train_Data
  echo Example: tools\evaluator-training\run-stage130-evaluation-expansion-bundle.bat D:\othello-data\Egaroucid_Train_Data --phase all --resume
  exit /b 1
)

shift

set "EXTRA_ARGS="
:collect_extra
if "%~1"=="" goto run
set "EXTRA_ARGS=!EXTRA_ARGS! %1"
shift
goto collect_extra

:run
node "%EVALUATOR_TRAINING_DIR%\run-stage130-evaluation-expansion-bundle.mjs" ^
  --input "%INPUT%" !EXTRA_ARGS!

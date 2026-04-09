@echo off
setlocal
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\train-move-ordering-profile.bat ^<input-file-or-dir^> [output-json] [output-module] [teacher-evaluation-profile-json] [module-evaluation-profile-json]
  exit /b 1
)

set "OUTPUT_JSON=%~2"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%EVALUATOR_TRAINING_OUT%\trained-move-ordering-profile.json"

set "OUTPUT_MODULE=%~3"
if "%OUTPUT_MODULE%"=="" set "OUTPUT_MODULE=%EVALUATOR_GENERATED_MODULE%"

set "TEACHER_EVAL=%~4"
set "MODULE_EVAL=%~5"

if "%TEACHER_EVAL%"=="" (
  node "%EVALUATOR_TRAINING_DIR%\train-move-ordering-profile.mjs" ^
    --input "%INPUT%" ^
    --child-buckets 10-10,11-12,13-14,15-16,17-18 ^
    --exact-root-max-empties 14 ^
    --exact-root-time-limit-ms 60000 ^
    --teacher-depth 6 ^
    --teacher-time-limit-ms 4000 ^
    --teacher-exact-endgame-empties 14 ^
    --sample-stride 200 ^
    --max-roots-per-bucket 500 ^
    --holdout-mod 10 ^
    --lambda 5000 ^
    --progress-every 20 ^
    --output-json "%OUTPUT_JSON%" ^
    --output-module "%OUTPUT_MODULE%"
) else if "%MODULE_EVAL%"=="" (
  node "%EVALUATOR_TRAINING_DIR%\train-move-ordering-profile.mjs" ^
    --input "%INPUT%" ^
    --teacher-evaluation-profile "%TEACHER_EVAL%" ^
    --child-buckets 10-10,11-12,13-14,15-16,17-18 ^
    --exact-root-max-empties 14 ^
    --exact-root-time-limit-ms 60000 ^
    --teacher-depth 6 ^
    --teacher-time-limit-ms 4000 ^
    --teacher-exact-endgame-empties 14 ^
    --sample-stride 200 ^
    --max-roots-per-bucket 500 ^
    --holdout-mod 10 ^
    --lambda 5000 ^
    --progress-every 20 ^
    --output-json "%OUTPUT_JSON%" ^
    --output-module "%OUTPUT_MODULE%"
) else (
  node "%EVALUATOR_TRAINING_DIR%\train-move-ordering-profile.mjs" ^
    --input "%INPUT%" ^
    --teacher-evaluation-profile "%TEACHER_EVAL%" ^
    --evaluation-profile-json "%MODULE_EVAL%" ^
    --child-buckets 10-10,11-12,13-14,15-16,17-18 ^
    --exact-root-max-empties 14 ^
    --exact-root-time-limit-ms 60000 ^
    --teacher-depth 6 ^
    --teacher-time-limit-ms 4000 ^
    --teacher-exact-endgame-empties 14 ^
    --sample-stride 200 ^
    --max-roots-per-bucket 500 ^
    --holdout-mod 10 ^
    --lambda 5000 ^
    --progress-every 20 ^
    --output-json "%OUTPUT_JSON%" ^
    --output-module "%OUTPUT_MODULE%"
)

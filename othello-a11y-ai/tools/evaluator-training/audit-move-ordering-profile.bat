@echo off
setlocal
call "%~dp0_path-context.bat"

set "INPUT=%~1"
if "%INPUT%"=="" (
  echo Usage: tools\evaluator-training\audit-move-ordering-profile.bat ^<input-file-or-dir^> [move-ordering-profile-json] [output-json] [teacher-evaluation-profile-json]
  exit /b 1
)

set "PROFILE_JSON=%~2"
if "%PROFILE_JSON%"=="" set "PROFILE_JSON=%EVALUATOR_TRAINING_OUT%\trained-move-ordering-profile.json"

set "OUTPUT_JSON=%~3"
if "%OUTPUT_JSON%"=="" set "OUTPUT_JSON=%OTHELLO_BENCHMARK_DIR%\move_ordering_audit.json"

set "TEACHER_EVAL=%~4"

if "%TEACHER_EVAL%"=="" (
  node "%EVALUATOR_TRAINING_DIR%\audit-move-ordering-profile.mjs" ^
    --input "%INPUT%" ^
    --move-ordering-profile "%PROFILE_JSON%" ^
    --child-buckets 10-10,11-12,13-14,15-16,17-18 ^
    --exact-root-max-empties 14 ^
    --exact-root-time-limit-ms 60000 ^
    --teacher-depth 6 ^
    --teacher-time-limit-ms 4000 ^
    --teacher-exact-endgame-empties 14 ^
    --sample-stride 200 ^
    --max-roots-per-bucket 200 ^
    --output-json "%OUTPUT_JSON%"
) else (
  node "%EVALUATOR_TRAINING_DIR%\audit-move-ordering-profile.mjs" ^
    --input "%INPUT%" ^
    --move-ordering-profile "%PROFILE_JSON%" ^
    --teacher-evaluation-profile "%TEACHER_EVAL%" ^
    --child-buckets 10-10,11-12,13-14,15-16,17-18 ^
    --exact-root-max-empties 14 ^
    --exact-root-time-limit-ms 60000 ^
    --teacher-depth 6 ^
    --teacher-time-limit-ms 4000 ^
    --teacher-exact-endgame-empties 14 ^
    --sample-stride 200 ^
    --max-roots-per-bucket 200 ^
    --output-json "%OUTPUT_JSON%"
)

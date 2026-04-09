@echo off
setlocal

set "OUTDIR=%~1"
if "%OUTDIR%"=="" set "OUTDIR=%~dp0downloads"
if not exist "%OUTDIR%" mkdir "%OUTDIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference='SilentlyContinue';" ^
  "Invoke-WebRequest -Uri 'https://github.com/Nyanyan/Egaroucid/releases/download/training_data/Egaroucid_Train_Data.zip' -OutFile '%OUTDIR%\Egaroucid_Train_Data.zip';" ^
  "Invoke-WebRequest -Uri 'https://github.com/Nyanyan/Egaroucid/releases/download/transcript/Egaroucid_Transcript.zip' -OutFile '%OUTDIR%\Egaroucid_Transcript.zip';"

if errorlevel 1 (
  echo Download failed.
  exit /b 1
)

echo Saved archives to %OUTDIR%
echo Please unzip Egaroucid_Train_Data.zip or Egaroucid_Transcript.zip before training.

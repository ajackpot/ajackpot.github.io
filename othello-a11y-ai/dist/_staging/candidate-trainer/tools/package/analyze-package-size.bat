@echo off
setlocal
call "%~dp0_path-context.bat"
set "OUTPUT_JSON=%REPO_ROOT%\dist\package-size-analysis.json"
node "%~dp0analyze-package-size.mjs" --repo-root "%REPO_ROOT%" --output-json "%OUTPUT_JSON%" %*

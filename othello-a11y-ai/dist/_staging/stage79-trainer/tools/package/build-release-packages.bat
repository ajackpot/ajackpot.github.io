@echo off
setlocal
call "%~dp0_path-context.bat"
set "OUTPUT_DIR=%REPO_ROOT%\dist"
node "%~dp0build-release-packages.mjs" --repo-root "%REPO_ROOT%" --output-dir "%OUTPUT_DIR%" --package-name "othello-a11y-ai" %*

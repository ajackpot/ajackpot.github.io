@echo off
setlocal

set OUTPUT=%~1
if "%OUTPUT%"=="" set OUTPUT=benchmarks\stage31_vs_trineutron.json

node tools\engine-match\benchmark-vs-trineutron.mjs ^
  --output-json "%OUTPUT%" ^
  --variants active,phase-only,legacy ^
  --games 4 ^
  --opening-plies 20 ^
  --seed 11 ^
  --our-time-ms 100 ^
  --their-time-ms 100 ^
  --our-max-depth 6 ^
  --their-max-depth 18 ^
  --exact-endgame-empties 10 ^
  --solver-adjudication-empties 14 ^
  --solver-adjudication-time-ms 60000 ^
  --their-noise-scale 4

endlocal

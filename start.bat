@echo off
pushd "%~dp0"
call ..\env_setup.bat
echo Starting IT뉴스...
npm run dev
popd
pause

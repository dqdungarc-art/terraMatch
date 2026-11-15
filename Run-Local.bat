@echo off
setlocal
set "PROJECT_DIR=%~dp0"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "VITE_CLI=%FRONTEND_DIR%\node_modules\vite\bin\vite.js"
set "STATIC_SERVER=%FRONTEND_DIR%\serve-dist.mjs"
set "NODE_EXE=node.exe"
set "SERVER_COMMAND="

where node.exe >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Node.js 20.19 or newer is required. Install Node.js, then run this file again.
    pause
    exit /b 1
  )
)

if not exist "%VITE_CLI%" (
  where npm.cmd >nul 2>nul
  if not errorlevel 1 (
    echo Installing frontend dependencies from package-lock.json...
    pushd "%FRONTEND_DIR%"
    call npm.cmd ci
    set "INSTALL_RESULT=%ERRORLEVEL%"
    popd
    if not "%INSTALL_RESULT%"=="0" goto static_fallback
  ) else (
    goto static_fallback
  )
)

if exist "%VITE_CLI%" (
  set "SERVER_COMMAND="%NODE_EXE%" "%VITE_CLI%" --host 127.0.0.1 --strictPort"
  set "SERVER_TITLE=ACS.AEROTECH Dev Server"
  goto start_server
)

:static_fallback
if exist "%STATIC_SERVER%" if exist "%FRONTEND_DIR%\dist\index.html" (
  set "SERVER_COMMAND="%NODE_EXE%" "%STATIC_SERVER%""
  set "SERVER_TITLE=ACS.AEROTECH Local Server"
  goto start_server
)

echo Could not start the site. Install Node.js and run npm ci in the frontend folder.
pause
exit /b 1

:start_server
echo Starting ACS.AEROTECH at http://127.0.0.1:5173/
start "%SERVER_TITLE%" %SERVER_COMMAND%

powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:5173/'; if ($r.StatusCode -eq 200) { exit 0 } } catch {} ; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo The local server did not respond. Check the server window for details.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173/"
echo The website is open. Close the server window to stop it.
timeout /t 3 >nul
endlocal

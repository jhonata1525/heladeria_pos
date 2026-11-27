@echo off
setlocal EnableExtensions

set "BACKUP_DIR=C:\Respaldos_Heladeria"
for %%P in ("%~dp0..") do set "PROJECT_DIR=%%~fP"
set "DB_FILE=%PROJECT_DIR%\dev.db"

if not exist "%DB_FILE%" (
  echo No se encontro la base de datos: %DB_FILE%
  exit /b 1
)

for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm'"`) do set "STAMP=%%D"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if errorlevel 1 (
  echo No se pudo crear la carpeta %BACKUP_DIR%
  exit /b 1
)

copy /Y "%DB_FILE%" "%BACKUP_DIR%\dev_backup_%STAMP%.db" >nul
if errorlevel 1 (
  echo No se pudo copiar la base de datos.
  exit /b 1
)

echo Respaldo creado: %BACKUP_DIR%\dev_backup_%STAMP%.db
endlocal

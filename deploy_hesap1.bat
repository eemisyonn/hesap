@echo off
setlocal
echo ========================================
echo    HESAP-1 FLY.IO DEPLOY SCRIPT
echo ========================================
echo.

REM Bat dosyasinin bulundugu proje dizinine git
cd /d "%~dp0"
echo Proje dizini: %CD%
echo.

REM Git kontrol
git --version >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: Git bulunamadi. Once Git for Windows kur.
    pause
    exit /b 1
)

REM Fly CLI kontrol
flyctl version >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: flyctl bulunamadi.
    echo Kurulum: https://fly.io/docs/flyctl/install/
    pause
    exit /b 1
)

REM (İsteğe bağlı) Fly app adını burada belirt; fly.toml'daki app ismi ile aynı olmalı
set APP_NAME=hesap

echo [1/3] GitHub'a push yapiliyor...
git add .
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo Commitlenecek degisiklik yok, push denenecek.
) else (
    git commit -m "HESAP-1 Deploy: %date% %time%"
)
git push origin main

if %errorlevel% neq 0 (
    echo HATA: GitHub push basarisiz!
    pause
    exit /b 1
)

echo [2/3] Fly.io'ya deploy ediliyor...
REM flyctl deploy -a %APP_NAME%  --config fly.toml
flyctl deploy -a %APP_NAME%

if %errorlevel% neq 0 (
    echo HATA: Fly.io deploy basarisiz!
    pause
    exit /b 1
)

echo [3/3] Deploy durumu kontrol ediliyor...
flyctl status -a %APP_NAME%

echo.
echo ========================================
echo    DEPLOY TAMAMLANDI!
echo ========================================
echo.
echo Uygulamaniz: https://%APP_NAME%.fly.dev/
echo.
pause
endlocal

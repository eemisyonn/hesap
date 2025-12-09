@echo off
echo ========================================
echo    HESAP-1 FLY.IO DEPLOY SCRIPT
echo ========================================
echo.

REM Proje dizinine git
cd /d "C:\Users\FOCUSGC\Desktop\AKARE-YAZILIM\HESAP\HESAP-1"

REM (İsteğe bağlı) Fly app adını burada belirt; fly.toml'daki app ismi ile aynı olmalı
set APP_NAME=akare-hesap

echo [1/3] GitHub'a push yapiliyor...
git add .
git commit -m "HESAP-1 Deploy: %date% %time%"
git push origin main

if %errorlevel% neq 0 (
    echo HATA: GitHub push basarisiz!
    pause
    exit /b 1
)

echo [2/3] Fly.io'ya deploy ediliyor...
REM flyctl deploy -a %APP_NAME%  --config fly.toml
flyctl deploy

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

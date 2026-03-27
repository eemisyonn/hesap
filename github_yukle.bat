@echo off
setlocal

echo ========================================
echo        GITHUB TEK TIK YUKLEME
echo ========================================
echo.

REM Bu bat dosyasinin bulundugu klasore gec
cd /d "%~dp0"
echo Proje dizini: %CD%
echo.

REM Git kurulu mu kontrol et
git --version >nul 2>nul
if %errorlevel% neq 0 (
    echo HATA: Git kurulu degil veya PATH'e ekli degil.
    echo https://git-scm.com/download/win adresinden Git for Windows kur.
    pause
    exit /b 1
)

REM Repo URL (senin ekranindaki repo)
set REPO_URL=https://github.com/aadem1983/hesap.git

REM Git deposu yoksa baslat
if not exist ".git" (
    echo [1/7] Git deposu baslatiliyor...
    git init
)

REM Kullanici bilgileri ayarli mi kontrol et
for /f "delims=" %%i in ('git config --get user.name') do set GIT_USER_NAME=%%i
for /f "delims=" %%i in ('git config --get user.email') do set GIT_USER_EMAIL=%%i

if "%GIT_USER_NAME%"=="" (
    set /p GIT_USER_NAME=GitHub kullanici adini gir: 
    git config user.name "%GIT_USER_NAME%"
)

if "%GIT_USER_EMAIL%"=="" (
    set /p GIT_USER_EMAIL=GitHub email adresini gir: 
    git config user.email "%GIT_USER_EMAIL%"
)

echo [2/7] Dosyalar eklendi...
git add .

REM Bos commit hatasini engelle
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo [3/7] Commitlenecek degisiklik yok, push denenecek.
) else (
    echo [3/7] Commit olusturuluyor...
    git commit -m "Deploy: %date% %time%"
)

echo [4/7] Ana dal main yapiliyor...
git branch -M main

echo [5/7] Uzak depo (origin) ayarlaniyor...
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    git remote add origin %REPO_URL%
) else (
    git remote set-url origin %REPO_URL%
)

echo [6/7] GitHub'a gonderiliyor...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo HATA: Push basarisiz oldu.
    echo Not: Ilk seferde GitHub girisi veya token isteyebilir.
    pause
    exit /b 1
)

echo [7/7] Tamamlandi.
echo Repo: %REPO_URL%
echo.
echo Basarili: Proje GitHub'a yuklendi.
pause
endlocal

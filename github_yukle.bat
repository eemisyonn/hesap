@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo   GITHUB TEK TIK GUNCELLEME VE PUSH
echo ========================================
echo.

REM Bu bat dosyasinin bulundugu klasore gec
cd /d "%~dp0"
echo Proje dizini: %CD%
echo.

REM Git kurulu mu kontrol et
git --version >nul 2>nul
if errorlevel 1 (
    echo HATA: Git kurulu degil veya PATH'e ekli degil.
    echo https://git-scm.com/download/win adresinden Git for Windows kurun.
    pause
    exit /b 1
)

REM Git deposu degilse baslat
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
    echo Git deposu bulunamadi, yeni depo baslatiliyor...
    git init
    if errorlevel 1 (
        echo HATA: git init basarisiz oldu.
        pause
        exit /b 1
    )
)

REM Kullanici bilgileri ayarli mi kontrol et
for /f "delims=" %%i in ('git config --get user.name') do set "GIT_USER_NAME=%%i"
for /f "delims=" %%i in ('git config --get user.email') do set "GIT_USER_EMAIL=%%i"

if "%GIT_USER_NAME%"=="" (
    set /p GIT_USER_NAME=Git user.name girin: 
    if not "%GIT_USER_NAME%"=="" git config user.name "%GIT_USER_NAME%"
)

if "%GIT_USER_EMAIL%"=="" (
    set /p GIT_USER_EMAIL=Git user.email girin: 
    if not "%GIT_USER_EMAIL%"=="" git config user.email "%GIT_USER_EMAIL%"
)

set "TARGET_BRANCH=main"
echo [1/4] Dosyalar ekleniyor...

REM Takip edilen degisiklikleri ekle
git add -u

REM Yeni dosyalari tek tek ekle (sorunlu girdiler atlanir)
for /f "delims=" %%F in ('git ls-files --others --exclude-standard') do (
    git add -- "%%F" >nul 2>nul
    if errorlevel 1 (
        echo UYARI: Eklenemedi, atlandi: %%F
    )
)

echo [2/4] Commit kontrolu...
git diff --cached --quiet
if errorlevel 1 (
    for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format ''yyyy-MM-dd HH:mm:ss''"') do set "NOW=%%i"
    if "%NOW%"=="" set "NOW=%date% %time%"
    git commit -m "Auto update %NOW%"
    if errorlevel 1 (
        echo HATA: Commit olusturulamadi.
        pause
        exit /b 1
    )
) else (
    echo Commitlenecek yeni degisiklik yok.
)

echo [3/4] Branch ve remote kontrolu...
git branch -M %TARGET_BRANCH%

git remote get-url origin >nul 2>nul
if errorlevel 1 (
    set /p REPO_URL=GitHub repo URL girin (https://github.com/kullanici/repo.git): 
    if "%REPO_URL%"=="" (
        echo HATA: Uzak repo URL bos birakildi.
        pause
        exit /b 1
    )
    git remote add origin "%REPO_URL%"
) else (
    for /f "delims=" %%i in ('git remote get-url origin') do set "REPO_URL=%%i"
)

echo [4/4] GitHub'a gonderiliyor...
git push -u origin %TARGET_BRANCH%
if errorlevel 1 (
    echo.
    echo HATA: Push basarisiz oldu.
    echo Not: Tarayici kimlik dogrulamasi acilabilir, tekrar deneyin.
    pause
    exit /b 1
)

echo.
echo BASARILI: Degisiklikler GitHub'a yuklendi.
echo Repo: !REPO_URL!
pause
endlocal

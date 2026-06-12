@echo off
echo ==========================================
echo   课表助手 Android APK 构建脚本
echo ==========================================
echo.

if "%ANDROID_HOME%"=="" (
    echo [警告] ANDROID_HOME 未设置，尝试自动检测...
    if exist "%LOCALAPPDATA%\Android\Sdk" set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
)
if "%JAVA_HOME%"=="" (
    echo [提示] 请确保已安装 JDK 21 并设置 JAVA_HOME
)

echo [1/3] 构建 Web 资源...
call npm run vite:build
if %ERRORLEVEL% neq 0 (echo [错误] Web 构建失败 && exit /b 1)

echo [2/3] 同步到 Android...
call npx cap sync android
if %ERRORLEVEL% neq 0 (echo [错误] 同步失败 && exit /b 1)

echo [3/3] 构建 Debug APK...
cd android
call gradlew assembleDebug
if %ERRORLEVEL% neq 0 (echo [错误] APK 构建失败 && exit /b 1)
cd ..

echo.
echo ==========================================
echo   构建成功！
echo   APK: android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
pause

@echo off
set /p KEYSTORE_PASSWORD="Enter keystore password: "
set /p KEY_PASSWORD="Enter key password: "

echo Generating keystore...
keytool -genkey -v -keystore legacy_trails.keystore -alias legacy_trails -keyalg RSA -keysize 2048 -validity 10000 -storepass %KEYSTORE_PASSWORD% -keypass %KEY_PASSWORD% -dname "CN=Legacy Trails Tyrol, OU=Android, O=Tirol Trailhead, L=Innsbruck, S=Tyrol, C=AT"

echo Building release APK...
set KEYSTORE_PASSWORD=%KEYSTORE_PASSWORD%
set KEY_PASSWORD=%KEY_PASSWORD%
gradlew.bat assembleRelease

echo.
echo Release APK generated at: app\build\outputs\apk\release\app-release.apk
echo.
echo IMPORTANT: Save your keystore and passwords securely! You'll need them for future updates.
echo.
pause 
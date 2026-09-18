@echo off
cd /d %~dp0
if not exist .env copy .env.example .env >nul
docker compose up --build -d
if errorlevel 1 (
  echo.
  echo Docker Desktop ishga tushganini tekshiring va qayta urinib ko'ring.
  exit /b 1
)
echo.
echo DarsPilot: http://localhost:8080
start http://localhost:8080

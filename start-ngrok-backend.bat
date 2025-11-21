@echo off
echo Starting ngrok tunnel for backend (port 2000) with pooling enabled...
echo.
echo This will use the SAME ngrok URL as your frontend.
echo Keep this window open!
echo.
ngrok http 2000 --pooling-enabled --host-header=localhost:2000
pause


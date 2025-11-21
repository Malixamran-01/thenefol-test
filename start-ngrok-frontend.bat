@echo off
echo Starting ngrok tunnel for frontend (port 2001) with pooling enabled...
echo.
echo This will use the SAME ngrok URL for pooling.
echo Keep this window open!
echo.
ngrok http 2001 --pooling-enabled --host-header=localhost:2001
pause


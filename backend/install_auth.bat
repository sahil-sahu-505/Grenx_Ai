@echo off
echo Installing authentication packages...
python -m pip install pyjwt bcrypt python-jose[cryptography]
if errorlevel 1 (
    echo Python not found in PATH. Trying alternative...
    py -m pip install pyjwt bcrypt python-jose[cryptography]
)
echo Done!
pause

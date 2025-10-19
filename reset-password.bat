@echo off
echo ============================================
echo RESETTING PASSWORD FOR EMERALD BUDGET
echo ============================================
echo.

cd emerald-budget-server

echo Deleting existing user data to reset password...
if exist "data\budget-data.json" (
    echo Backing up current data...
    copy "data\budget-data.json" "data\budget-data-backup.json" >nul
    
    echo Removing password hash to force reset...
    node -e "
    const fs = require('fs');
    try {
        const data = JSON.parse(fs.readFileSync('data/budget-data.json', 'utf8'));
        if (data.user) {
            delete data.user.passwordHash;
            delete data.user.token;
            console.log('Password reset - you can now set a new password');
        }
        fs.writeFileSync('data/budget-data.json', JSON.stringify(data, null, 2));
    } catch(e) {
        console.log('No existing data found - first time setup will be triggered');
    }
    "
) else (
    echo No existing data found - first time setup will be triggered
)

echo.
echo ============================================
echo PASSWORD RESET COMPLETE
echo Next login will prompt you to set a new password
echo ============================================
pause

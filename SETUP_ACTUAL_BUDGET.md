# Setting Up Actual Budget Server for Emerald Budget Glow

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Actual Budget** server

## Step 1: Install Actual Budget Server

Run this in a separate terminal:

```bash
npm install -g @actual-app/api
```

## Step 2: Start Actual Budget Server

```bash
# Start the server (it will run on port 5006 by default)
actual-server

# Or if you want to specify a data directory:
actual-server --data-dir ./actual-data
```

## Step 3: Initial Setup

1. Open a browser and go to `http://localhost:5006`
2. You'll see the Actual Budget interface
3. Create a new budget file or import an existing one
4. Set a password for your server (remember this!)

## Step 4: Test the Connection

Run the test script we created:

```bash
cd emerald-budget-glow
node test-api.js
```

You should see:
```
Testing connection to Actual Budget server...
✓ Server is running: { version: "24.x.x" }
Bootstrap status: { bootstrapped: true, ... }
```

## Step 5: Use the Emerald Budget Glow App

1. Make sure the Actual server is running
2. Start the Emerald app:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser
4. Login with the password you set in Step 3

## Troubleshooting

### "Cannot connect to Actual Budget server"
- Make sure the server is running on port 5006
- Check if another process is using that port:
  ```bash
  netstat -an | findstr 5006
  ```
- Try accessing `http://localhost:5006` directly in browser

### "Invalid password"
- Make sure you're using the password you set when setting up the server
- If you forgot it, you can reset by deleting the data directory and starting fresh

### "No budget file loaded"
- Create a new budget in the Actual Budget UI first
- Or import an existing budget file

### Console Errors
Check the browser console (F12) for detailed error messages. Common issues:
- CORS errors: The server needs to allow cross-origin requests
- 404 errors: The API endpoints might have changed
- 401 errors: Authentication issues

## Creating Test Data

If you want to test with sample data:

1. Open Actual Budget UI at `http://localhost:5006`
2. Create accounts:
   - Checking Account
   - Savings Account
   - Credit Card
3. Add some transactions
4. Set up budget categories
5. Refresh the Emerald app to see the data

## API Endpoints Reference

The app uses these Actual Budget API endpoints:

- `/` - Server status
- `/account/login` - Authentication
- `/sync/sync` - Data synchronization
- `/sync/list-user-files` - List budget files

## Notes

- All amounts in Actual Budget are stored in cents (multiply by 100)
- Dates are stored as YYYYMMDD format
- The sync endpoint is the main way to interact with data

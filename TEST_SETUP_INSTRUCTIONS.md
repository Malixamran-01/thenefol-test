# Test Setup Instructions

## Prerequisites Before Running Tests

The test script requires:

1. **PostgreSQL Database Running**
   - Make sure PostgreSQL is installed and running on your system
   - Default connection: `localhost:5432`
   - Database name: `nefol`
   - User: `nofol_users` (or `postgres` if using defaults)
   - Password: `Anupnefoldb` (or your password)

2. **Backend Server Running** (optional, but recommended)
   - The test script makes API calls to create orders
   - Start the server: `cd backend && npm run dev`
   - Server should run on `http://localhost:2000`

3. **Test User in Database**
   - The script uses `test@example.com` by default
   - You can change this in `.env` file: `TEST_USER_EMAIL=your-email@example.com`

## Quick Setup Steps

### Step 1: Start PostgreSQL
```bash
# On Windows (if installed as service, it should auto-start)
# Check if running:
Get-Service -Name postgresql*

# Or start manually if needed
```

### Step 2: Verify Database Connection
```bash
# Test connection using psql (if installed)
psql -h localhost -U nofol_users -d nefol

# Or test with the connection string from .env
psql postgresql://nofol_users:Anupnefoldb@localhost:5432/nefol
```

### Step 3: Create Test User (if needed)
```sql
-- Connect to database and run:
INSERT INTO users (email, name, password, loyalty_points) 
VALUES ('test@example.com', 'Test User', 'hashed_password', 0)
ON CONFLICT (email) DO NOTHING;
```

### Step 4: Start Backend Server (in separate terminal)
```bash
cd backend
npm run dev
```

### Step 5: Run Tests
```bash
cd backend
npm run test:coin-exploit
```

## Alternative: Test Without Backend Server

If you want to test the database logic without the API server, you can:

1. Modify the test script to skip API calls
2. Use the SQL queries from `QUICK_TEST_COIN_EXPLOIT.md`
3. Test directly in your database

## Troubleshooting

### Error: ECONNREFUSED on port 5432
- **Solution**: PostgreSQL is not running
  - Start PostgreSQL service
  - Check if it's listening on port 5432
  - Verify connection string in `.env` file

### Error: Database "nefol" does not exist
- **Solution**: Create the database
  ```sql
  CREATE DATABASE nefol;
  ```

### Error: Authentication failed
- **Solution**: Check username and password in `.env`
  - Verify `DATABASE_URL` in `.env` file
  - Make sure user has access to the database

### Error: API connection refused
- **Solution**: Backend server is not running
  - Start server: `cd backend && npm run dev`
  - Or modify test to skip API calls and test database directly

## Current Status

Based on the test run:
- ❌ Database connection failed (PostgreSQL not running or wrong credentials)
- ⏳ Backend server status: Unknown (needs to be started)

## Next Steps

1. **Start PostgreSQL** if not running
2. **Verify database connection** using psql or pgAdmin
3. **Update `.env` file** if database credentials are different
4. **Start backend server** in a separate terminal
5. **Run tests again**: `npm run test:coin-exploit`



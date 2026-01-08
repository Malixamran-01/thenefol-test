# Database Setup for Testing

## Quick Setup Options

### Option 1: Use Your PostgreSQL Password

If you know your PostgreSQL `postgres` user password, update the `.env` file:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/nefol
```

Or use individual settings:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nefol
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
```

### Option 2: Create the nofol_users User

If you want to use the existing configuration, create the user in PostgreSQL:

1. **Connect to PostgreSQL** (as superuser):
   ```bash
   psql -U postgres
   ```
   (You'll be prompted for the postgres password)

2. **Create the database** (if it doesn't exist):
   ```sql
   CREATE DATABASE nefol;
   ```

3. **Create the user**:
   ```sql
   CREATE USER nofol_users WITH PASSWORD 'Anupnefoldb';
   ```

4. **Grant privileges**:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE nefol TO nofol_users;
   \c nefol
   GRANT ALL ON SCHEMA public TO nofol_users;
   ```

5. **Exit**:
   ```sql
   \q
   ```

### Option 3: Reset PostgreSQL Password

If you forgot the postgres password:

**On Windows:**
1. Open `pg_hba.conf` (usually in `C:\Program Files\PostgreSQL\<version>\data\`)
2. Find the line: `host all all 127.0.0.1/32 md5`
3. Change `md5` to `trust`
4. Restart PostgreSQL service
5. Connect: `psql -U postgres`
6. Change password: `ALTER USER postgres WITH PASSWORD 'newpassword';`
7. Change `pg_hba.conf` back to `md5`
8. Restart PostgreSQL service

## Test Connection

After setup, test the connection:

```bash
cd backend
node test-db-connection.js
```

This will tell you which connection method works.

## Run Tests

Once connection works:

```bash
cd backend
npm run test:coin-exploit
```



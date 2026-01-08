# Supabase CLI Setup Guide

## Your Project Reference
```
hlfycrtaeaexydwaevrb
```

## Installation

### Windows
```bash
# Option 1: Using npm
npm install -g supabase

# Option 2: Using scoop
scoop install supabase

# Option 3: Using Chocolatey
choco install supabase
```

### macOS
```bash
brew install supabase/tap/supabase
```

### Linux
```bash
npm install -g supabase
```

## Setup Steps

### Step 1: Install Supabase CLI
```bash
npm install -g supabase
```

### Step 2: Login to Supabase
```bash
supabase login
```
This will open your browser to authenticate.

### Step 3: Initialize Supabase (if not already done)
```bash
cd backend
supabase init
```

### Step 4: Link Your Project
```bash
supabase link --project-ref hlfycrtaeaexydwaevrb
```

You'll be prompted for:
- Database password: `UvI09HmgBBon89zk`
- Select organization (if you have multiple)

### Step 5: Create Migration (Optional)
```bash
supabase migration new new-migration
```

### Step 6: Push Migrations
```bash
# Push all migrations to Supabase
supabase db push

# Or push specific migration
supabase db push --include-all
```

## Using Existing Migrations

If you already have migrations in `backend/migrate.js`, you can:

### Option 1: Convert to Supabase Migrations
1. Create migration file:
   ```bash
   supabase migration new initial_schema
   ```
2. Copy SQL from `migrate.js` to the migration file
3. Push:
   ```bash
   supabase db push
   ```

### Option 2: Run Existing Migrate Script
After linking, you can still use your existing migration:
```bash
# The connection will be handled by Supabase CLI
node migrate.js
```

## Benefits of Supabase CLI

✅ **Automatic Authentication** - No need to manage connection strings
✅ **Project Linking** - Direct connection to your Supabase project
✅ **Migration Management** - Version-controlled migrations
✅ **Local Development** - Can run Supabase locally
✅ **Database Management** - Easy schema changes and updates

## Commands Reference

```bash
# Login
supabase login

# Link project
supabase link --project-ref hlfycrtaeaexydwaevrb

# Create new migration
supabase migration new migration-name

# Push migrations
supabase db push

# Pull remote schema
supabase db pull

# Reset database (careful!)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --linked > types/database.types.ts

# Start local Supabase (optional)
supabase start
```

## Troubleshooting

### Authentication Failed
```bash
# Re-login
supabase logout
supabase login
```

### Link Failed
- Verify project reference: `hlfycrtaeaexydwaevrb`
- Check if project is active (not paused)
- Verify you have access to the project

### Migration Issues
- Check migration files in `supabase/migrations/`
- Verify SQL syntax
- Use `supabase db pull` to see current schema

## Next Steps

1. **Install CLI**: `npm install -g supabase`
2. **Login**: `supabase login`
3. **Link**: `supabase link --project-ref hlfycrtaeaexydwaevrb`
4. **Push Migrations**: `supabase db push`

This is much easier than managing connection strings manually!



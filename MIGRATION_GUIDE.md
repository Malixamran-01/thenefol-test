# Migration Guide: DOB and Qualifications Fields

The migration for Date of Birth and Qualifications fields is already included in `backend/src/utils/schema.ts` and will run automatically when your backend server starts.

## Fields Added
- **Date of Birth**: `birth_day`, `birth_month`, `birth_year` (all nullable/integer)
- **Qualifications**: `education_level`, `profession`, `skills` (all nullable/text)

## Automatic Migration

The migration runs automatically when you start your backend server because `ensureSchema()` is called on startup (line 4905 in `backend/src/index.ts`).

### To Run:
1. **Restart your backend server** - the migration will run automatically
2. Check server logs to confirm migration completed
3. The migration uses `DATABASE_URL` from environment variables, so it will run on whichever database is configured

The migration is **safe for production** because it checks if columns exist before adding them.

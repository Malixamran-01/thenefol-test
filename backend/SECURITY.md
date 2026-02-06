# Security Guidelines

## Environment Variables

### ⚠️ IMPORTANT: Never commit .env files to Git!

The `.env` file contains sensitive information including:
- Database passwords
- API keys
- Secret tokens

### Setup Instructions

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in the `.env` file

3. The `.env` file is already in `.gitignore` and should never be committed

### If Secrets Are Exposed

If you accidentally commit secrets to Git:

1. **Immediately regenerate all exposed keys/passwords**
2. **Remove the file from Git history** (if needed)
3. **Update your production environment** with new secrets

### Supabase Key Regeneration

If your Supabase keys are exposed:

1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Regenerate the Service Role key
4. Update your `.env` file with the new key
5. Redeploy your application

### Best Practices

- ✅ Use `.env.example` for templates
- ✅ Keep `.env` in `.gitignore`
- ✅ Use different keys for development/production
- ✅ Regularly rotate sensitive keys
- ❌ Never commit `.env` files
- ❌ Never share keys in chat/email
- ❌ Never hardcode secrets in source code
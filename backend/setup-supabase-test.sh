#!/bin/bash
# Setup script for Supabase test database

echo "🔧 Setting up Supabase Test Database"
echo ""

# Prompt for password
read -sp "Enter your Supabase database password: " PASSWORD
echo ""

# Connection string
CONNECTION_STRING="postgresql://postgres:${PASSWORD}@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres"
NEFOL_CONNECTION_STRING="postgresql://postgres:${PASSWORD}@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol"

echo "📦 Creating nefol database if it doesn't exist..."
psql "$CONNECTION_STRING" -c "SELECT 1 FROM pg_database WHERE datname = 'nefol'" | grep -q 1 || psql "$CONNECTION_STRING" -c "CREATE DATABASE nefol"

echo "✅ Database ready!"
echo ""
echo "📝 Use this connection string in your deployment platform:"
echo "$NEFOL_CONNECTION_STRING"
echo ""
echo "⚠️  Keep this password secure and never commit it to Git!"



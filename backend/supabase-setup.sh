#!/bin/bash
# Supabase CLI Setup Script

echo "🔧 Setting up Supabase CLI for project"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo ""
    echo "Install it with:"
    echo "  npm install -g supabase"
    echo "  OR"
    echo "  scoop install supabase  # Windows"
    echo "  OR"
    echo "  brew install supabase/tap/supabase  # macOS"
    exit 1
fi

echo "✅ Supabase CLI is installed"
supabase --version
echo ""

# Initialize Supabase (if not already initialized)
if [ ! -f "supabase/config.toml" ]; then
    echo "📦 Initializing Supabase project..."
    supabase init
    echo ""
fi

# Link to remote project
echo "🔗 Linking to Supabase project: hlfycrtaeaexydwaevrb"
supabase link --project-ref hlfycrtaeaexydwaevrb

echo ""
echo "✅ Project linked!"
echo ""
echo "Next steps:"
echo "1. Create migration: supabase migration new migration-name"
echo "2. Push migrations: supabase db push"
echo "3. Or use existing migrations: supabase db push"



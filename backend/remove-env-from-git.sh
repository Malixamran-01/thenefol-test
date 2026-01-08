#!/bin/bash
# Script to remove .env files from Git history

echo "🔍 Removing .env files from Git..."

# Remove from Git tracking (but keep local files)
git rm --cached backend/.env
git rm --cached backend/.env.backup

echo "✅ Removed .env files from Git tracking"
echo "📝 Local files are preserved"
echo ""
echo "Next steps:"
echo "1. Commit this change: git commit -m 'Remove .env files from repository'"
echo "2. Push to GitHub: git push"
echo ""
echo "⚠️  Note: Files will still exist in Git history."
echo "   To completely remove from history, use: git filter-branch or BFG Repo-Cleaner"


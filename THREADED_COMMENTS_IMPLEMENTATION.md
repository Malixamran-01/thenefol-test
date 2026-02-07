# Threaded Comments Implementation

This document describes the implementation of threaded comments (Reddit-style) using the **Path Enumeration** method with an `ancestors` column.

## Overview

The implementation uses PostgreSQL's array support to store ancestor comment IDs, enabling efficient querying of nested comment trees without recursive queries. This is more efficient than the traditional adjacency list model.

## Database Schema Changes

### Added Column
- `ancestors integer[]` - Array of ancestor comment IDs from root to parent
- GIN index on `ancestors` for efficient array queries

### Example Data Structure

For the comment tree:
```
[1]
├── [2]
│   ├── [3]
│   │   └── [5]
│   └── [7]
└── [4]
    └── [6]
```

The `ancestors` column would contain:
- Comment 1: `NULL` (root)
- Comment 2: `[1]`
- Comment 3: `[1, 2]`
- Comment 4: `[1]`
- Comment 5: `[1, 2, 3]`
- Comment 6: `[1, 4]`
- Comment 7: `[1, 2]`

## Backend Changes

### 1. Schema Updates
- **File**: `backend/src/utils/schema.ts`
- Added `ancestors integer[]` column to `blog_comments` table
- Added GIN index for efficient array queries

### 2. Comment Creation
- **File**: `backend/src/routes/blog.ts`
- When creating a comment, the `ancestors` array is built from the parent's ancestors + parent's ID
- Root comments have `ancestors = NULL`

### 3. Comment Queries
- Comments are ordered by depth (using `array_length(ancestors, 1)`) then by creation time
- Depth information is included in the response for frontend rendering

### 4. Comment Deletion
- Uses `ancestors` array to efficiently delete a comment and all its descendants
- Query: `WHERE id = $1 OR $1 = ANY(ancestors)`

## Frontend Changes

### 1. Comment Interface
- **File**: `user-panel/src/pages/BlogDetail.tsx`
- Added `ancestors` and `depth` fields to `BlogComment` interface

### 2. Tree Building
- Updated `buildCommentTree` function to use `ancestors` array for efficient tree construction
- Uses a two-pass algorithm:
  1. Create map of all comments and identify roots
  2. Build tree structure using ancestors array

### 3. Rendering
- Recursive `renderComment` component that handles any nesting depth
- Visual indentation based on depth (20px per level, max 8 levels)
- Auto-expands first 2 levels of comments
- Proper visual threading with borders and spacing

## Migration

### Running the Migration

To add the `ancestors` column to existing databases:

```bash
cd backend
node migrate-comments-ancestors.js
```

The migration script will:
1. Add the `ancestors` column if it doesn't exist
2. Create a GIN index for efficient queries
3. Backfill `ancestors` for all existing comments using a recursive query

### Manual Migration (SQL)

If you prefer to run SQL directly:

```sql
-- Add ancestors column
ALTER TABLE blog_comments 
ADD COLUMN IF NOT EXISTS ancestors integer[];

-- Create GIN index
CREATE INDEX IF NOT EXISTS idx_blog_comments_ancestors 
ON blog_comments USING gin(ancestors);

-- Backfill existing comments (run multiple times until no more updates)
WITH RECURSIVE comment_tree AS (
  SELECT id, parent_id, ARRAY[]::integer[] as ancestors
  FROM blog_comments
  WHERE parent_id IS NULL
  
  UNION ALL
  
  SELECT c.id, c.parent_id, 
         CASE 
           WHEN c.parent_id IS NULL THEN ARRAY[]::integer[]
           ELSE array_append(ct.ancestors, c.parent_id)
         END as ancestors
  FROM blog_comments c
  INNER JOIN comment_tree ct ON c.parent_id = ct.id
  WHERE c.ancestors IS NULL
)
UPDATE blog_comments bc
SET ancestors = ct.ancestors
FROM comment_tree ct
WHERE bc.id = ct.id 
  AND bc.ancestors IS NULL;
```

## Benefits

1. **Efficient Queries**: No need for recursive CTEs - simple array operations
2. **Fast Descendant Queries**: `WHERE comment_id = ANY(ancestors)` is very fast with GIN index
3. **Easy Depth Calculation**: `array_length(ancestors, 1)` gives depth directly
4. **Simple Cascading Deletes**: Delete comment and all descendants in one query
5. **Scalable**: Works well even with deep nesting

## API Endpoints

### Get Comments
```
GET /api/blog/posts/:id/comments?sort=new|old|top|replies
```

Returns comments with `ancestors` and `depth` fields, ordered by depth then creation time.

### Create Comment
```
POST /api/blog/posts/:id/comments
{
  "content": "Comment text",
  "parent_id": "123" // optional, for replies
}
```

Automatically populates `ancestors` array based on parent.

### Delete Comment
```
DELETE /api/blog/comments/:id
```

Deletes the comment and all its descendants efficiently using `ancestors` array.

## Testing

To test the implementation:

1. Create a root comment (no `parent_id`)
2. Reply to it (set `parent_id` to root comment ID)
3. Reply to the reply (nested threading)
4. Verify `ancestors` array is populated correctly
5. Delete a parent comment and verify all children are deleted

## Notes

- The `parent_id` column is kept for backward compatibility and easier debugging
- Maximum visual depth is 8 levels (configurable in frontend)
- Comments are auto-expanded for the first 2 levels
- The implementation maintains backward compatibility with existing code

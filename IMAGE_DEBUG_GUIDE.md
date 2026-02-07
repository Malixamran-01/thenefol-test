# Blog Image Display Debugging Guide

## What Was Fixed

The BlogDetail component now has enhanced image processing to handle multiple scenarios:

### 1. **Images with Full Paths**
- Format: `/uploads/blog/filename.png`
- These are automatically converted to full URLs with the API base

### 2. **Images with data-filename Attributes**
- Format: `<img data-filename="filename.png" src="blob:...">`
- These are matched against the `images` array from the database
- The blob URL is replaced with the actual server path

### 3. **Plain Filenames**
- Format: Just `filename.png` in the content
- If it matches a UUID pattern, it's converted to an image tag
- First tries to find it in the `images` array
- Falls back to constructing the path: `/uploads/blog/filename.png`

## How to Debug

### Step 1: Check Browser Console
Open the blog detail page and check the browser console for these logs:
```
Original content: <your content>
Available images: [array of image URLs]
Processed content: <processed content>
```

### Step 2: Check Database
Look at your blog post in the database:
- **content field**: Should contain either:
  - HTML with `<img>` tags
  - Plain text with image paths
  - Plain text with filenames
- **images field**: Should be a JSON array like:
  ```json
  ["/uploads/blog/e70f8180-e4c7-4b66-95bb-814b93c87fed-4a060e29-e4b6-4122-826c-eb389eb01f45.png"]
  ```

### Step 3: Check Network Tab
In the browser's Network tab, check if image requests are:
- ✅ Returning 200 OK
- ❌ Returning 404 Not Found (path is wrong)
- ❌ Not being requested at all (not rendered)

## Common Issues & Solutions

### Issue 1: Images Show as Filenames
**Symptom**: You see `e70f8180-e4c7-4b66-95bb-814b93c87fed-4a060e29-e4b6-4122-826c-eb389eb01f45.png` as text

**Solution**: The updated code now detects these filenames and converts them to `<img>` tags automatically.

### Issue 2: 404 Errors
**Symptom**: Images return 404 in Network tab

**Possible causes**:
- Files not uploaded to server
- Wrong path in database
- Server not serving `/uploads/` directory

**Check**: Verify the file exists on the server at the path shown in the database.

### Issue 3: Images Not in Database
**Symptom**: `images` field is empty or null

**Solution**: This might be a backend issue. The backend should:
1. Receive the images from FormData
2. Save them to `/uploads/blog/`
3. Store the paths in the `images` field as JSON array

## Testing the Fix

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload the page** (Ctrl+F5)
3. **Check console logs** for the processing output
4. **Inspect the image element** in DevTools to see the actual src attribute

## What to Check in Backend

If images still don't show, check your backend API:

```javascript
// When saving blog post, ensure images are processed:
POST /api/blog/request
- Receives: FormData with 'images' files
- Should save files to: /uploads/blog/
- Should store in DB: JSON array of paths
- Content should have: <img> tags with data-filename or paths
```

## Example of Correct Data

**Database content field (HTML format)**:
```html
<p>Some text</p>
<img src="/uploads/blog/e70f8180-e4c7-4b66-95bb-814b93c87fed-4a060e29-e4b6-4122-826c-eb389eb01f45.png" alt="Blog image" />
<p>More text</p>
```

**Database images field**:
```json
["/uploads/blog/e70f8180-e4c7-4b66-95bb-814b93c87fed-4a060e29-e4b6-4122-826c-eb389eb01f45.png"]
```

**Or plain text format**:
```
Some text

e70f8180-e4c7-4b66-95bb-814b93c87fed-4a060e29-e4b6-4122-826c-eb389eb01f45.png

More text
```

The code will automatically convert the filename to an image tag.

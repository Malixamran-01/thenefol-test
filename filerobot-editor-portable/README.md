# Filerobot Image Editor — Standalone Component

**Copy this folder into any project** to use the image editor. No npm install, no build step—just add the script and a container div.

## What's included

| File | Purpose |
|------|---------|
| `filerobot-image-editor.min.js` | Full bundle (~900KB, all deps included) |
| `index.html` | Ready-to-run example |
| `init.js` | Vanilla JS setup example |
| `INTEGRATION.md` | Full API reference & React usage |

## Quick start

1. Copy this folder to your project (e.g. `your-project/vendor/filerobot-editor/`).
2. Add to your HTML:

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
<div id="editor_container" style="width:100%;height:100vh;"></div>
<script src="vendor/filerobot-editor/filerobot-image-editor.min.js"></script>
<script>
  const editor = new FilerobotImageEditor(document.getElementById('editor_container'), {
    source: 'https://example.com/image.jpg',
    onSave: (info) => { /* save logic */ },
    onClose: () => editor.terminate(),
  });
  editor.render();
</script>
```

3. Open `index.html` in a browser to test locally.

## This folder is self-contained

All dependencies are bundled in `filerobot-image-editor.min.js`. No npm install needed.

To regenerate this folder from source (in the main project):

```bash
yarn build:standalone
```

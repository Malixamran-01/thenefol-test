# Filerobot Image Editor — Standalone Component

A self-contained image editor with all dependencies bundled. Drop into any project with minimal setup.

## Contents

- `filerobot-image-editor.min.js` — Full bundle (~900KB, includes React, Konva, styled-components, etc.)
- `index.html` — Minimal full-screen editor example
- `init.js` — Vanilla JS initialization example

## Quick Start (Vanilla JS / Any HTML Project)

### 1. Copy files to your project

Copy these files into your project:
- `filerobot-image-editor.min.js`
- (Optional) `init.js` as a reference

### 2. Add to your HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Required: Roboto font (or set theme.typography.fontFamily) -->
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    #editor_container { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="editor_container"></div>

  <script src="path/to/filerobot-image-editor.min.js"></script>
  <script>
    const { TABS } = FilerobotImageEditor;

    const editor = new FilerobotImageEditor(document.getElementById('editor_container'), {
      source: 'https://example.com/your-image.jpg',
      tabsIds: [TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.WATERMARK, TABS.ANNOTATE, TABS.RESIZE],
      observePluginContainerSize: true,
      onSave: (imageInfo) => {
        const link = document.createElement('a');
        link.href = imageInfo.imageBase64;
        link.download = imageInfo.fullName;
        link.click();
      },
      onClose: () => editor.terminate(),
    });

    editor.render();
  </script>
</body>
</html>
```

## React Integration

If your project uses React, you can use the React component directly (smaller bundle, tree-shakeable):

```bash
npm install react-filerobot-image-editor react react-dom react-konva styled-components
```

```jsx
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FilerobotImageEditor
        source="https://example.com/your-image.jpg"
        onSave={(imageData) => console.log('Saved', imageData)}
        onClose={() => {}}
        tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK]}
      />
    </div>
  );
}
```

## API Reference

### Constructor

```js
new FilerobotImageEditor(containerElement, config)
```

- **containerElement** — `HTMLElement` (required). The div that will hold the editor.
- **config** — Object. See config options below.

### Methods

- `editor.render(additionalConfig?)` — Mount or re-render the editor. Pass extra config to merge.
- `editor.terminate()` — Unmount and clean up.
- `editor.getCurrentImgData(imageFileInfo?, pixelRatio?, keepLoadingSpinnerShown?)` — Get current image data without saving.
- `editor.updateState(newStatePart)` — Update internal state (advanced).

### Config (common options)

| Option | Type | Description |
|--------|------|-------------|
| `source` | string \| HTMLImageElement | **Required.** Image URL or element. |
| `tabsIds` | string[] | Tabs to show. Use `FilerobotImageEditor.TABS`. |
| `defaultTabId` | string | Initial tab. |
| `defaultToolId` | string | Initial tool. Use `FilerobotImageEditor.TOOLS`. |
| `observePluginContainerSize` | boolean | Resize editor with container. |
| `onSave` | (imageData, designState) => void | Called when user saves. |
| `onClose` | (reason, hasUnsavedChanges) => void | Called when user closes. |

### Constants

- `FilerobotImageEditor.TABS` — `ADJUST`, `FINETUNE`, `FILTERS`, `WATERMARK`, `ANNOTATE`, `RESIZE`
- `FilerobotImageEditor.TOOLS` — `CROP`, `ROTATE`, `TEXT`, `RECT`, `ELLIPSE`, etc.

## Rebuilding

From the project root:

```bash
yarn build:packages
yarn build:js-bundle
yarn build:standalone
```

This updates `standalone/filerobot-image-editor.min.js` from the build output.

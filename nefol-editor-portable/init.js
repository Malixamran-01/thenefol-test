/**
 * Minimal initialization for Filerobot Image Editor (standalone)
 * Copy this file and customize the config for your project.
 */
(function () {
  const { TABS } = window.FilerobotImageEditor;

  const config = {
    source: 'https://scaleflex.cloudimg.io/v7/demo/stephen-walker-unsplash.jpg',
    tabsIds: [TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.WATERMARK, TABS.ANNOTATE, TABS.RESIZE],
    defaultTabId: TABS.ADJUST,
    observePluginContainerSize: true,
    onSave: function (imageInfo) {
      const link = document.createElement('a');
      link.href = imageInfo.imageBase64;
      link.download = imageInfo.fullName;
      link.click();
    },
    onClose: function () {
      editor.terminate();
    },
  };

  const editor = new window.FilerobotImageEditor(
    document.getElementById('editor_container'),
    config
  );

  editor.render();
})();

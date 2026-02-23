import React, { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'

const BLOG_SUBTITLE_CLASS = 'blog-subtitle'

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function buildInitialHtml(title: string, excerpt: string, content: string): string {
  const parts: string[] = []
  parts.push(`<h1>${escapeHtml(title || '')}</h1>`)
  parts.push(`<p class="${BLOG_SUBTITLE_CLASS}">${escapeHtml(excerpt || '')}</p>`)
  if (content && content.trim()) {
    parts.push(content.trim())
  } else {
    parts.push('<p></p>')
  }
  return parts.join('')
}

function extractFromHtml(html: string): { title: string; excerpt: string; content: string } {
  const div = document.createElement('div')
  div.innerHTML = html
  const children = Array.from(div.children)
  const h1 = div.querySelector('h1')
  const title = h1?.textContent?.trim() ?? ''
  const subtitleEl = children[1]
  const excerpt = subtitleEl?.textContent?.trim() ?? ''
  const bodyHtml = children.length > 2 ? children.slice(2).map((c) => c.outerHTML).join('') : ''
  return { title, excerpt, content: bodyHtml }
}

/** Returns true if position is in body (3rd block or later) */
function isInBody(editor: any): boolean {
  try {
    const { state } = editor
    const { doc, selection } = state
    const pos = selection.from
    if (doc.childCount < 3) return false
    let offset = 0
    for (let i = 0; i < doc.childCount; i++) {
      const node = doc.child(i)
      const nodeEnd = offset + node.nodeSize
      if (pos < nodeEnd) {
        return i >= 2
      }
      offset = nodeEnd
    }
    return true
  } catch {
    return false
  }
}

export interface BlogTipTapEditorProps {
  title: string
  excerpt: string
  content: string
  onChange: (title: string, excerpt: string, content: string) => void
  onBlur?: () => void
  onInsertImage?: () => void
  onImageClick?: (img: HTMLImageElement, e: MouseEvent) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
}

export function useBlogEditor({
  title,
  excerpt,
  content,
  onChange,
  onBlur,
  onInsertImage,
  onImageClick,
  placeholder = 'Start writing...',
  disabled = false,
  className = '',
  scrollContainerRef,
}: BlogTipTapEditorProps) {
  const initialHtmlRef = useRef<string | null>(null)
  const isInternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({
        HTMLAttributes: { class: 'editor-image' },
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', style: 'color: #4B97C9; text-decoration: underline;' },
      }),
      Youtube.configure({
        width: 560,
        height: 315,
        HTMLAttributes: { class: 'youtube-embed-wrapper' },
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: buildInitialHtml(title, excerpt, content),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'editor-content min-h-[500px] outline-none text-base text-gray-800 w-full pt-1 pb-32',
      },
      handleDOMEvents: {
        blur: () => onBlur?.(),
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement
        if (target.tagName === 'IMG' && onImageClick) {
          event.stopPropagation()
          onImageClick(target as HTMLImageElement, event as unknown as MouseEvent)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return
      const html = editor.getHTML()
      const { title: t, excerpt: e, content: c } = extractFromHtml(html)
      onChange(t, e, c)
    },
  })

  // Sync when title/excerpt/content change externally (e.g. draft restore)
  useEffect(() => {
    if (!editor) return
    const newHtml = buildInitialHtml(title, excerpt, content)
    if (initialHtmlRef.current !== newHtml && !isInternalUpdate.current) {
      isInternalUpdate.current = true
      editor.commands.setContent(newHtml, { emitUpdate: false })
      requestAnimationFrame(() => {
        isInternalUpdate.current = false
      })
    }
    initialHtmlRef.current = newHtml
  }, [editor, title, excerpt, content])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  const safeInsertImage = useCallback(() => {
    if (!editor) return
    if (!isInBody(editor)) {
      editor.commands.focus('end')
      const { doc } = editor.state
      if (doc.childCount >= 3) {
        const pos = doc.content.size - 1
        editor.commands.setTextSelection(pos)
      }
    }
    onInsertImage?.()
  }, [editor, onInsertImage])

  const safeInsertLink = useCallback(() => {
    if (!editor) return
    if (!isInBody(editor)) {
      editor.commands.focus('end')
    }
    editor.chain().focus().setLink({ href: '' }).run()
  }, [editor])

  const safeInsertYoutube = useCallback(() => {
    if (!editor) return
    if (!isInBody(editor)) {
      editor.commands.focus('end')
    }
    editor.chain().focus().setYoutubeVideo({ src: '' }).run()
  }, [editor])

  return {
    editor,
    safeInsertImage,
    safeInsertLink,
    safeInsertYoutube,
    getHTML: () => editor?.getHTML() ?? '',
    setContent: (t: string, e: string, c: string) => {
      if (editor) {
        isInternalUpdate.current = true
        editor.commands.setContent(buildInitialHtml(t, e, c), { emitUpdate: false })
        isInternalUpdate.current = false
      }
    },
    EditorContent,
  }
}

export { buildInitialHtml, extractFromHtml, isInBody, BLOG_SUBTITLE_CLASS }

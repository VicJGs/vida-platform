// ============================================================================
// export-copy — the EC-33 "Export a copy" download (notes-rescope R0, PLAN-R0 G8 / C-48).
// App-local and minimal on purpose: the general export surface (ExportDialog · PDF · DOCX) is shell-rescope's.
// ============================================================================

/** A filesystem-safe file name from a page title (`untitled` when empty). */
export function copyFilename(title: string, ext: 'json' | 'md'): string {
  const printable = Array.from(title, (ch) => (ch.charCodeAt(0) < 32 ? '-' : ch)).join('')
  const base = printable.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'untitled'
  return `${base}.${ext}`
}

/** Hand the viewer a text file (Blob → object URL → a transient `<a download>` click → revoke). */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

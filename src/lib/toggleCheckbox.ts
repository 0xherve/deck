// Matches a GFM task-list marker at the start of a list item, e.g.
// "- [ ] " or "* [x] " or "1. [X] ", capturing the bracket contents.
const TASK_MARKER_RE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s)/gm

/**
 * Flips the nth (0-indexed) GFM task-list checkbox marker found in `source`
 * from unchecked to checked or vice versa, changing only that single byte.
 * The rest of the document is returned untouched.
 */
export function toggleCheckbox(source: string, index: number): string {
  let count = 0
  let matched = false

  const result = source.replace(TASK_MARKER_RE, (full, before, mark, after) => {
    if (count !== index) {
      count += 1
      return full
    }
    count += 1
    matched = true
    const flipped = mark === " " ? "x" : " "
    return `${before}${flipped}${after}`
  })

  return matched ? result : source
}

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

/**
 * Returns the 0-indexed position of the task marker on the given 1-indexed
 * source line, matching the ordering `toggleCheckbox` uses.
 */
export function taskIndexAtLine(source: string, line: number): number {
  const lines = source.split("\n")
  const markerRe = /^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]\s/
  let index = 0

  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    if (markerRe.test(lines[i])) index += 1
  }

  return index
}

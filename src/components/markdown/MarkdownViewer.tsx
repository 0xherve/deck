import { useCallback, useMemo, type ComponentPropsWithoutRef } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import { resolveRef } from "@/lib/resolveRef"
import { taskIndexAtLine } from "@/lib/toggleCheckbox"
import { CodeBlock } from "@/components/markdown/CodeBlock"
import { Heading } from "@/components/markdown/Heading"
import { MermaidDiagram } from "@/components/markdown/MermaidDiagram"

interface MarkdownViewerProps {
  source: string
  baseDir: string
  navigate: (path: string) => void
  onToggleTask?: (index: number) => void
}

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeSlug]

const headingComponents = Object.fromEntries(
  ([1, 2, 3, 4, 5, 6] as const).map((level) => [
    `h${level}`,
    (props: ComponentPropsWithoutRef<"h1">) => <Heading level={level} {...props} />,
  ])
) as Components

export function MarkdownViewer({ source, baseDir, navigate, onToggleTask }: MarkdownViewerProps) {
  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const resolved = resolveRef(href, baseDir, false)
      if (resolved.kind === "anchor") return

      e.preventDefault()
      if (resolved.kind === "external-link") {
        window.open(resolved.href, "_blank", "noopener,noreferrer")
      } else {
        navigate(resolved.href)
      }
    },
    [baseDir, navigate]
  )

  const components = useMemo<Components>(
    () => ({
      ...headingComponents,
      a: ({ href, children, ...rest }) => (
        <a href={href} onClick={(e) => handleAnchorClick(e, href ?? "")} {...rest}>
          {children}
        </a>
      ),
      img: ({ src, alt, ...rest }) => {
        const resolved = resolveRef(String(src ?? ""), baseDir, true)
        return <img src={resolved.href} alt={alt} {...rest} />
      },
      li: ({ className, children, node, ...rest }) => {
        const isTask = typeof className === "string" && className.includes("task-list-item")
        const line = node?.position?.start.line
        if (!isTask || line === undefined) {
          return (
            <li className={className} {...rest}>
              {children}
            </li>
          )
        }

        return (
          <li className={`${className ?? ""} list-none -ml-5`} {...rest}>
            <TaskItem index={taskIndexAtLine(source, line)} onToggle={onToggleTask}>
              {children}
            </TaskItem>
          </li>
        )
      },
      code: ({ className, children, ...rest }) => {
        const match = /language-(\w+)/.exec(className ?? "")
        if (!match) {
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          )
        }
        const text = String(children).replace(/\n$/, "")
        if (match[1] === "mermaid") return <MermaidDiagram code={text} />
        return <CodeBlock code={text} lang={match[1]} />
      },
      pre: ({ children }) => <>{children}</>,
    }),
    [baseDir, handleAnchorClick, onToggleTask, source]
  )

  return (
    <div className="prose dark:prose-invert mx-auto max-w-[80vw] px-8 py-6">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

interface TaskItemProps {
  index: number
  onToggle?: (index: number) => void
  children: React.ReactNode
}

function TaskItem({ index, onToggle, children }: TaskItemProps) {
  const items = Array.isArray(children) ? children : [children]
  const [checkbox, ...rest] = items
  const checked =
    checkbox &&
    typeof checkbox === "object" &&
    "props" in checkbox &&
    Boolean((checkbox as { props: { checked?: boolean } }).props.checked)

  return (
    <span className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={!onToggle}
        onChange={() => onToggle?.(index)}
        className="mt-1.5 cursor-pointer accent-primary disabled:cursor-default"
      />
      <span>{rest}</span>
    </span>
  )
}

import { useCallback, type ComponentPropsWithoutRef } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import { resolveRef } from "@/lib/resolveRef"
import { CodeBlock } from "@/components/markdown/CodeBlock"
import { Heading } from "@/components/markdown/Heading"

interface MarkdownViewerProps {
  source: string
  baseDir: string
  navigate: (path: string) => void
  onToggleTask?: (index: number) => void
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children)
  }
  return ""
}

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

  function buildComponents(): Components {
    const counter = { taskIndex: 0 }

    return {
      h1: (props) => <Heading level={1} {...props} />,
      h2: (props) => <Heading level={2} {...props} />,
      h3: (props) => <Heading level={3} {...props} />,
      h4: (props) => <Heading level={4} {...props} />,
      h5: (props) => <Heading level={5} {...props} />,
      h6: (props) => <Heading level={6} {...props} />,
      a: ({ href, children, ...rest }) => (
        <a href={href} onClick={(e) => handleAnchorClick(e, href ?? "")} {...rest}>
          {children}
        </a>
      ),
      img: ({ src, alt, ...rest }) => {
        const resolved = resolveRef(String(src ?? ""), baseDir, true)
        return <img src={resolved.href} alt={alt} {...rest} />
      },
      li: ({ className, children, ...rest }: ComponentPropsWithoutRef<"li">) => {
        const isTask = typeof className === "string" && className.includes("task-list-item")
        if (!isTask) {
          return (
            <li className={className} {...rest}>
              {children}
            </li>
          )
        }

        const index = counter.taskIndex
        counter.taskIndex += 1

        return (
          <li className={`${className ?? ""} list-none -ml-5`} {...rest}>
            <TaskItem index={index} onToggle={onToggleTask}>
              {children}
            </TaskItem>
          </li>
        )
      },
      code: ({ className, children, ...rest }) => {
        const match = /language-(\w+)/.exec(className ?? "")
        const isBlock = Boolean(match)
        if (!isBlock) {
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          )
        }
        return <CodeBlock code={extractText(children).replace(/\n$/, "")} lang={match![1]} />
      },
      pre: ({ children }) => <>{children}</>,
    }
  }

  return (
    <div className="prose dark:prose-invert mx-auto max-w-[80vw] px-8 py-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={buildComponents()}
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
  // react-markdown renders GFM task items as [<input type=checkbox>, " ", ...rest]
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

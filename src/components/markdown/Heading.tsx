import { IconLink } from "@tabler/icons-react"
import type { ComponentPropsWithoutRef } from "react"

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

interface HeadingProps extends ComponentPropsWithoutRef<"h1"> {
  level: HeadingLevel
}

export function Heading({ level, id, children, className, ...rest }: HeadingProps) {
  const Tag = `h${level}` as const

  return (
    <Tag id={id} className={`group/heading relative scroll-mt-16 ${className ?? ""}`} {...rest}>
      {id && (
        <a
          href={`#${id}`}
          aria-label="Link to this heading"
          className="absolute -left-5 top-0 bottom-0 flex items-center opacity-0 text-muted-foreground hover:text-foreground group-hover/heading:opacity-100"
        >
          <IconLink size={16} />
        </a>
      )}
      {children}
    </Tag>
  )
}

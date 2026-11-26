import type { ReactNode } from 'react'

type AnswerBlock =
  | { type: 'paragraph' | 'heading'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

function parseAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let listOrdered: boolean | undefined

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: 'list', ordered: Boolean(listOrdered), items: listItems })
      listItems = []
      listOrdered = undefined
    }
  }

  for (const rawLine of text.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    const heading = line.match(/^#{1,4}\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', text: heading[1] })
      continue
    }
    const item = line.match(/^(?:(\d+)[.)]\s+|[-*•]\s+)(.+)$/)
    if (item) {
      flushParagraph()
      const ordered = Boolean(item[1])
      if (listItems.length && listOrdered !== ordered) flushList()
      listOrdered = ordered
      listItems.push(item[2])
      continue
    }
    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>
      }
      return <span key={index}>{part}</span>
    })
}

function visibleText(text: string, streaming: boolean): string {
  if (!streaming) return text
  const boldMarkers = text.match(/\*\*/g)?.length ?? 0
  if (boldMarkers % 2 === 1) return text.slice(0, text.lastIndexOf('**'))
  const italicMarkers = text.replace(/\*\*/g, '').match(/\*/g)?.length ?? 0
  if (italicMarkers % 2 === 1) return text.slice(0, text.lastIndexOf('*'))
  return text
}

export function FormattedAnswer({
  text,
  streaming = false,
}: {
  text: string
  streaming?: boolean
}) {
  return (
    <div className="formatted-answer" aria-live="polite" aria-busy={streaming}>
      {parseAnswer(visibleText(text, streaming)).map((block, index) => {
        if (block.type === 'heading') {
          return <h4 key={index}>{renderInline(block.text)}</h4>
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</List>
        }
        return <p key={index}>{renderInline(block.text)}</p>
      })}
      {streaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  )
}

import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

/** Safe subset markdown renderer for Miya chat (headings, lists, bold, italics). */
export function MiyaMessageBody({ content, className }: Props) {
  const text = content || "";
  if (!text.trim()) return null;

  const blocks = splitBlocks(text);

  return (
    <div className={cn("miya-md space-y-2 text-[13px] leading-relaxed", className)}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <p
              key={i}
              className={cn(
                "font-semibold tracking-tight text-foreground",
                block.level === 1 && "text-[15px]",
                block.level === 2 && "text-[14px]",
                block.level >= 3 && "text-[13px] uppercase tracking-wide text-muted-foreground",
              )}
            >
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-4">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string };

function splitBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      out.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, "").trim());
        i += 1;
      }
      out.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "").trim());
        i += 1;
      }
      out.push({ type: "ol", items });
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*[-*•]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    out.push({ type: "p", text: para.join("\n") });
  }
  return out;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 text-[12px]">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

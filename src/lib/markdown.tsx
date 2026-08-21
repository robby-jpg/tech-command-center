import Link from "next/link";
import * as React from "react";

/**
 * A deliberately small Markdown renderer.
 *
 * It builds React elements directly and never touches `dangerouslySetInnerHTML`,
 * so article content cannot inject markup or script no matter what it contains.
 * That property is the reason this exists rather than a general-purpose library:
 * when articles become editable by people outside the Tech Department, the safe
 * path should already be the only path.
 *
 * Supported: headings, paragraphs, unordered and ordered lists, tables,
 * blockquotes, fenced and inline code, bold, italic, links, horizontal rules.
 * Anything else renders as plain text, which is the right failure mode.
 */

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "rule" };

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    // Fenced code
    if (line.trimStart().startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.trimStart().startsWith("```")) {
        body.push(lines[index]!);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    if (/^---+\s*$/.test(line.trim())) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1]!.length as 2 | 3 | 4,
        text: heading[2]!.trim(),
      });
      index += 1;
      continue;
    }

    // Table: a header row followed by a separator row.
    if (line.trim().startsWith("|") && (lines[index + 1] ?? "").includes("---")) {
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());

      const head = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index]!.trim().startsWith("|")) {
        rows.push(cells(lines[index]!));
        index += 1;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    if (line.trimStart().startsWith("> ")) {
      const body: string[] = [];
      while (index < lines.length && lines[index]!.trimStart().startsWith(">")) {
        body.push(lines[index]!.trimStart().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: body.join(" ") });
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const items: string[] = [];
      while (
        index < lines.length &&
        (ordered ? numbered.test(lines[index]!) : bullet.test(lines[index]!))
      ) {
        items.push(lines[index]!.replace(ordered ? numbered : bullet, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index]!.trim() !== "" &&
      !/^(#{2,4})\s/.test(lines[index]!) &&
      !bullet.test(lines[index]!) &&
      !numbered.test(lines[index]!) &&
      !lines[index]!.trimStart().startsWith(">") &&
      !lines[index]!.trimStart().startsWith("```") &&
      !lines[index]!.trim().startsWith("|")
    ) {
      paragraph.push(lines[index]!.trim());
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    }
  }

  return blocks;
}

/** Bold, italic, inline code and links, as React nodes. */
function inline(text: string, keyPrefix = ""): React.ReactNode[] {
  const pattern =
    /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*[^*\s][^*]*\*)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const id = `${keyPrefix}-${key++}`;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={id} className="font-semibold text-fg">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={id}
          className="rounded-xs bg-subtle px-1 py-0.5 font-mono text-[0.85em] text-navy-700"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const href = link[2]!;
        const internal = href.startsWith("/");
        nodes.push(
          internal ? (
            <Link key={id} href={href} className="text-teal-700 underline-offset-2 hover:underline">
              {link[1]}
            </Link>
          ) : (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline-offset-2 hover:underline"
            >
              {link[1]}
            </a>
          ),
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <em key={id} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const blocks = React.useMemo(() => parse(content), [content]);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h2" | "h3" | "h4";
            return (
              <Tag
                key={index}
                className={
                  block.level === 2
                    ? "mt-7 border-b border-line-soft pb-1.5 text-base font-semibold text-fg first:mt-0"
                    : block.level === 3
                      ? "mt-5 text-sm font-semibold text-fg"
                      : "mt-4 text-xs font-semibold tracking-wide text-fg-muted uppercase"
                }
              >
                {inline(block.text, `h${index}`)}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={index} className="text-sm leading-6.5 text-fg-body">
                {inline(block.text, `p${index}`)}
              </p>
            );

          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={index}
                className={
                  block.ordered
                    ? "list-decimal space-y-1.5 pl-5 text-sm leading-6.5 text-fg-body marker:text-fg-subtle"
                    : "list-disc space-y-1.5 pl-5 text-sm leading-6.5 text-fg-body marker:text-fg-subtle"
                }
              >
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item, `l${index}-${i}`)}</li>
                ))}
              </Tag>
            );
          }

          case "quote":
            return (
              <blockquote
                key={index}
                className="rounded-r-md border-l-2 border-teal-400 bg-teal-50/50 py-2 pl-3.5 text-sm leading-6 text-fg-body"
              >
                {inline(block.text, `q${index}`)}
              </blockquote>
            );

          case "code":
            return (
              <pre
                key={index}
                className="scrollbar-slim overflow-x-auto rounded-md border border-line bg-subtle px-3 py-2.5"
              >
                <code className="font-mono text-[11px] leading-5 text-navy-700">
                  {block.text}
                </code>
              </pre>
            );

          case "table":
            return (
              <div
                key={index}
                className="scrollbar-slim overflow-x-auto rounded-md border border-line"
              >
                <table className="w-full">
                  <thead className="bg-subtle">
                    <tr>
                      {block.head.map((cell, i) => (
                        <th
                          key={i}
                          className="border-b border-line px-3 py-2 text-left text-2xs font-semibold tracking-wide text-fg-muted uppercase"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-2 text-xs leading-5 text-fg-body">
                            {inline(cell, `t${index}-${r}-${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "rule":
            return <hr key={index} className="border-line-soft" />;
        }
      })}
    </div>
  );
}

/** Headings, for an article's table of contents. */
export function extractHeadings(content: string): { level: number; text: string }[] {
  return parse(content)
    .filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading")
    .map((b) => ({ level: b.level, text: b.text }));
}

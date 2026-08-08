import hljs from "highlight.js";
import { marked, type Tokens } from "marked";

import type { FindingImage } from "@/types";

const IMAGE_TOKEN_PATTERN = /riskarm-image:([\w-]+)/g;

/** Shared prose styling for rendered markdown output (report view, detail view, editor preview). */
export const MARKDOWN_CONTENT_CLASSNAME =
  "text-medium-text [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-light-text [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-light-text [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-bold [&_h3]:text-light-text [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-link-DEFAULT [&_a]:underline [&_code]:rounded [&_code]:bg-dark-bg [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-dark-bg [&_pre]:p-3 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_strong]:text-light-text";

/** Resolves `riskarm-image:{id}` tokens in markdown source to real data: URLs. */
function resolveImageTokens(markdownSource: string, images: readonly FindingImage[]): string {
  const imageById = new Map(images.map((image) => [image.id, image]));
  return markdownSource.replace(IMAGE_TOKEN_PATTERN, (fullMatch, imageId: string) => {
    const image = imageById.get(imageId);
    return image ? image.dataUrl : fullMatch;
  });
}

function highlightCode({ text, lang }: Tokens.Code): string {
  const language = lang && hljs.getLanguage(lang) ? lang : undefined;
  const highlighted = language
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value;
  const languageClass = language ? ` language-${language}` : "";
  return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>`;
}

const renderer = new marked.Renderer();
renderer.code = highlightCode;

marked.use({ renderer, gfm: true, breaks: true });

/**
 * Renders finding/template markdown content to HTML, resolving embedded
 * image tokens first (see src/lib/imageCompress.ts for how images[] is
 * populated) and syntax-highlighting fenced code blocks via highlight.js.
 */
export function renderMarkdown(
  markdownSource: string,
  images: readonly FindingImage[] = [],
): string {
  const resolved = resolveImageTokens(markdownSource, images);
  const result = marked.parse(resolved);
  if (typeof result !== "string") {
    throw new Error("Unexpected asynchronous result from markdown parser.");
  }
  return result;
}

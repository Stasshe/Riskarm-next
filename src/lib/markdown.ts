import hljs from "highlight.js";
import { marked, type Tokens } from "marked";

import type { FindingImage } from "@/types";

const IMAGE_TOKEN_PATTERN = /riskarm-image:([\w-]+)/g;

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

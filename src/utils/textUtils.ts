import DOMPurify from 'dompurify';

/**
 * Extracts a clean, plain text preview/snippet from HTML or encoded HTML
 * for use in feed cards and summaries with line-clamp, ensuring NO HTML tags
 * or escaped code entities (&lt;p&gt;, <p>, <br>, etc.) are shown to the user.
 */
export function getPlainTextSnippet(htmlOrText?: string): string {
  if (!htmlOrText || typeof htmlOrText !== 'string') return '';
  try {
    const parser = new DOMParser();
    // First pass
    const doc1 = parser.parseFromString(htmlOrText, 'text/html');
    let text = doc1.body.textContent || '';
    
    // If it was double-encoded or contains residual tags like &lt;p&gt;
    if (text.includes('<') && text.includes('>')) {
      const doc2 = parser.parseFromString(text, 'text/html');
      text = doc2.body.textContent || text;
    }
    // Clean up excessive whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return htmlOrText.replace(/<[^>]+>/g, '').trim();
  }
}

/**
 * Returns safely sanitized HTML for rich text rendering,
 * correctly decoding any previously escaped entities (e.g. &lt;p&gt;)
 * before DOMPurify sanitization.
 */
export function getCleanHtml(html?: string): string {
  if (!html || typeof html !== 'string') return '';
  let content = html;
  if (content.includes('&lt;') && content.includes('&gt;')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      content = doc.body.textContent || content;
    } catch {
      // fallback
    }
  }
  return DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe', 'blockquote', 'u'],
    ADD_ATTR: [
      'allow', 
      'allowfullscreen', 
      'frameborder', 
      'scrolling', 
      'src', 
      'width', 
      'height', 
      'style', 
      'class', 
      'target', 
      'rel', 
      'title',
      'data-instgrm-permalink', 
      'data-instgrm-version'
    ]
  });
}

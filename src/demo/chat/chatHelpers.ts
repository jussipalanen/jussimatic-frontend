import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { Language } from '../../i18n';
import type { OutputPart } from './types';

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'b',
  'strong',
  'i',
  'em',
  'p',
  'br',
  'a',
  'blockquote',
  'code',
  'pre',
  'img',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'src', 'alt'];

export const sanitizeHtml = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

const parseCustomTags = (value: string) =>
  value
    .replace(/\[photo\](.*?)\[\/photo\]/gi, '![Photo]($1)')
    .replace(/\[image\](.*?)\[\/image\]/gi, '![Image]($1)');

export const formatBotHtml = (value: string) => {
  const parsed = parseCustomTags(value);
  const html = marked.parse(parsed, { breaks: true, gfm: true });
  return sanitizeHtml(String(html));
};

const joinOutputText = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const text = value
    .map((item) =>
      item && typeof (item as OutputPart).text === 'string' ? (item as OutputPart).text : ''
    )
    .filter((chunk): chunk is string => typeof chunk === 'string' && chunk.length > 0)
    .join('');

  return text.length > 0 ? text : null;
};

const getTextFromUnknown = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return joinOutputText(value);
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    return joinOutputText(record.text);
  }
  return null;
};

export const getBotText = (response: unknown, fallback: string) => {
  const topLevelText = getTextFromUnknown(response);
  if (topLevelText) return topLevelText;

  if (typeof response !== 'object' || response === null) return fallback;

  const typed = response as Record<string, unknown>;
  const replyText = getTextFromUnknown(typed.reply);
  if (replyText) return replyText;

  const answerText = getTextFromUnknown(typed.answer);
  if (answerText) return answerText;

  const outputText = getTextFromUnknown(typed.output) ?? getTextFromUnknown(typed.content);
  if (outputText) return outputText;

  return fallback;
};

export const formatTimestamp = (value: number | undefined, language: Language) => {
  if (!value) return '';

  return new Intl.DateTimeFormat(language, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

import Link from '@tiptap/extension-link';

export const NoteLink = Link.extend({
  inclusive: false,
});

const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;
const IS_RELATIVE_OR_ANCHOR = /^(?:#|\/|\.\.?\/)/;
const IS_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeLinkHref = (value: string): string => {
  const href = value.trim();

  if (!href || HAS_PROTOCOL.test(href) || IS_RELATIVE_OR_ANCHOR.test(href)) {
    return href;
  }

  if (IS_EMAIL.test(href)) {
    return `mailto:${href}`;
  }

  return `https://${href}`;
};

export const openLinkOnModifierClick = (event: MouseEvent): boolean => {
  if (event.button !== 0 || (!event.metaKey && !event.ctrlKey)) {
    return false;
  }

  if (!(event.target instanceof Element)) {
    return false;
  }

  const link = event.target.closest<HTMLAnchorElement>('a[href]');
  if (!link) {
    return false;
  }

  event.preventDefault();
  window.open(link.href, link.target || '_blank', 'noopener,noreferrer');
  return true;
};

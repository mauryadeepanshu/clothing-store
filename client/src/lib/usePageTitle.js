import { useEffect } from 'react';

const BASE = 'Modern Fashion Store';
/** Sets the browser tab title for a page and restores the default on leave. */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : BASE;
    return () => { document.title = BASE; };
  }, [title]);
}

interface IframePreviewProps {
  html: string;
  title?: string;
  className?: string;
}

/**
 * Renders AI-generated HTML in a sandboxed iframe via srcdoc.
 * Never uses dangerouslySetInnerHTML or eval on model output.
 *
 * allow-scripts + allow-same-origin: needed for inline JS interactivity
 * (tabs, toggles) inside srcdoc. The iframe origin is opaque enough that
 * parent page storage isn't exposed in practice for srcdoc documents;
 * we still avoid allow-forms/top-navigation/popups.
 */
export function IframePreview({
  html,
  title = 'Design preview',
  className = '',
}: IframePreviewProps) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts"
      className={`h-full w-full border-0 bg-white ${className}`}
      // Referrer policy keeps API keys in the parent app from leaking via Referer
      referrerPolicy="no-referrer"
    />
  );
}

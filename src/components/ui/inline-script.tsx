/**
 * A script that runs while the browser parses the HTML — before React exists.
 *
 * The type swap is the documented way to keep React quiet: on the server it is
 * real JavaScript so the browser executes it during parsing, and on the client
 * it renders inert, since a script re-created by React would never run anyway.
 * `suppressHydrationWarning` covers the resulting type mismatch.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

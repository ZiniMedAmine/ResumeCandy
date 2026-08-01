"use client";

/**
 * A script that runs while the browser parses the HTML — before React exists.
 *
 * The type swap is the documented way to keep React quiet: on the server it is
 * real JavaScript so the browser executes it during parsing, and on the client
 * it renders inert, since a script re-created by React would never run anyway.
 * `suppressHydrationWarning` covers the resulting type mismatch.
 *
 * The "use client" is what makes that swap work at all. Rendered from a Server
 * Component the check is dead code: `typeof window` is evaluated once on the
 * server, `type="text/javascript"` is baked into the RSC payload, and the
 * browser then reads a script tag out of that payload and warns. Only a Client
 * Component re-runs the check during hydration and resolves to "text/plain".
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

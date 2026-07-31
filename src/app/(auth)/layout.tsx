/** Centred, chrome-free shell for the signed-out pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-canvas px-5 py-12">
      {children}
    </div>
  );
}

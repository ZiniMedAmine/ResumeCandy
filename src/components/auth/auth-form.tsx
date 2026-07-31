"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { LayersIcon } from "@/components/ui/icons";

type Action = (
  state: AuthFormState | undefined,
  formData: FormData,
) => Promise<AuthFormState>;

/**
 * Shared shell for sign in and sign up.
 *
 * Errors come back from the Server Action through `useActionState` rather than
 * being re-derived on the client, so the browser and the server never disagree
 * about what was wrong — and the fields the user already filled survive a
 * failed submit.
 */
export function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const signup = mode === "signup";

  const field =
    "w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10";

  return (
    <div className="anim-rise w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-card">
          <LayersIcon className="size-7" />
        </span>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">
          {signup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
          {signup
            ? "One account holds every resume and all of their versions."
            : "Sign in to pick up where you left off."}
        </p>
      </div>

      <form action={formAction} className="rounded-2xl bg-surface p-6 shadow-card">
        {state?.error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
          >
            {state.error}
          </p>
        )}

        <div className="space-y-4">
          {signup && (
            <Field
              label="Name"
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              defaultValue={state?.values?.name}
              error={state?.fieldErrors?.name}
              className={field}
            />
          )}
          <Field
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state?.values?.email}
            error={state?.fieldErrors?.email}
            className={field}
          />
          <Field
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "At least 8 characters" : "Your password"}
            error={state?.fieldErrors?.password}
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="pressable mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-3 text-[15px] font-semibold text-white shadow-card transition-all duration-150 hover:shadow-card-hover hover:brightness-[1.03] disabled:opacity-60"
        >
          {pending ? "Just a moment…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-[13.5px] text-ink-muted">
        {signup ? "Already have an account? " : "New here? "}
        <Link
          href={signup ? "/login" : "/signup"}
          className="font-semibold text-rose-500 transition-colors duration-150 hover:text-rose-600 hover:underline"
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint"
      >
        {label}
      </label>
      <input
        id={id}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${className} ${error ? "border-red-300 focus:border-red-400 focus:ring-red-500/10" : ""}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in · Flint" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-text-primary">Sign in to Flint</h1>
      <p className="mt-1.5 text-sm text-text-secondary">Welcome back. Your releases are waiting.</p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-6 text-[13px] text-text-secondary">
        New to Flint?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-10 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-muted">
        Protected by session cookies and rate-limited sign-in.
      </p>
    </div>
  );
}

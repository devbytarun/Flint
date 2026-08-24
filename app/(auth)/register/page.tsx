import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Create account · Flint" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-text-primary">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-text-secondary">
        Start shipping features with control — your first project takes a minute.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>

      <p className="mt-6 text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-10 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-muted">
        Passwords are hashed with Argon2id and never stored in plain text.
      </p>
    </div>
  );
}

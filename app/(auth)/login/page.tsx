import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Sign in · Flint" };

export default function LoginPage() {
  return (
    <Card>
      <h1 className="text-lg font-semibold tracking-tight">Sign in to Flint</h1>
      <p className="mt-1 text-sm text-text-secondary">Welcome back.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-[13px] text-text-secondary">
        New to Flint?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Create account · Flint" };

export default function RegisterPage() {
  return (
    <Card>
      <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-text-secondary">Start shipping features with control.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

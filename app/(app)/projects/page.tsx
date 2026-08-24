import { getCurrentUser } from "@/server/auth/current-user";

export const metadata = { title: "Projects · Flint" };

/**
 * Interim projects view. Replaced by the full project workspace in the
 * next milestone; exists so the authenticated shell has a real destination.
 */
export default async function ProjectsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Signed in as {user?.email}. Project management arrives with the authorization milestone.
      </p>
    </div>
  );
}

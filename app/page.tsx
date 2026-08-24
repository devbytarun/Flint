import Link from "next/link";

import { RolloutDemo } from "@/components/landing/rollout-demo";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 1.5 15 9l7.5 3L15 15l-3 7.5L9 15 1.5 12 9 9l3-7.5Z"
                className="fill-accent"
              />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight">Flint</span>
          </span>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="pb-20 pt-20 text-center sm:pt-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-text-primary sm:text-5xl">
            Ship features with control.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-text-secondary">
            Flint is feature flags for teams that ship carefully: roll out gradually, target exactly
            who you want, and flip anything off in one click — without redeploying.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/register">
              <Button className="h-10 px-5">Start rolling out</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" className="h-10 px-5">
                See how it works
              </Button>
            </a>
          </div>
          <p className="mt-4 font-mono text-xs text-text-muted">
            new_dashboard → ON · ai_assistant → OFF · new_checkout → 25%
          </p>
        </section>

        {/* Problem */}
        <Reveal>
          <section className="border-t border-border-subtle py-16">
            <h2 className="text-lg font-semibold tracking-tight">
              Deploying isn&apos;t the hard part.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Releasing to everyone at once is. One bad path can take down every user at once.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "All-or-nothing releases",
                  body: "A merge ships to 100% of users instantly, whether it's ready or not.",
                },
                {
                  title: "Rollbacks mean redeploys",
                  body: "Fixing a bad feature takes a build cycle instead of a click.",
                },
                {
                  title: "No safe way to test",
                  body: "Staging passes, production still surprises you — because traffic looks nothing like tests.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5"
                >
                  <h3 className="text-sm font-medium text-text-primary">{card.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* How it works */}
        <Reveal>
          <section id="how-it-works" className="border-t border-border-subtle py-16">
            <h2 className="text-lg font-semibold tracking-tight">
              Three primitives. That&apos;s the whole product.
            </h2>
            <ol className="mt-8 space-y-4">
              {[
                {
                  step: "01",
                  title: "Define a flag",
                  body: "new_checkout starts disabled in every environment. Your code checks one boolean.",
                  code: 'const enabled = await flint.isEnabled("new_checkout", user)',
                },
                {
                  step: "02",
                  title: "Target or ramp",
                  body: "Serve pro users first, then raise the rollout when metrics agree.",
                  code: "plan ∈ {pro, enterprise} → ON · else 25% of everyone",
                },
                {
                  step: "03",
                  title: "Kill or complete",
                  body: "Every evaluation is audited. Turn a flag off and production changes instantly.",
                  code: 'POST /api/v1/evaluate → { "enabled": true }',
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="grid gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5 sm:grid-cols-[auto_1fr_1fr] sm:items-center"
                >
                  <span className="font-mono text-sm text-accent tabular">{item.step}</span>
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                      {item.body}
                    </p>
                  </div>
                  <code className="overflow-x-auto rounded-md border border-border-subtle bg-canvas px-3 py-2 font-mono text-xs text-text-secondary">
                    {item.code}
                  </code>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>

        {/* Progressive rollout visualization */}
        <Reveal>
          <section className="border-t border-border-subtle py-16">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Rollouts your users can&apos;t feel.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  The same user always lands in the same bucket. Raise the percentage and people
                  only ever move forward — never out of a feature they were using.
                </p>
                <ul className="mt-5 space-y-2 text-[13px] text-text-secondary">
                  <li>· Deterministic SHA-256 bucketing per flag and environment</li>
                  <li>· Renaming a flag never reshuffles its users</li>
                  <li>· Targeting rules override percentages, first match wins</li>
                </ul>
              </div>
              <RolloutDemo />
            </div>
          </section>
        </Reveal>

        {/* Developer API */}
        <Reveal>
          <section className="border-t border-border-subtle py-16">
            <h2 className="text-lg font-semibold tracking-tight">
              An API built for integration day one.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Environment-scoped keys, predictable JSON, rate limits with headers that tell the
              truth. A zero-dependency client ships with the project.
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 font-mono text-xs text-text-muted">REQUEST</p>
                <pre className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle bg-surface p-4 font-mono text-xs leading-relaxed text-text-secondary">
                  <code>{`curl -X POST https://your-flint/api/v1/evaluate \\
  -H "Authorization: Bearer flint.production.xxxx…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "context": {
      "targetingKey": "user_123",
      "attributes": { "plan": "pro" }
    },
    "flagKeys": ["new_checkout"]
  }'`}</code>
                </pre>
              </div>
              <div>
                <p className="mb-2 font-mono text-xs text-text-muted">RESPONSE · 200 OK</p>
                <pre className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle bg-surface p-4 font-mono text-xs leading-relaxed text-success">
                  <code>{`{
  "evaluations": {
    "new_checkout": {
      "enabled": true,
      "reason": "TARGETING_RULE_MATCH"
    }
  }
}`}</code>
                </pre>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Security */}
        <Reveal>
          <section className="border-t border-border-subtle py-16">
            <h2 className="text-lg font-semibold tracking-tight">Infrastructure-grade defaults.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Hashed credentials",
                  body: "Passwords use Argon2id. Sessions are opaque tokens stored only as hashes.",
                },
                {
                  title: "Scoped API keys",
                  body: "Keys bind to one environment, stored hashed, shown once, revocable instantly.",
                },
                {
                  title: "Append-only audit",
                  body: "Every configuration change records actor, environment, and before/after state.",
                },
                {
                  title: "Server-side roles",
                  body: "Owner, admin, member — enforced in the server, not hidden in the UI.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5"
                >
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* CTA */}
        <Reveal>
          <section className="py-20 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Stop releasing blind.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary">
              Create a project, flip your first flag, and watch a rollout move at your pace.
            </p>
            <Link href="/register" className="mt-6 inline-block">
              <Button className="h-10 px-6">Create your free account</Button>
            </Link>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Flint</span>
          <span className="font-mono">Feature flags &amp; controlled rollouts</span>
        </div>
      </footer>
    </div>
  );
}

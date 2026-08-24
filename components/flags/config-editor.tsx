"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import type { TargetingOperator } from "@/lib/evaluation";
import { updateFlagConfigAction, type FlagFormState } from "@/server/actions/flags";

export interface EditorEnvironment {
  id: string;
  key: string;
  name: string;
  protected: boolean;
}

interface DraftRule {
  attribute: string;
  operator: TargetingOperator;
  /** Raw comma-separated text; parsed into values on save. */
  valuesText: string;
  serve: boolean;
}

interface DraftConfig {
  enabled: boolean;
  rolloutPercent: number;
  rules: DraftRule[];
}

export interface EditorInitialConfig {
  enabled: boolean;
  rolloutPercentage: number; // basis points
  rules: Array<{
    attribute: string;
    operator: TargetingOperator;
    values: string[];
    serve: boolean;
  }>;
}

const OPERATORS: TargetingOperator[] = [
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notExists",
];

const initialState: FlagFormState = {};

function toDraft(config: EditorInitialConfig): DraftConfig {
  return {
    enabled: config.enabled,
    rolloutPercent: Math.round(config.rolloutPercentage / 100),
    rules: config.rules.map((rule) => ({
      attribute: rule.attribute,
      operator: rule.operator,
      valuesText: rule.values.join(", "),
      serve: rule.serve,
    })),
  };
}

function draftToPayload(draft: DraftConfig) {
  return JSON.stringify({
    enabled: draft.enabled,
    rolloutPercentage: Math.round(draft.rolloutPercent * 100),
    rules: draft.rules.map((rule) => ({
      attribute: rule.attribute.trim(),
      operator: rule.operator,
      values:
        rule.operator === "exists" || rule.operator === "notExists"
          ? []
          : rule.valuesText
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
      serve: rule.serve,
    })),
  });
}

function sameConfig(a: EditorInitialConfig, b: DraftConfig): boolean {
  const normalized = toDraft(a);
  if (normalized.enabled !== b.enabled) return false;
  if (normalized.rolloutPercent !== b.rolloutPercent) return false;
  if (normalized.rules.length !== b.rules.length) return false;
  for (let i = 0; i < normalized.rules.length; i++) {
    const x = normalized.rules[i];
    const y = b.rules[i];
    if (
      x.attribute !== y.attribute ||
      x.operator !== y.operator ||
      x.valuesText !== y.valuesText ||
      x.serve !== y.serve
    ) {
      return false;
    }
  }
  return true;
}

export function FlagConfigEditor({
  slug,
  flagKey,
  environments,
  initialConfigs,
}: {
  slug: string;
  flagKey: string;
  environments: EditorEnvironment[];
  initialConfigs: Record<string, EditorInitialConfig>;
}) {
  const [envId, setEnvId] = useState(environments[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, DraftConfig>>(() => {
    const map: Record<string, DraftConfig> = {};
    for (const env of environments) {
      map[env.id] = toDraft(
        initialConfigs[env.id] ?? { enabled: false, rolloutPercentage: 0, rules: [] },
      );
    }
    return map;
  });
  const [state, formAction, pending] = useActionState(updateFlagConfigAction, initialState);

  const selectedEnv = useMemo(
    () => environments.find((env) => env.id === envId),
    [environments, envId],
  );
  const draft = drafts[envId];
  const saved = initialConfigs[envId]
    ? initialConfigs[envId]
    : { enabled: false, rolloutPercentage: 0, rules: [] };
  const dirty = draft ? !sameConfig(saved, draft) : false;

  function updateDraft(mutate: (draft: DraftConfig) => void) {
    setDrafts((previous) => {
      const copy = {
        ...previous,
        [envId]: { ...previous[envId], rules: [...previous[envId].rules] },
      };
      mutate(copy[envId]);
      return copy;
    });
  }

  if (!draft || !selectedEnv) return null;

  return (
    <div>
      {/* Environment tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {environments.map((env) => (
          <button
            key={env.id}
            type="button"
            onClick={() => setEnvId(env.id)}
            className={
              env.id === envId
                ? "cursor-pointer rounded-md border border-border-strong bg-surface-raised px-3 py-1.5 text-[13px] font-medium"
                : "cursor-pointer rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary"
            }
          >
            {env.name}
          </button>
        ))}
      </div>

      <form action={formAction} className="mt-4 space-y-6">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="flagKey" value={flagKey} />
        <input type="hidden" name="environmentId" value={envId} />
        <input type="hidden" name="config" value={draft ? draftToPayload(draft) : ""} />

        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger"
          >
            {state.error}
          </p>
        ) : null}

        {/* Master switch + rollout */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">Status</h3>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {draft.enabled
                  ? "Serving in this environment."
                  : "Disabled — evaluates to OFF for everyone."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              aria-label={`Enable ${flagKey} in ${selectedEnv.key}`}
              disabled={pending}
              onClick={() =>
                updateDraft((d) => {
                  d.enabled = !d.enabled;
                })
              }
              className={
                draft.enabled
                  ? "relative h-6 w-11 cursor-pointer rounded-full bg-success/80 transition-colors"
                  : "relative h-6 w-11 cursor-pointer rounded-full bg-border-strong transition-colors"
              }
            >
              <span
                className={
                  draft.enabled
                    ? "absolute right-0.5 top-0.5 size-5 rounded-full bg-canvas transition-transform"
                    : "absolute left-0.5 top-0.5 size-5 rounded-full bg-canvas transition-transform"
                }
              />
            </button>
          </div>

          {draft.enabled ? (
            <div className="mt-5">
              <Label htmlFor={`rollout-${envId}`}>
                Rollout — {draft.rolloutPercent}% of users without a matching rule
              </Label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  id={`rollout-${envId}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.rolloutPercent}
                  onChange={(event) =>
                    updateDraft((d) => {
                      d.rolloutPercent = Number(event.target.value);
                    })
                  }
                  className="h-1.5 w-full cursor-pointer accent-[var(--color-accent)]"
                  aria-valuetext={`${draft.rolloutPercent} percent`}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.rolloutPercent}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    updateDraft((d) => {
                      d.rolloutPercent = Math.min(100, Math.max(0, value));
                    });
                  }}
                  className="w-20 shrink-0 text-center"
                  aria-label="Rollout percentage"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Rules */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Targeting rules</h3>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                First match wins and overrides the rollout.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || draft.rules.length >= 20}
              onClick={() =>
                updateDraft((d) => {
                  d.rules.push({ attribute: "", operator: "equals", valuesText: "", serve: true });
                })
              }
            >
              Add rule
            </Button>
          </div>

          {draft.rules.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-[13px] text-text-muted">
              No rules configured.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {draft.rules.map((rule, index) => (
                <li
                  key={index}
                  className="rounded-md border border-border-subtle bg-surface-raised/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={rule.attribute}
                      placeholder="attribute e.g. plan"
                      aria-label={`Rule ${index + 1} attribute`}
                      onChange={(event) =>
                        updateDraft((d) => {
                          d.rules[index].attribute = event.target.value;
                        })
                      }
                      className="w-44 font-mono text-[13px]"
                    />
                    <select
                      value={rule.operator}
                      aria-label={`Rule ${index + 1} operator`}
                      onChange={(event) =>
                        updateDraft((d) => {
                          d.rules[index].operator = event.target.value as TargetingOperator;
                        })
                      }
                      className="h-9.5 cursor-pointer rounded-md border border-border bg-surface px-2 text-[13px] hover:border-border-strong"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    {rule.operator !== "exists" && rule.operator !== "notExists" ? (
                      <Input
                        value={rule.valuesText}
                        placeholder="values, comma-separated"
                        aria-label={`Rule ${index + 1} values`}
                        onChange={(event) =>
                          updateDraft((d) => {
                            d.rules[index].valuesText = event.target.value;
                          })
                        }
                        className="min-w-48 flex-1 font-mono text-[13px]"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((d) => {
                          d.rules[index].serve = !d.rules[index].serve;
                        })
                      }
                      aria-label={`Rule ${index + 1} serves ${rule.serve ? "on" : "off"} — click to change`}
                      className={
                        rule.serve
                          ? "cursor-pointer rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-xs text-success"
                          : "cursor-pointer rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-xs text-text-secondary"
                      }
                    >
                      serve {rule.serve ? "ON" : "OFF"}
                    </button>
                    <span className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Move rule ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() =>
                          updateDraft((d) => {
                            const [moved] = d.rules.splice(index, 1);
                            d.rules.splice(index - 1, 0, moved!);
                          })
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Move rule ${index + 1} down`}
                        disabled={index === draft.rules.length - 1}
                        onClick={() =>
                          updateDraft((d) => {
                            const [moved] = d.rules.splice(index, 1);
                            d.rules.splice(index + 1, 0, moved!);
                          })
                        }
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove rule ${index + 1}`}
                        onClick={() =>
                          updateDraft((d) => {
                            d.rules.splice(index, 1);
                          })
                        }
                        className="text-danger hover:text-danger"
                      >
                        ✕
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty ? (
            <span className="text-xs text-warning">Unsaved changes</span>
          ) : state.error ? null : (
            <span className="text-xs text-success">Saved</span>
          )}
          <Button type="submit" size="sm" disabled={!dirty || pending}>
            {pending ? "Saving…" : `Save ${selectedEnv.name} configuration`}
          </Button>
        </div>
      </form>
    </div>
  );
}

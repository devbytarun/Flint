"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { RolloutBar } from "@/components/ui/rollout-bar";
import type { TargetingOperator } from "@/lib/evaluation";
import { updateFlagConfigAction, type FlagFormState } from "@/server/actions/flags";

export interface EditorEnvironment {
  id: string;
  key: string;
  name: string;
  protected: boolean;
  enabled: boolean;
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
  return normalized.rules.every((rule, index) => {
    const other = b.rules[index];
    return (
      rule.attribute === other.attribute &&
      rule.operator === other.operator &&
      rule.valuesText === other.valuesText &&
      rule.serve === other.serve
    );
  });
}

function moveRule(rules: DraftRule[], from: number, to: number): void {
  const [moved] = rules.splice(from, 1);
  rules.splice(to, 0, moved!);
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
  const saved: EditorInitialConfig = initialConfigs[envId] ?? {
    enabled: false,
    rolloutPercentage: 0,
    rules: [],
  };
  const dirty = draft ? !sameConfig(saved, draft) : false;

  function updateDraft(mutate: (draft: DraftConfig) => void) {
    setDrafts((previous) => {
      const copy = { ...previous[envId], rules: [...previous[envId].rules] };
      mutate(copy);
      return { ...previous, [envId]: copy };
    });
  }

  if (!draft || !selectedEnv) return null;

  const envLabel = `in ${selectedEnv.name}`;

  return (
    <div>
      {/* Environment tabs carry live state so context is never ambiguous */}
      <div className="flex flex-wrap items-center gap-1.5">
        {environments.map((env) => (
          <button
            key={env.id}
            type="button"
            onClick={() => setEnvId(env.id)}
            aria-pressed={env.id === envId}
            className={
              env.id === envId
                ? "flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-3 py-1.5 text-[13px] font-medium"
                : "flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary"
            }
          >
            <span
              aria-hidden="true"
              className={
                env.enabled
                  ? "size-1.5 rounded-full bg-success"
                  : "size-1.5 rounded-full bg-border-strong"
              }
            />
            {env.name}
            {env.protected ? (
              <span className="rounded-full border border-accent/30 bg-accent-muted px-1.5 text-[10px] font-medium capitalize text-accent">
                protected
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <form action={formAction} className="mt-4 space-y-4">
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

        {/* Status */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Status</h3>
              <p className="mt-1 text-[13px] text-text-secondary">
                {draft.enabled
                  ? `Serving ${envLabel}.`
                  : `Disabled — everyone gets OFF ${envLabel}, regardless of rules.`}
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              disabled={pending}
              onToggle={() =>
                setDrafts((previous) => ({
                  ...previous,
                  [envId]: { ...previous[envId], enabled: !previous[envId].enabled },
                }))
              }
              label={`${draft.enabled ? "Disable" : "Enable"} ${flagKey} ${envLabel}`}
            />
          </div>

          {draft.enabled ? (
            <div className="mt-6 border-t border-border-subtle pt-5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`rollout-${envId}`}>Rollout</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.rolloutPercent}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDrafts((previous) => ({
                        ...previous,
                        [envId]: {
                          ...previous[envId],
                          rolloutPercent: Math.min(100, Math.max(0, value)),
                        },
                      }));
                    }}
                    className="w-16 text-center font-mono tabular"
                    aria-label="Rollout percentage"
                  />
                  <span className="font-mono text-[13px] text-text-muted">%</span>
                </div>
              </div>
              <input
                id={`rollout-${envId}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={draft.rolloutPercent}
                onChange={(event) =>
                  setDrafts((previous) => ({
                    ...previous,
                    [envId]: { ...previous[envId], rolloutPercent: Number(event.target.value) },
                  }))
                }
                aria-valuetext={`${draft.rolloutPercent} percent`}
                className="mt-3 h-1.5 w-full cursor-pointer accent-[var(--color-accent)]"
              />
              <RolloutBar percent={draft.rolloutPercent} className="mt-3" />
              <p className="mt-2 text-xs text-text-muted">
                Users without a matching rule are bucketed deterministically — raising this never
                removes anyone already included.
              </p>
            </div>
          ) : null}
        </div>

        {/* Targeting rules */}
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Targeting</h3>
              <p className="mt-1 text-[13px] text-text-secondary">
                First matching rule wins and overrides the rollout.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || draft.rules.length >= 20}
              onClick={() =>
                setDrafts((previous) => ({
                  ...previous,
                  [envId]: {
                    ...previous[envId],
                    rules: [
                      ...previous[envId].rules,
                      { attribute: "", operator: "equals", valuesText: "", serve: true },
                    ],
                  },
                }))
              }
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Rule
            </Button>
          </div>

          {draft.rules.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-[13px] text-text-muted">
              No rules — everyone flows through the rollout percentage.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {draft.rules.map((rule, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-surface-raised/40 p-3"
                >
                  <span
                    className="w-5 shrink-0 text-center font-mono text-xs text-text-muted tabular"
                    title="Evaluation order"
                  >
                    {index + 1}
                  </span>
                  <Input
                    value={rule.attribute}
                    placeholder="attribute · plan"
                    aria-label={`Rule ${index + 1} attribute`}
                    onChange={(event) =>
                      updateDraft((d) => {
                        d.rules[index].attribute = event.target.value;
                      })
                    }
                    className="w-36 font-mono text-[13px]"
                  />
                  <select
                    value={rule.operator}
                    aria-label={`Rule ${index + 1} operator`}
                    onChange={(event) =>
                      updateDraft((d) => {
                        d.rules[index].operator = event.target.value as TargetingOperator;
                      })
                    }
                    className="h-9.5 cursor-pointer rounded-md border border-border bg-surface px-2 text-[13px] transition-colors hover:border-border-strong"
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
                      placeholder="values · pro, enterprise"
                      aria-label={`Rule ${index + 1} values`}
                      onChange={(event) =>
                        updateDraft((d) => {
                          d.rules[index].valuesText = event.target.value;
                        })
                      }
                      className="min-w-44 flex-1 font-mono text-[13px]"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((previous) => ({
                        ...previous,
                        [envId]: {
                          ...previous[envId],
                          rules: previous[envId].rules.map((r, i) =>
                            i === index ? { ...r, serve: !r.serve } : r,
                          ),
                        },
                      }))
                    }
                    aria-label={`Rule ${index + 1} serves ${rule.serve ? "on" : "off"} — click to change`}
                    className={
                      rule.serve
                        ? "cursor-pointer rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-xs text-success"
                        : "cursor-pointer rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 font-mono text-xs text-danger"
                    }
                  >
                    serve {rule.serve ? "ON" : "OFF"}
                  </button>
                  <span className="ml-auto flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move rule ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() =>
                        setDrafts((previous) => {
                          const rules = [...previous[envId].rules];
                          moveRule(rules, index, index - 1);
                          return { ...previous, [envId]: { ...previous[envId], rules } };
                        })
                      }
                      className="px-1.5"
                    >
                      <ArrowUp aria-hidden="true" className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move rule ${index + 1} down`}
                      disabled={index === draft.rules.length - 1}
                      onClick={() =>
                        setDrafts((previous) => {
                          const rules = [...previous[envId].rules];
                          moveRule(rules, index, index + 1);
                          return { ...previous, [envId]: { ...previous[envId], rules } };
                        })
                      }
                      className="px-1.5"
                    >
                      <ArrowDown aria-hidden="true" className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove rule ${index + 1}`}
                      onClick={() =>
                        setDrafts((previous) => ({
                          ...previous,
                          [envId]: {
                            ...previous[envId],
                            rules: previous[envId].rules.filter((_, i) => i !== index),
                          },
                        }))
                      }
                      className="px-1.5 text-danger hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                    </Button>
                  </span>
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
            {pending ? "Saving…" : `Save ${selectedEnv.name.toLowerCase()} configuration`}
          </Button>
        </div>
      </form>
    </div>
  );
}

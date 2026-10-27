import { useEffect, useState, type ReactNode } from "react";
import { useStableCallback } from "../../hooks/useStableCallback";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import type { RuntimeResult } from "./useProjectRuntimeApi";

function RuntimeField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
export function RuntimeText({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <RuntimeField label={label}>
      {multiline ? (
        <Textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
        />
      ) : (
        <Input
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
    </RuntimeField>
  );
}
export function RuntimeSelect<T extends string>({
  label,
  value,
  values,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {values.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
export function RuntimeError({ message }: { message: string | null }) {
  return message ? (
    <Alert variant="error">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}
export function RuntimePager({
  cursor,
  next,
  onChange,
}: {
  cursor: number;
  next: number | null;
  onChange: (cursor: number) => void;
}) {
  return cursor > 0 || next !== null ? (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={cursor === 0} onClick={() => onChange(0)}>
        First page
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={next === null}
        onClick={() => {
          if (next !== null) onChange(next);
        }}
      >
        Next page
      </Button>
    </div>
  ) : null;
}
export function useRuntimeLoad<T>(fetch: () => Promise<RuntimeResult<T>>, ready = true) {
  const [result, setResult] = useState<RuntimeResult<T> | null>(null);
  const load = useStableCallback(fetch);
  // oxlint-disable-next-line t3code/react-effect-budget -- Fetches Runtime data over RPC and ignores the result after unmount or dependency change.
  useEffect(() => {
    if (!ready) return;
    let current = true;
    void load().then((value) => {
      if (current) setResult(value);
    });
    return () => {
      current = false;
    };
  }, [load, ready]);
  const reload = async () => {
    const value = await load();
    setResult(value);
    return value;
  };
  return { result, reload };
}
export function RuntimeLoadError({
  result,
  reload,
}: {
  result: RuntimeResult<unknown> | null;
  reload: () => unknown;
}) {
  return result === null ? (
    <p className="text-sm text-muted-foreground" role="status">
      Loading Runtime…
    </p>
  ) : !result.ok ? (
    <div className="space-y-2">
      <RuntimeError message={result.message} />
      <Button size="sm" variant="outline" onClick={() => void reload()}>
        Reload
      </Button>
    </div>
  ) : null;
}

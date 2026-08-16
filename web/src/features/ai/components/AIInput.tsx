"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export function AIInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const autoGrow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="glass flex items-end gap-2 rounded-2xl p-2">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t("ai.placeholder")}
        aria-label={t("ai.placeholder")}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:outline-none"
      />
      <Button
        onClick={submit}
        disabled={disabled || !value.trim()}
        size="md"
        aria-label={t("ai.send")}
        className="shrink-0"
      >
        {t("ai.send")} →
      </Button>
    </div>
  );
}
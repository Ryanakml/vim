"use client";

import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Markdown } from "./markdown";
import { cn } from "@workspace/ui/lib/utils";

interface SmartEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

export function SmartEditor({
  value,
  onChange,
  placeholder = "Click to edit...",
  className,
  minRows = 10,
}: SmartEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Handle blur to exit edit mode
  const handleBlur = () => {
    setIsEditing(false);
  };

  // Handle clicking on preview to enter edit mode
  const handlePreviewClick = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        minRows={minRows}
        className={cn(
          "w-full px-4 py-3 rounded-lg border border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-background bg-zinc-900/50 text-white font-mono text-sm leading-relaxed resize-none",
          className,
        )}
        style={{
          borderColor: "#2563eb",
          backgroundColor: "rgba(24, 24, 27, 0.5)",
        }}
      />
    );
  }

  return (
    <div
      onClick={handlePreviewClick}
      className={cn(
        "group relative w-full min-h-[200px] rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 cursor-text transition-all hover:border-zinc-700 hover:bg-zinc-900/50",
        className,
      )}
    >
      {/* Empty state */}
      {!value.trim() ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          <p className="text-sm">{placeholder}</p>
        </div>
      ) : (
        /* Markdown preview */
        <div className="text-sm">
          <Markdown content={value} className="prose-sm" />
        </div>
      )}

      {/* Overlay hint on hover */}
      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="text-xs font-medium text-muted-foreground bg-black/40 px-3 py-1 rounded-full">
          Click to edit
        </span>
      </div>
    </div>
  );
}

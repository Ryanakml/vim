"use client";

import { useState, useRef } from "react";
import {
  Upload,
  ImageIcon,
  X,
  Image as LucideImage,
  Loader2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { useWebchatContext } from "@/contexts/webchat-context";
import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";

export default function BotProfilePage() {
  const {
    displayName,
    setDisplayName,
    description,
    setDescription,
    placeholder,
    setPlaceholder,
    avatarUrl,
    setAvatarUrl,
    isLoading,
    error,
    saveProfile,
  } = useWebchatContext();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Handle save button click
  const handleSave = async () => {
    try {
      setSaveError(null);
      setIsSaving(true);
      await saveProfile();
      // Success toast can be added here
    } catch (err) {
      setSaveError(
        err instanceof Error ? err : new Error("Failed to save profile"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* --- ERROR ALERT --- */}
      {(error || saveError) && (
        <div className="rounded-lg bg-red-900/20 border border-red-700 p-4 text-sm text-red-400">
          <p className="font-medium">Error: {(error || saveError)?.message}</p>
        </div>
      )}

      {/* --- LOADING STATE --- */}
      {isLoading && (
        <div className="rounded-lg bg-blue-900/20 border border-blue-700 p-4 text-sm text-blue-400">
          <p className="font-medium">Loading profile...</p>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bot Identity
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Configure your bot's profile information and settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      <div className="mt-20 space-y-8">
        {/* --- SECTION 1: BOT AVATAR (UPDATED) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-border/50 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Bot Avatar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Upload an image to represent your bot in conversations.
            </p>
          </div>

          <div className="col-span-2 flex justify-end">
            <div className="flex flex-col items-center gap-3">
              {/* TRIGGER BUTTON (Kotak Dashed) */}
              <div
                onClick={() => setIsUploadModalOpen(true)}
                className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-500 transition-colors cursor-pointer group"
              >
                {avatarUrl ? (
                  /* Tampilkan Avatar saat ini jika ada */
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                )}
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Recommended size: 256x256px
              </p>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: DISPLAY NAME --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-border/50 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Display Name
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              The name that appears in the chat header and conversations.
            </p>
          </div>
          <div className="col-span-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My bot agent"
              className="max-w-xl bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-11"
            />
          </div>
        </div>

        {/* --- SECTION 3: DESCRIPTION --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-border/50 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Bot Description
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              A brief description of your bot's purpose and capabilities.
            </p>
          </div>
          <div className="col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your bot does"
              className="max-w-xl min-h-[120px] bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600 resize-none p-4"
            />
          </div>
        </div>

        {/* --- SECTION 4: PLACEHOLDER --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Message Placeholder
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Placeholder text shown in the message input field.
            </p>
          </div>
          <div className="col-span-2">
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Type your message..."
              className="max-w-xl bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600 h-11"
            />
          </div>
        </div>
      </div>

      {/* --- MODAL COMPONENT --- */}
      <AvatarUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirm={(newUrl) => {
          setAvatarUrl(newUrl); // Update context
          setIsUploadModalOpen(false);
        }}
        currentAvatar={avatarUrl}
      />
    </div>
  );
}

// --- SUB-COMPONENT: AVATAR UPLOAD MODAL (UI Mirip Screenshot) ---
interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  currentAvatar?: string;
}

function AvatarUploadModal({
  isOpen,
  onClose,
  onConfirm,
  currentAvatar,
}: AvatarUploadModalProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#09090b] border-zinc-800 text-zinc-100 p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold">
            Bot Avatar
          </DialogTitle>
          {/* Close button handled by Dialog default, but we can style if needed */}
        </DialogHeader>

        {/* Body */}
        <div className="p-8">
          <div
            className="border-2 border-dashed border-zinc-700 bg-zinc-900/30 rounded-xl p-8 flex items-center justify-center gap-8 transition-colors hover:bg-zinc-900/50 hover:border-zinc-600"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Left: Preview Box */}
            <div className="h-32 w-32 shrink-0 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden relative">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <LucideImage className="h-10 w-10 text-zinc-600 opacity-50" />
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-zinc-400 text-sm font-medium">
                Drop image file here or
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button
                variant="secondary"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between sm:justify-between w-full">
          <button
            onClick={() => setPreview(null)}
            className="text-sm text-blue-500 hover:text-blue-400 font-medium px-2"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (preview) onConfirm(preview);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

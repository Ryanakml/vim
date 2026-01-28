// components/bot-emulator.tsx
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import Image from "next/image";

export function BotEmulator() {
  return (
    <div className="flex h-full w-80 flex-col border-l bg-muted/10">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Emulator</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Inspector
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-xs">
            Emulator
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed bg-muted/50">
            <Image
              src="/live-chat.png"
              alt="Bot Icon"
              width={32}
              height={32}
              className="text-white"
            />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Test your bot</h4>
            <p className="text-xs text-muted-foreground px-4">
              Start chatting to preview your agent's behavior
            </p>
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <form className="relative">
          <Input placeholder="Type a message..." className="pr-10" />
          <div className="absolute right-2 top-2">
            {/* Send Icon SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground opacity-50"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </form>
      </div>
    </div>
  );
}

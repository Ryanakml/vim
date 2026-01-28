// app/dashboard/webchat/layout.tsx
import { BotWidget } from "@/components/webchat/bot-widget";
import { WebchatProvider } from "@/contexts/webchat-context";

export default function WebchatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebchatProvider>
      <div className="flex h-full w-full overflow-hidden">
        {/* SEKSI KIRI: Konten Form */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10 bg-background">
          <div className="max-w-3xl mx-auto">{children}</div>
        </main>

        {/* SEKSI KANAN: Bot Emulator */}
        {/* HAPUS bg-[#09090b], biarkan BotWidget yang ngatur warnanya sendiri */}
        <aside className="hidden xl:flex w-[700px] border-l h-full relative flex-col">
          <BotWidget />
        </aside>
      </div>
    </WebchatProvider>
  );
}

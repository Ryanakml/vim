export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] w-screen bg-transparent">{children}</div>
  );
}

import { AppSidebar } from "@/components/app-sidebar";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

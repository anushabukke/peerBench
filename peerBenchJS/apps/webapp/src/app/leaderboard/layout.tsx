export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex flex-col gap-3 max-w-6xl py-6 px-4">
      {children}
    </main>
  );
}

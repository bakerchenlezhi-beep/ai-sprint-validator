import { PitchForm } from "@/components/pitch/PitchForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">AI Sprint Validator</h1>
        <p className="text-muted-foreground">
          Pitch your idea and let three synthetic users react to it.
        </p>
      </header>
      <PitchForm />
    </main>
  );
}

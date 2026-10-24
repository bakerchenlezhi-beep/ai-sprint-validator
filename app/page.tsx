import { Logo } from "@/components/brand/Logo";
import { PitchForm } from "@/components/pitch/PitchForm";

const TEASERS = ["Skeptical buyer", "Impatient power user", "Budget-conscious student"];

export default function Home() {
  return (
    <div className="bg-glow flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-12 sm:py-24">
        <header className="flex flex-col items-center gap-4 text-center">
          <Logo className="w-32 sm:w-40" />
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Stress-test your idea before you build it
          </h1>
          <p className="max-w-md text-balance text-muted-foreground">
            Pitch your idea and let three synthetic users react to it.
          </p>
        </header>
        <div className="rounded-2xl bg-card p-6 shadow-(--shadow-raised) ring-1 ring-white/8 sm:p-8">
          <PitchForm />
        </div>
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Who will respond">
          {TEASERS.map((t) => (
            <li key={t} className="rounded-full bg-white/4 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-white/8">
              {t}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

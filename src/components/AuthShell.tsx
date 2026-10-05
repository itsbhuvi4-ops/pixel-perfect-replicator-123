import type { ReactNode } from "react";
import { ArrowUpRight, Crosshair } from "lucide-react";
import { Link } from "@tanstack/react-router";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  alternateLabel: string;
  alternateText: string;
  alternateTo: "/login" | "/player/register";
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  alternateLabel,
  alternateText,
  alternateTo,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mx-auto grid min-h-[min(720px,calc(100vh-7rem))] max-w-6xl overflow-hidden rounded-[2rem] border border-line bg-panel shadow-2xl shadow-black/20 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-gold px-7 py-8 text-arena sm:px-10 sm:py-10 lg:px-12">
          <div className="absolute -right-20 -top-20 size-64 rounded-full border border-arena/15" />
          <div className="absolute -bottom-32 -left-20 size-80 rounded-full border border-arena/10" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-arena/25 bg-arena text-gold">
              <Crosshair aria-hidden="true" className="size-5" />
            </span>
            <span className="font-cond text-sm font-semibold uppercase tracking-[0.2em]">BidX Auction</span>
          </div>

          <div className="relative mt-16 max-w-sm lg:mt-0">
            <p className="label-cond text-xs text-arena/65">{eyebrow}</p>
            <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] tracking-tight sm:text-7xl">{title}</h1>
            <p className="mt-6 max-w-xs text-sm leading-6 text-arena/70">{description}</p>
          </div>

          <div className="relative mt-16 flex items-end justify-between gap-4 border-t border-arena/20 pt-5 text-xs font-medium uppercase tracking-[0.16em] text-arena/60">
            <span>Live auction platform</span>
            <ArrowUpRight aria-hidden="true" className="size-5" />
          </div>
        </section>

        <section className="flex flex-col justify-center bg-arena px-7 py-10 sm:px-12 lg:px-20">
          <div className="mb-10 flex items-center justify-between gap-4">
            <p className="label-cond text-xs text-mut">Secure access</p>
            <p className="text-right text-xs text-mut">
              {alternateLabel}{" "}
              <Link className="font-semibold text-gold underline-offset-4 hover:underline" to={alternateTo}>{alternateText}</Link>
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthSubmit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button disabled={disabled} className="group relative flex h-14 w-full items-center justify-between overflow-hidden rounded-full bg-gold px-6 font-cond text-sm font-semibold uppercase tracking-[0.16em] text-arena transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
      <span>{children}</span>
      <span className="grid size-9 place-items-center rounded-full bg-arena text-gold transition-transform group-hover:rotate-45">
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </span>
    </button>
  );
}

export function AuthField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.12em] text-mut">
      {label}
      <input {...props} className="h-12 rounded-xl border border-line bg-panel2 px-4 text-sm normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-mut/60 focus:border-gold" />
    </label>
  );
}

export function AuthSelect({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.12em] text-mut">
      {label}
      <select {...props} className="h-12 rounded-xl border border-line bg-panel2 px-4 text-sm normal-case tracking-normal text-foreground outline-none transition-colors focus:border-gold">{children}</select>
    </label>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-alert/30 bg-alert/10 px-4 py-3 text-sm text-alert">{children}</p>;
}

export function AuthNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-5 text-gold">{children}</p>;
}

export function AuthFormHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="font-display text-5xl uppercase leading-none tracking-tight">{title}</h2><p className="mt-3 text-sm leading-6 text-mut">{description}</p></div>;
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className="mt-8 border-t border-line pt-5 text-center text-xs text-mut">{children}</div>;
}

export function AuthLink({ to, children }: { to: "/login" | "/player/register"; children: ReactNode }) {
  return <Link to={to} className="font-semibold text-gold underline-offset-4 hover:underline">{children}</Link>;
}

export function AuthGrid({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-col gap-4">{children}</div>;
}

export function AuthTwoCol({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function AuthFileField({ label, onChange, accept }: { label: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; accept: string }) {
  return <label className="flex min-h-24 cursor-pointer flex-col justify-center gap-2 rounded-xl border border-dashed border-line bg-panel2 px-4 text-xs font-medium uppercase tracking-[0.12em] text-mut transition-colors hover:border-gold"><span>{label}</span><input type="file" accept={accept} className="sr-only" onChange={onChange} /><span className="text-xs normal-case tracking-normal text-mut/70">Choose file</span></label>;
}

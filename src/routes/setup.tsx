import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "First Admin Setup — BIDXAUCTION" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupRedirect,
});

function SetupRedirect() {
  useEffect(() => {
    // First-admin creation is intentionally centralized in the server-guarded
    // setup form on /login; never duplicate the privileged setup flow here.
    window.location.replace("/login");
  }, []);

  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <p className="label-cond text-xs text-mut">BIDXAUCTION · SECURE SETUP</p>
        <h1 className="mt-3 font-display text-3xl">Opening first-admin setup…</h1>
        <p className="mt-2 text-sm text-mut">
          You’ll be redirected to the secure login page. The first-admin form appears only when no admin exists.
        </p>
        <a className="mt-5 inline-block underline" href="/login">Continue to login</a>
      </div>
    </main>
  );
}

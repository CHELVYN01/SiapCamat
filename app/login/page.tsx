import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Login — SiapCamat Arsip" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center bg-gradient-to-b from-emerald-50 via-background to-background p-4 dark:from-emerald-950/30">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginForm />
    </main>
  );
}

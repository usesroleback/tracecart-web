"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Logo } from "@/components/common/Logo";
import { DsEyeOffIcon, DsEyeIcon } from "@/icons";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState } from "react";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Identifiants invalides");
      }
      const role = data.user.role as string;
      router.push(role === "SUPER_ADMIN" ? "/orders" : "/deliveries");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <Logo href={null} className="mb-4" />
            <p className="text-sm text-ink-muted">
              Connectez-vous à votre espace pour continuer.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Adresse e-mail <span className="text-critical">*</span>
                </Label>
                <Input name="email" type="email" placeholder="vous@tracecart.co" />
              </div>
              <div>
                <Label>
                  Mot de passe <span className="text-critical">*</span>
                </Label>
                <div className="relative">
                  <Input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-ink-muted"
                  >
                    {showPassword ? <DsEyeIcon /> : <DsEyeOffIcon />}
                  </span>
                </div>
              </div>
              {error && <p className="rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>}
              <div>
                <Button className="w-full" size="m" disabled={loading} loading={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

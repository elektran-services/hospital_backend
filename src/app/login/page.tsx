"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Playfair_Display, Space_Grotesk } from "next/font/google";

import { useAuth } from "@/hooks/useAuth";
import "./login.css";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const serif = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"] });
const sans = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      await login(data.email, data.password);
      reset();
      router.push("/dashboard");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      setGeneralError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-page ${sans.className}`}>
      <div className="login-aurora" aria-hidden="true" />

      <div className="login-shell">
        <section className="login-hero">
          <span className="login-pill">Multi-tenant control · Secure</span>
          <h1 className={`${serif.className} login-title`}>
            Coordinate telemedicine coverage across every hospital branch
          </h1>
          <p className="login-subtitle">
            Launch remote consults, route specialists, and monitor signal health from one command
            center so virtual care stays compliant, encrypted, and always-on.
          </p>
        </section>

        <section className="login-panel">
          <div className="login-panel-header">
            <div>
              <p className="login-panel-label">Super admin access</p>
              <h2 className={`${serif.className} login-panel-title`}>MediCare Network</h2>
            </div>
            <span className="login-panel-status">SLA 99.4%</span>
          </div>

          {generalError && (
            <div className="login-alert" role="alert">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <div className="login-input-wrap">
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@hospital.com"
                  className="login-input"
                />
              </div>
              {errors.email && <p className="login-error">{errors.email.message}</p>}
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <input
                  {...register("password")}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="login-input"
                />
              </div>
              {errors.password && <p className="login-error">{errors.password.message}</p>}
            </div>

            <div className="login-quick-actions">
              <label className="login-remember">
                <input
                  {...register("rememberMe")}
                  type="checkbox"
                  className="login-checkbox"
                />
                Remember this device
              </label>
              <a className="login-link" href="#">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-primary-button"
            >
              {isLoading ? "Securing session…" : "Launch command deck"}
            </button>
          </form>

          <p className="login-footer">© 2026 MediCare · Multi-tenant Hospital SaaS</p>
        </section>
      </div>
    </div>
  );
}

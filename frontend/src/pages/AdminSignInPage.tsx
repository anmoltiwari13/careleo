import { FormEvent, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { api, setAuthToken } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade } from "../components/Motion";

interface JwtPayload {
  role?: string;
}

function parseJwt(token: string): JwtPayload {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return {};
  }
}

export function AdminSignInPage({ onLogin }: { onLogin: (token: string) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("tiwarianmol2003@gmail.com");
  const [password, setPassword] = useState("anmol123");
  const [loginCode, setLoginCode] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
        login_code: loginCode || undefined
      });

      const token: string = data.access_token;
      const payload = parseJwt(token);
      if (payload.role !== "careleo_admin") {
        throw new Error("Only Careleo Admin can access this portal.");
      }

      localStorage.setItem("careleo_admin_token", token);
      setAuthToken(token);
      onLogin(token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setAuthToken(undefined);
      localStorage.removeItem("careleo_admin_token");
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("Cannot reach backend API. Make sure backend is running on port 8000.");
        } else {
          setError(String(err.response.data?.detail ?? "Sign in failed."));
        }
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed. Check credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFade className="mx-auto flex min-h-[calc(100vh-90px)] max-w-4xl items-center px-6 pb-14">
      <GlassCard className="w-full snap-section">
        <MotionText as="h1" text="Careleo Admin Sign In" className="font-display text-4xl font-extrabold" />
        <p className="mt-2 text-slate-600 dark:text-slate-300">Sign in to manage hospitals, branding, domains, and tenant onboarding.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent p-3"
            placeholder="Admin Email"
            type="email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent p-3"
            placeholder="Password"
            type="password"
            required
          />
          <input
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-transparent p-3"
            placeholder="Login Code"
          />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </GlassCard>
    </PageFade>
  );
}

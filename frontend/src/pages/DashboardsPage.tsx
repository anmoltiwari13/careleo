import { useState } from "react";
import { api, setAuthToken } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade } from "../components/Motion";

const roles = [
  { label: "Careleo Admin", path: "/dashboards/careleo-admin" },
  { label: "Hospital Admin", path: "/dashboards/hospital-admin" },
  { label: "Doctor", path: "/dashboards/doctor" },
  { label: "Patient", path: "/dashboards/patient" }
];

export function DashboardsPage() {
  const [email, setEmail] = useState("tiwarianmol2003@gmail.com");
  const [password, setPassword] = useState("anmol123");
  const [loginCode, setLoginCode] = useState("1234");
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);

  async function login() {
    const { data } = await api.post("/auth/login", { email, password, login_code: loginCode || undefined });
    setAuthToken(data.access_token);
  }

  async function load(path: string) {
    const { data } = await api.get(path);
    setMetrics(data);
  }

  return (
    <PageFade className="mx-auto grid max-w-6xl gap-6 px-6 pb-14 lg:grid-cols-2">
      <GlassCard className="snap-section">
        <MotionText as="h2" text="Tenant Login" className="font-display text-2xl font-bold" />
        <div className="mt-4 space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Password" type="password" />
          <input value={loginCode} onChange={(e) => setLoginCode(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Login Code (optional)" />
          <button onClick={login} className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-white">Authenticate</button>
        </div>
      </GlassCard>
      <GlassCard className="snap-section">
        <MotionText as="h2" text="Role Dashboards" className="font-display text-2xl font-bold" />
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <button key={role.path} onClick={() => load(role.path)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {role.label}
            </button>
          ))}
        </div>
        <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-sm text-emerald-300">{JSON.stringify(metrics, null, 2)}</pre>
      </GlassCard>
    </PageFade>
  );
}

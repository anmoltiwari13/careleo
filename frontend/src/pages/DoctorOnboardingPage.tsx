import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, setAuthToken } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { MotionText, PageFade } from "../components/Motion";

interface Appointment {
  id: number;
  patient_name: string;
  patient_email: string;
  time: string;
  status: string;
  notes?: string;
}

function parseRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(decoded) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function DoctorOnboardingPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("anmol123");
  const [loginCode, setLoginCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [doctorToken, setDoctorToken] = useState<string | null>(null);

  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState("#0ea5e9,#22d3ee");
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  async function loadDoctorData() {
    const [profileRes, appointmentsRes] = await Promise.all([api.get("/doctor-tenant/me"), api.get("/doctor-tenant/appointments")]);
    const profile = profileRes.data;
    setDoctorId(profile?.doctor?.id ?? null);
    setSpecialization(profile?.doctor?.specialization ?? "");
    setBio(profile?.doctor?.bio ?? "");
    setAvailability(profile?.doctor?.availability ?? "");
    setLogo(profile?.branding?.logo ?? "");
    setDescription(profile?.branding?.description ?? "");
    setColors(profile?.branding?.colors ?? "#0ea5e9,#22d3ee");
    setAppointments(appointmentsRes.data ?? []);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
        login_code: loginCode || undefined
      });
      const token = data.access_token as string;
      if (parseRole(token) !== "doctor") {
        setAuthError("This page is only for doctor accounts.");
        return;
      }
      setDoctorToken(token);
      setAuthToken(token);
      localStorage.setItem("careleo_doctor_token", token);
      await loadDoctorData();
    } catch (error: any) {
      setAuthError(String(error?.response?.data?.detail ?? "Doctor sign in failed"));
    }
  }

  async function saveProfile() {
    setSaveStatus("Saving clinic homepage content...");
    try {
      await api.patch("/doctor-tenant/me", {
        specialization,
        bio,
        availability,
        logo,
        description,
        colors
      });
      setSaveStatus("Saved. Your clinic homepage is updated.");
      await loadDoctorData();
    } catch (error: any) {
      setSaveStatus(String(error?.response?.data?.detail ?? "Failed to save."));
    }
  }

  async function decideAppointment(id: number, status: "approved" | "rejected") {
    await api.patch(`/doctor-tenant/appointments/${id}`, { status });
    await loadDoctorData();
  }

  useEffect(() => {
    const qEmail = search.get("email");
    const qCode = search.get("code");
    const stored = localStorage.getItem("careleo_doctor_token");
    if (qEmail) {
      setEmail(qEmail);
    }
    if (qCode) {
      setLoginCode(qCode);
    }
    if (stored) {
      setDoctorToken(stored);
      setAuthToken(stored);
      void loadDoctorData();
    }
  }, []);

  return (
    <PageFade className="mx-auto grid max-w-6xl gap-6 px-6 pb-14 lg:grid-cols-2">
      {!doctorToken ? (
        <GlassCard className="snap-section lg:col-span-2">
          <MotionText as="h1" text="Doctor Tenant Onboarding" className="font-display text-3xl font-bold" />
          <p className="mt-2 text-slate-600 dark:text-slate-300">Sign in as doctor to setup clinic logo, bio, homepage content, and appointment approvals.</p>
          <form onSubmit={login} className="mt-4 grid gap-3 md:grid-cols-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Doctor Email" type="email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Password" type="password" />
            <input value={loginCode} onChange={(e) => setLoginCode(e.target.value)} className="rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Login Code" />
            <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-white md:col-span-3">Enter Doctor Workspace</button>
          </form>
          {authError ? <p className="mt-2 text-sm font-semibold text-rose-600">{authError}</p> : null}
        </GlassCard>
      ) : null}

      {doctorToken ? (
        <>
          <GlassCard className="snap-section">
            <MotionText as="h2" text="Clinic Homepage Builder" className="font-display text-2xl font-bold" />
            <div className="mt-4 space-y-3">
              <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Specialization" />
              <input value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Availability" />
              <input value={logo} onChange={(e) => setLogo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Clinic Logo URL" />
              <input value={colors} onChange={(e) => setColors(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Theme Colors (comma separated)" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Doctor Bio" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Clinic Description" />
              <div className="flex gap-3">
                <button onClick={saveProfile} className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-white">Save Homepage</button>
                <button
                  onClick={() => {
                    if (doctorId) {
                      navigate(`/clinic/${doctorId}`);
                    }
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-bold dark:border-slate-700"
                >
                  Preview Public Page
                </button>
              </div>
              {saveStatus ? <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{saveStatus}</p> : null}
            </div>
          </GlassCard>

          <GlassCard className="snap-section">
            <MotionText as="h2" text="Appointment Requests" className="font-display text-2xl font-bold" />
            <div className="mt-4 space-y-3">
              {appointments.length === 0 ? <p className="text-sm text-slate-500">No appointment requests yet.</p> : null}
              {appointments.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-300 p-3 dark:border-slate-700">
                  <p className="font-semibold">{item.patient_name} ({item.patient_email})</p>
                  <p className="text-sm text-slate-500">Time: {new Date(item.time).toLocaleString()}</p>
                  <p className="text-sm">Status: {item.status}</p>
                  {item.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => decideAppointment(item.id, "approved")} className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-white">Approve</button>
                      <button onClick={() => decideAppointment(item.id, "rejected")} className="rounded-lg bg-rose-500 px-3 py-1 text-sm font-bold text-white">Reject</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      ) : null}
    </PageFade>
  );
}

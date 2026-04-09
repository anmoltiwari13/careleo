import { CSSProperties, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { GlassCard } from "../components/GlassCard";
import { InteractiveLogoutButton } from "../components/InteractiveLogoutButton";
import { MotionText, PageFade } from "../components/Motion";

interface Hospital {
  id: number;
  name: string;
  domain?: string | null;
}

interface AdminDoctor {
  doctor_id: number;
  hospital_id: number;
  hospital_name: string;
  doctor_email?: string | null;
  specialization: string;
  availability?: string | null;
}

interface PrivateDoctorTenant {
  hospital_id: number;
  doctor_id: number;
  doctor_email: string;
  doctor_login_code: string;
  doctor_password: string;
  domain?: string | null;
  public_url: string;
  setup_url: string;
}

interface AdminMetrics {
  hospitals: number;
  private_clinics: number;
  doctors: { hospital: number; private_clinic: number; total: number };
  patients: { hospital: number; private_clinic: number; total: number };
  appointments: { pending: number; approved: number; rejected: number; total: number };
}

interface AdminPatient {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  doctor_id: number;
  hospital_name: string;
  tenant_type: "hospital" | "private_clinic";
}

export function AdminDashboardPage({ onLogout }: { onLogout: () => void }) {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [hospitalLogo, setHospitalLogo] = useState("");
  const [hospitalDescription, setHospitalDescription] = useState("");
  const [hospitalColors, setHospitalColors] = useState("#0ea5e9,#22d3ee");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [status, setStatus] = useState("");

  const [clinicName, setClinicName] = useState("");
  const [clinicDomain, setClinicDomain] = useState("");
  const [clinicLogo, setClinicLogo] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");
  const [clinicDescription, setClinicDescription] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("anmol123");
  const [privateStatus, setPrivateStatus] = useState("");
  const [privateTenant, setPrivateTenant] = useState<PrivateDoctorTenant | null>(null);
  const [hospitalSearchInput, setHospitalSearchInput] = useState("");
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState("");
  const [doctorSearchInput, setDoctorSearchInput] = useState("");
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");

  const filteredHospitals = useMemo(() => {
    const query = hospitalSearchQuery.trim().toLowerCase();
    if (!query) {
      return hospitals;
    }
    return hospitals.filter((hospital) => {
      return (
        String(hospital.id).includes(query) ||
        hospital.name.toLowerCase().includes(query) ||
        (hospital.domain || "").toLowerCase().includes(query)
      );
    });
  }, [hospitalSearchQuery, hospitals]);

  const filteredDoctors = useMemo(() => {
    const query = doctorSearchQuery.trim().toLowerCase();
    if (!query) {
      return doctors;
    }
    return doctors.filter((doctor) => {
      return (
        String(doctor.doctor_id).includes(query) ||
        (doctor.doctor_email || "").toLowerCase().includes(query) ||
        doctor.hospital_name.toLowerCase().includes(query) ||
        doctor.specialization.toLowerCase().includes(query)
      );
    });
  }, [doctorSearchQuery, doctors]);

  async function loadAdminData() {
    try {
      const [metricsRes, hospitalsRes, doctorsRes, patientsRes] = await Promise.all([
        api.get("/dashboards/careleo-admin"),
        api.get("/admin/hospitals"),
        api.get("/admin/doctors"),
        api.get("/admin/patients")
      ]);
      setMetrics(metricsRes.data);
      setHospitals(hospitalsRes.data ?? []);
      setDoctors(doctorsRes.data ?? []);
      setPatients(patientsRes.data ?? []);
    } catch {
      onLogout();
    }
  }

  async function createHospital() {
    if (!name.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      setStatus("Hospital name, owner name, owner email, and owner password are required.");
      return;
    }

    setStatus("Creating hospital...");
    try {
      await api.post("/admin/hospitals", {
        name,
        domain: domain || undefined,
        logo: hospitalLogo || undefined,
        description: hospitalDescription || undefined,
        colors: hospitalColors || undefined,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_password: ownerPassword
      });
      setName("");
      setDomain("");
      setHospitalLogo("");
      setHospitalDescription("");
      setHospitalColors("#0ea5e9,#22d3ee");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setStatus("Hospital created successfully.");
      await loadAdminData();
    } catch (error: any) {
      setStatus(String(error?.response?.data?.detail ?? "Failed to create hospital."));
    }
  }

  async function createPrivateDoctorTenant() {
    if (!clinicName.trim() || !doctorName.trim() || !doctorEmail.trim() || !specialization.trim() || !doctorPassword.trim()) {
      setPrivateStatus("Clinic name, doctor name, doctor email, specialization, and doctor password are required.");
      return;
    }

    setPrivateStatus("Creating private clinic tenant...");
    setPrivateTenant(null);
    try {
      const { data } = await api.post<PrivateDoctorTenant>("/admin/private-clinic-doctors", {
        clinic_name: clinicName,
        doctor_name: doctorName,
        doctor_email: doctorEmail,
        specialization,
        domain: clinicDomain || undefined,
        clinic_logo: clinicLogo || undefined,
        bio: bio || undefined,
        availability: availability || undefined,
        clinic_description: clinicDescription || undefined,
        doctor_password: doctorPassword || undefined
      });

      setPrivateTenant(data);
      setPrivateStatus("Private clinic doctor tenant created. Redirecting to doctor onboarding...");
      setClinicName("");
      setClinicDomain("");
      setClinicLogo("");
      setDoctorName("");
      setDoctorEmail("");
      setSpecialization("");
      setBio("");
      setAvailability("");
      setClinicDescription("");
      setDoctorPassword("anmol123");
      await loadAdminData();

      window.open(data.setup_url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      const message = error?.response?.data?.detail ?? "Failed to create private clinic doctor tenant.";
      setPrivateStatus(String(message));
    }
  }

  function openHospitalWebsite(hospital: Hospital) {
    const clinicDoctors = doctors
      .filter((doctor) => doctor.hospital_id === hospital.id)
      .sort((left, right) => left.doctor_id - right.doctor_id);

    if (clinicDoctors.length > 0) {
      window.open(`/clinic/${clinicDoctors[0].doctor_id}`, "_blank");
      return;
    }

    if (hospital.domain) {
      const domainUrl = hospital.domain.startsWith("http://") || hospital.domain.startsWith("https://") ? hospital.domain : `https://${hospital.domain}`;
      window.open(domainUrl, "_blank");
      return;
    }
    window.open(`/hospital-preview/${hospital.id}`, "_blank");
  }

  function openDoctorClinic(doctor: AdminDoctor) {
    window.open(`/clinic/${doctor.doctor_id}`, "_blank");
  }

  async function deleteHospital(hospital: Hospital) {
    if (!window.confirm(`Delete hospital ${hospital.name}? This permanently removes doctors, patients, and appointments under it.`)) {
      return;
    }
    await api.delete(`/admin/hospitals/${hospital.id}`);
    await loadAdminData();
  }

  async function deleteDoctor(doctor: AdminDoctor) {
    if (!window.confirm(`Delete doctor ${doctor.doctor_email || doctor.doctor_id}? This permanently removes appointments and linked data.`)) {
      return;
    }
    await api.delete(`/admin/doctors/${doctor.doctor_id}`);
    await loadAdminData();
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  return (
    <PageFade className="grid min-h-screen w-full gap-6 px-4 pb-14 pt-4 sm:px-6 lg:grid-cols-2 lg:px-8 xl:px-10 2xl:px-14">
      <GlassCard className="snap-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <MotionText as="h2" text="Careleo Admin Dashboard" className="font-display text-2xl font-bold" />
          <InteractiveLogoutButton
            onClick={onLogout}
            className="w-full sm:w-auto"
            style={{
              "--logout-bg": "#0f172a",
              "--logout-text": "#f8fbff",
              "--logout-door": "#38bdf8",
              "--logout-figure": "#fbbf24",
              "--logout-shadow": "rgba(15, 23, 42, 0.24)"
            } as CSSProperties}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-300/50 p-3 dark:border-slate-700/70">
            <p className="text-xs text-slate-500">Hospitals</p>
            <p className="text-2xl font-extrabold">{metrics?.hospitals ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-300/50 p-3 dark:border-slate-700/70">
            <p className="text-xs text-slate-500">Private Clinics</p>
            <p className="text-2xl font-extrabold">{metrics?.private_clinics ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-300/50 p-3 dark:border-slate-700/70">
            <p className="text-xs text-slate-500">Doctors (Hospital / Private)</p>
            <p className="text-2xl font-extrabold">{metrics?.doctors.total ?? 0}</p>
            <p className="text-xs text-slate-500">{metrics?.doctors.hospital ?? 0} / {metrics?.doctors.private_clinic ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-300/50 p-3 dark:border-slate-700/70">
            <p className="text-xs text-slate-500">Patients (Hospital / Private)</p>
            <p className="text-2xl font-extrabold">{metrics?.patients.total ?? 0}</p>
            <p className="text-xs text-slate-500">{metrics?.patients.hospital ?? 0} / {metrics?.patients.private_clinic ?? 0}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-300/50 p-3 text-sm dark:border-slate-700/70">
          <p className="font-semibold">Appointments: {metrics?.appointments.total ?? 0}</p>
          <p className="text-slate-500">Pending: {metrics?.appointments.pending ?? 0} | Approved: {metrics?.appointments.approved ?? 0} | Rejected: {metrics?.appointments.rejected ?? 0}</p>
        </div>
      </GlassCard>

      <GlassCard className="snap-section">
        <MotionText as="h3" text="Hospital" className="font-display text-xl font-bold" />
        <div className="mt-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Hospital Name" />
          <input value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Domain (optional)" />
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Hospital Owner/Admin Name" />
          <input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Hospital Owner/Admin Email" type="email" />
          <input value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Hospital Owner/Admin Password" type="password" />
          <input value={hospitalLogo} onChange={(e) => setHospitalLogo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Logo URL" />
          <input value={hospitalColors} onChange={(e) => setHospitalColors(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Theme Colors (comma separated)" />
          <textarea value={hospitalDescription} onChange={(e) => setHospitalDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Homepage Description" />
          <button onClick={createHospital} className="rounded-lg bg-sky-500 px-4 py-2 font-bold text-white">Create</button>
          {status ? <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{status}</p> : null}
        </div>
      </GlassCard>

      <GlassCard className="snap-section lg:col-span-2">
        <MotionText as="h3" text="Private Clinic" className="font-display text-xl font-bold" />
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Doctor gets independent tenant website, branding setup, and appointment management.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Clinic Name" />
          <input value={clinicDomain} onChange={(e) => setClinicDomain(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Clinic Domain (optional)" />
          <input value={clinicLogo} onChange={(e) => setClinicLogo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Clinic Logo URL" />
          <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Doctor Name" />
          <input value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Doctor Email" type="email" />
          <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Specialization" />
          <input value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Availability (optional)" />
          <input value={doctorPassword} onChange={(e) => setDoctorPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3" placeholder="Doctor Password" type="password" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3 md:col-span-2" placeholder="Doctor Bio (optional)" />
          <textarea value={clinicDescription} onChange={(e) => setClinicDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3 md:col-span-2" placeholder="Clinic Description" />
        </div>
        <button onClick={createPrivateDoctorTenant} className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 font-bold text-white">Create Private Clinic Tenant</button>
        {privateStatus ? <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{privateStatus}</p> : null}

        {privateTenant ? (
          <div className="mt-4 rounded-lg border border-cyan-300/40 bg-cyan-500/10 p-4 text-sm">
            <p>Hospital ID: {privateTenant.hospital_id}</p>
            <p>Doctor ID: {privateTenant.doctor_id}</p>
            <p>Doctor Email: {privateTenant.doctor_email}</p>
            <p>Doctor Login Code: {privateTenant.doctor_login_code}</p>
            <p>Doctor Password: {privateTenant.doctor_password}</p>
            <p>Public URL: {privateTenant.public_url}</p>
            <p>Setup URL: {privateTenant.setup_url}</p>
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="snap-section lg:col-span-2">
        <MotionText as="h3" text="Hospitals" className="font-display text-xl font-bold" />
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={hospitalSearchInput}
            onChange={(e) => setHospitalSearchInput(e.target.value)}
            className="w-full flex-1 rounded-lg border border-slate-300 bg-transparent p-2.5 text-sm sm:min-w-[240px]"
            placeholder="Search hospital by name/domain/id"
          />
          <button
            onClick={() => setHospitalSearchQuery(hospitalSearchInput)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Search
          </button>
          <button
            onClick={() => {
              setHospitalSearchInput("");
              setHospitalSearchQuery("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
          >
            Clear
          </button>
        </div>
        <div className="-mx-2 mt-4 overflow-x-auto px-2">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300/50 dark:border-slate-700/70">
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Domain</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHospitals.map((hospital) => (
                <tr key={hospital.id} className="border-b border-slate-200/50 dark:border-slate-800/60">
                  <td className="px-2 py-2">{hospital.id}</td>
                  <td className="px-2 py-2">{hospital.name}</td>
                  <td className="px-2 py-2">{hospital.domain || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openHospitalWebsite(hospital)} className="rounded-lg bg-indigo-500 px-3 py-1 text-xs font-bold text-white">Open Website</button>
                      <button onClick={() => void deleteHospital(hospital)} className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-bold text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="snap-section lg:col-span-2">
        <MotionText as="h3" text="Doctors" className="font-display text-xl font-bold" />
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={doctorSearchInput}
            onChange={(e) => setDoctorSearchInput(e.target.value)}
            className="w-full flex-1 rounded-lg border border-slate-300 bg-transparent p-2.5 text-sm sm:min-w-[240px]"
            placeholder="Search doctor by id/email/hospital/specialization"
          />
          <button
            onClick={() => setDoctorSearchQuery(doctorSearchInput)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Search
          </button>
          <button
            onClick={() => {
              setDoctorSearchInput("");
              setDoctorSearchQuery("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
          >
            Clear
          </button>
        </div>
        <div className="-mx-2 mt-4 overflow-x-auto px-2">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300/50 dark:border-slate-700/70">
                <th className="px-2 py-2">Doctor ID</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Hospital</th>
                <th className="px-2 py-2">Specialization</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.doctor_id} className="border-b border-slate-200/50 dark:border-slate-800/60">
                  <td className="px-2 py-2">{doctor.doctor_id}</td>
                  <td className="px-2 py-2">{doctor.doctor_email || "-"}</td>
                  <td className="px-2 py-2">{doctor.hospital_name}</td>
                  <td className="px-2 py-2">{doctor.specialization}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openDoctorClinic(doctor)} className="rounded-lg bg-indigo-500 px-3 py-1 text-xs font-bold text-white">Open Clinic</button>
                      <button onClick={() => void deleteDoctor(doctor)} className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-bold text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="snap-section lg:col-span-2">
        <MotionText as="h3" text="Patients" className="font-display text-xl font-bold" />
        <div className="-mx-2 mt-4 overflow-x-auto px-2">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300/50 dark:border-slate-700/70">
                <th className="px-2 py-2">Patient ID</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Phone</th>
                <th className="px-2 py-2">Doctor</th>
                <th className="px-2 py-2">Tenant</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-200/50 dark:border-slate-800/60">
                  <td className="px-2 py-2">{patient.id}</td>
                  <td className="px-2 py-2">{patient.full_name}</td>
                  <td className="px-2 py-2">{patient.email}</td>
                  <td className="px-2 py-2">{patient.phone || "-"}</td>
                  <td className="px-2 py-2">#{patient.doctor_id}</td>
                  <td className="px-2 py-2">{patient.tenant_type === "private_clinic" ? "Private Clinic" : "Hospital"} - {patient.hospital_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </PageFade>
  );
}

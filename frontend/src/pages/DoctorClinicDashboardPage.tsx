import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, CalendarClock, CheckCircle2, ClipboardPenLine, Leaf, Moon, Pill, Search, Stethoscope, Sun, UserRound, Users, XCircle } from "lucide-react";
import { api } from "../api/client";
import { InteractiveLogoutButton } from "../components/InteractiveLogoutButton";
import { MotionText, PageFade } from "../components/Motion";

interface DoctorAppointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  time: string;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
  medical_files?: string[] | null;
  created_at?: string;
}

interface SparklineMetric {
  label: string;
  value: string;
  trend: number[];
}

interface DoctorPatientRecord {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  local_address?: string | null;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  appointment_history?: Array<{
    id: number;
    time?: string | null;
    status: "pending" | "approved" | "rejected";
    notes?: string | null;
    medical_files?: string[] | null;
    created_at?: string | null;
  }>;
  prescriptions?: Array<{
    id: number;
    appointment_id: number;
    diagnosis: string;
    drug_names: string[];
    instructions?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string | null;
  }>;
  inventory?: {
    id: number;
    doctor_id: number;
    patient_id: number;
    religion?: string | null;
    diagnosis?: string | null;
    investigation?: string | null;
    investigation_date?: string | null;
    finding?: string | null;
    finding_date?: string | null;
    prescription?: string | null;
    special_instruction?: string | null;
    family_history?: string | null;
    past_medication_history?: string | null;
    surgical_history?: string | null;
    presenting_complaints?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
}

interface PrescriptionDraft {
  appointmentId: number | null;
  diagnosis: string;
  drugNames: string;
  instructions: string;
  startDate: string;
  endDate: string;
}

interface PatientInventoryDraft {
  religion: string;
  diagnosis: string;
  investigation: string;
  investigationDate: string;
  finding: string;
  findingDate: string;
  prescription: string;
  specialInstruction: string;
  familyHistory: string;
  pastMedicationHistory: string;
  surgicalHistory: string;
  presentingComplaints: string;
}

interface NewPatientDraft extends PatientInventoryDraft {
  fullName: string;
  email: string;
  phone: string;
  age: string;
  localAddress: string;
  pincode: string;
  city: string;
  state: string;
  gender: string;
  dateOfBirth: string;
}

interface DoctorProfile {
  doctor?: {
    id: number;
    specialization?: string;
    availability?: string;
  };
  branding?: {
    logo?: string | null;
    colors?: string | null;
  };
}

type DashboardSection = "overview" | "patient-records" | "appointments" | "observations";

function parseBrandColors(colors?: string | null): [string, string] {
  if (!colors) {
    return ["#4f6f52", "#0f4c5c"];
  }
  const parts = colors.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) {
    return ["#4f6f52", "#0f4c5c"];
  }
  if (parts.length === 1) {
    return [parts[0], "#0f4c5c"];
  }
  return [parts[0], parts[1]];
}

function parseToken(token: string | null): { role: string | null; doctorId: number | null } {
  if (!token) {
    return { role: null, doctorId: null };
  }
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(decoded) as { role?: string; doctor_id?: number };
    return { role: parsed.role ?? null, doctorId: parsed.doctor_id ?? null };
  } catch {
    return { role: null, doctorId: null };
  }
}

function buildInventoryDraft(patient: DoctorPatientRecord): PatientInventoryDraft {
  return {
    religion: patient.inventory?.religion || "",
    diagnosis: patient.inventory?.diagnosis || "",
    investigation: patient.inventory?.investigation || "",
    investigationDate: patient.inventory?.investigation_date || "",
    finding: patient.inventory?.finding || "",
    findingDate: patient.inventory?.finding_date || "",
    prescription: patient.inventory?.prescription || "",
    specialInstruction: patient.inventory?.special_instruction || "",
    familyHistory: patient.inventory?.family_history || "",
    pastMedicationHistory: patient.inventory?.past_medication_history || "",
    surgicalHistory: patient.inventory?.surgical_history || "",
    presentingComplaints: patient.inventory?.presenting_complaints || "",
  };
}

function createEmptyInventoryDraft(): PatientInventoryDraft {
  return {
    religion: "",
    diagnosis: "",
    investigation: "",
    investigationDate: "",
    finding: "",
    findingDate: "",
    prescription: "",
    specialInstruction: "",
    familyHistory: "",
    pastMedicationHistory: "",
    surgicalHistory: "",
    presentingComplaints: "",
  };
}

function createEmptyNewPatientDraft(): NewPatientDraft {
  return {
    fullName: "",
    email: "",
    phone: "",
    age: "",
    localAddress: "",
    pincode: "",
    city: "",
    state: "",
    gender: "",
    dateOfBirth: "",
    ...createEmptyInventoryDraft(),
  };
}

function calculateAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) {
    return "-";
  }
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return "-";
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "-";
}

function buildPatientMetrics(patient: DoctorPatientRecord): SparklineMetric[] {
  const age = Number(calculateAge(patient.date_of_birth));
  const basePulse = Number.isFinite(age) ? Math.max(66, 82 - Math.min(age, 30) / 3) : 74;
  return [
    { label: "Pulse", value: `${Math.round(basePulse)} bpm`, trend: [72, 74, 73, 75, 74, Math.round(basePulse)] },
    { label: "BP", value: "122/78", trend: [58, 61, 60, 62, 63, 64] },
    { label: "Oxygen", value: "98%", trend: [94, 95, 96, 97, 97, 98] },
  ];
}

function buildSparklinePath(points: number[], width = 140, height = 36): string {
  if (points.length === 0) {
    return "";
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function DoctorClinicDashboardPage() {
  const { id } = useParams();
  const clinicToken = localStorage.getItem("careleo_clinic_token");
  const adminToken = localStorage.getItem("careleo_admin_token");
  const clinicAuth = parseToken(clinicToken);
  const adminAuth = parseToken(adminToken);
  const routeDoctorId = Number(id);
  const hasClinicSession = Boolean(clinicAuth.role);
  const role = clinicAuth.role === "doctor" ? clinicAuth.role : !hasClinicSession ? adminAuth.role : null;
  const authToken = clinicAuth.role === "doctor" ? clinicToken : !hasClinicSession ? adminToken : null;
  const doctorId = clinicAuth.role === "doctor" ? clinicAuth.doctorId : !hasClinicSession ? routeDoctorId : null;
  const effectiveDoctorId = clinicAuth.role === "doctor" ? clinicAuth.doctorId ?? routeDoctorId : routeDoctorId;
  const isDoctor = role === "doctor";
  const isAdmin = role === "careleo_admin";

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("Doctor Dashboard");
  const [logo, setLogo] = useState("");
  const [brandColors, setBrandColors] = useState<[string, string]>(["#4f6f52", "#0f4c5c"]);
  const [doctorAppointments, setDoctorAppointments] = useState<DoctorAppointment[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<DoctorPatientRecord[]>([]);
  const [doctorDashboardStatus, setDoctorDashboardStatus] = useState("");
  const [prescriptionDraft, setPrescriptionDraft] = useState<PrescriptionDraft>({
    appointmentId: null,
    diagnosis: "",
    drugNames: "",
    instructions: "",
    startDate: "",
    endDate: ""
  });
  const [prescriptionStatus, setPrescriptionStatus] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [patientSearchInput, setPatientSearchInput] = useState("");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [createdDateFilter, setCreatedDateFilter] = useState("all");
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem("careleo_doctor_site_theme") === "dark");
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<number, PatientInventoryDraft>>({});
  const [inventoryStatus, setInventoryStatus] = useState<Record<number, string>>({});
  const [newPatientDraft, setNewPatientDraft] = useState<NewPatientDraft>(createEmptyNewPatientDraft());
  const [newPatientStatus, setNewPatientStatus] = useState("");
  const [newPatientPincodeStatus, setNewPatientPincodeStatus] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [doctorObservations, setDoctorObservations] = useState("");
  const [showAllSidebarAppointments, setShowAllSidebarAppointments] = useState(false);
  const [showAllPatientDirectory, setShowAllPatientDirectory] = useState(false);
  const [showAllAppointmentGroups, setShowAllAppointmentGroups] = useState(false);
  const [showAllPatientHistory, setShowAllPatientHistory] = useState(false);
  const [patientPendingDelete, setPatientPendingDelete] = useState<DoctorPatientRecord | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const sectionRefs = useRef<Record<DashboardSection, HTMLDivElement | null>>({
    overview: null,
    "patient-records": null,
    appointments: null,
    observations: null,
  });
  const patientSearchRef = useRef<HTMLDivElement | null>(null);
  const patientSearchInputRef = useRef<HTMLInputElement | null>(null);
  const patientPickerOverlayRef = useRef<HTMLDivElement | null>(null);
  const [patientPickerPosition, setPatientPickerPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    localStorage.setItem("careleo_doctor_site_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const filteredDoctorAppointments = useMemo(() => {
    if (appointmentFilter === "all") {
      return doctorAppointments;
    }
    return doctorAppointments.filter((appointment) => appointment.status === appointmentFilter);
  }, [appointmentFilter, doctorAppointments]);

  const groupedAppointmentsByCreatedDate = useMemo(() => {
    const grouped: Record<string, DoctorAppointment[]> = {};
    for (const appointment of filteredDoctorAppointments) {
      const dateKey = appointment.created_at
        ? new Date(appointment.created_at).toLocaleDateString()
        : "Unknown Date";
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(appointment);
    }
    return grouped;
  }, [filteredDoctorAppointments]);

  const createdDateOptions = useMemo(() => Object.keys(groupedAppointmentsByCreatedDate), [groupedAppointmentsByCreatedDate]);

  const visibleAppointmentGroups = useMemo(() => {
    if (createdDateFilter === "all") {
      return groupedAppointmentsByCreatedDate;
    }
    if (!groupedAppointmentsByCreatedDate[createdDateFilter]) {
      return {};
    }
    return { [createdDateFilter]: groupedAppointmentsByCreatedDate[createdDateFilter] };
  }, [createdDateFilter, groupedAppointmentsByCreatedDate]);

  const alphabeticalDoctorPatients = useMemo(
    () =>
      [...doctorPatients].sort((left, right) =>
        left.full_name.localeCompare(right.full_name, undefined, { sensitivity: "base" })
      ),
    [doctorPatients]
  );

  const filteredDoctorPatients = useMemo(() => {
    const query = patientSearchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return alphabeticalDoctorPatients.filter((patient) => {
      return (
        String(patient.id).includes(query) ||
        patient.full_name.toLowerCase().includes(query) ||
        patient.email.toLowerCase().includes(query) ||
        (patient.phone || "").toLowerCase().includes(query) ||
        (patient.address || "").toLowerCase().includes(query)
      );
    });
  }, [alphabeticalDoctorPatients, patientSearchQuery]);

  const patientPickerResults = useMemo(() => {
    const query = patientSearchInput.trim().toLowerCase();
    if (!query) {
      return alphabeticalDoctorPatients;
    }
    return alphabeticalDoctorPatients.filter((patient) => {
      return (
        String(patient.id).includes(query) ||
        patient.full_name.toLowerCase().includes(query) ||
        patient.email.toLowerCase().includes(query) ||
        (patient.phone || "").toLowerCase().includes(query) ||
        (patient.address || "").toLowerCase().includes(query)
      );
    });
  }, [alphabeticalDoctorPatients, patientSearchInput]);

  const todaysAppointments = useMemo(() => {
    const todayKey = new Date().toDateString();
    return doctorAppointments
      .filter((appointment) => new Date(appointment.time).toDateString() === todayKey)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [doctorAppointments]);

  const selectedPatient = useMemo(() => {
    if (filteredDoctorPatients.length === 0) {
      return null;
    }
    if (selectedPatientId === null) {
      return filteredDoctorPatients[0];
    }
    return filteredDoctorPatients.find((patient) => patient.id === selectedPatientId) || filteredDoctorPatients[0];
  }, [filteredDoctorPatients, selectedPatientId]);

  const selectedPatientMetrics = useMemo(
    () => (selectedPatient ? buildPatientMetrics(selectedPatient) : []),
    [selectedPatient]
  );

  const sidebarAppointments = useMemo(
    () => (showAllSidebarAppointments ? todaysAppointments : todaysAppointments.slice(0, 5)),
    [showAllSidebarAppointments, todaysAppointments]
  );

  const visiblePatientDirectory = useMemo(
    () => (showAllPatientDirectory ? filteredDoctorPatients : filteredDoctorPatients.slice(0, 5)),
    [filteredDoctorPatients, showAllPatientDirectory]
  );

  const visibleAppointmentEntries = useMemo(() => {
    const entries = Object.entries(visibleAppointmentGroups);
    return showAllAppointmentGroups ? entries : entries.slice(0, 5);
  }, [showAllAppointmentGroups, visibleAppointmentGroups]);

  const visiblePatientHistory = useMemo(() => {
    const history = selectedPatient?.appointment_history || [];
    return showAllPatientHistory ? history : history.slice(0, 5);
  }, [selectedPatient, showAllPatientHistory]);

  useEffect(() => {
    api.get(`/public/doctor/${id}`).then(({ data }) => {
      setDoctorName(data.hospital?.name || "Doctor Dashboard");
      setLogo(data.branding?.logo || "");
      setBrandColors(parseBrandColors(data.branding?.colors));
    });
  }, [id]);

  useEffect(() => {
    if (!authToken || (!isDoctor && !isAdmin) || !doctorId) {
      return;
    }
    const appointmentPath = isDoctor ? "/doctor-tenant/appointments" : `/admin/doctors/${routeDoctorId}/appointments`;
    api.get(appointmentPath, { headers: { Authorization: `Bearer ${authToken}` } }).then(({ data }) => {
      setDoctorAppointments(data as DoctorAppointment[]);
    }).catch(() => setDoctorAppointments([]));

    api
      .get(`/patients/doctor/${effectiveDoctorId}/records`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => setDoctorPatients(data as DoctorPatientRecord[]))
      .catch(() => setDoctorPatients([]));

    if (isDoctor) {
      api
        .get("/doctor-tenant/me", { headers: { Authorization: `Bearer ${authToken}` } })
        .then(({ data }) => {
          const profile = data as DoctorProfile;
          if (profile.branding?.logo) {
            setLogo(profile.branding.logo);
          }
          if (profile.branding?.colors) {
            setBrandColors(parseBrandColors(profile.branding.colors));
          }
        })
        .catch(() => undefined);
    }
  }, [authToken, doctorId, effectiveDoctorId, isAdmin, isDoctor, routeDoctorId]);

  useEffect(() => {
    setInventoryDrafts((previous) => {
      const next = { ...previous };
      for (const patient of doctorPatients) {
        if (!next[patient.id]) {
          next[patient.id] = buildInventoryDraft(patient);
        }
      }
      return next;
    });
  }, [doctorPatients]);

  useEffect(() => {
    if (!selectedPatientId && filteredDoctorPatients.length > 0) {
      setSelectedPatientId(filteredDoctorPatients[0].id);
      return;
    }
    if (selectedPatientId && !filteredDoctorPatients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(filteredDoctorPatients[0]?.id ?? null);
    }
  }, [filteredDoctorPatients, selectedPatientId]);

  useEffect(() => {
    if (!showPatientPicker) {
      return;
    }

    function syncPatientPickerPosition() {
      const inputBounds = patientSearchInputRef.current?.getBoundingClientRect();
      if (!inputBounds) {
        return;
      }
      setPatientPickerPosition({
        top: inputBounds.bottom + 10,
        left: inputBounds.left,
        width: inputBounds.width,
      });
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !patientSearchRef.current?.contains(target) &&
        !patientPickerOverlayRef.current?.contains(target)
      ) {
        setShowPatientPicker(false);
      }
    }

    syncPatientPickerPosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", syncPatientPickerPosition);
    window.addEventListener("scroll", syncPatientPickerPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", syncPatientPickerPosition);
      window.removeEventListener("scroll", syncPatientPickerPosition, true);
    };
  }, [showPatientPicker]);

  useEffect(() => {
    if (!selectedPatient) {
      setDoctorObservations("");
      return;
    }
    setDoctorObservations(selectedPatient.inventory?.special_instruction || "");
  }, [selectedPatient]);

  async function decideAppointment(appointmentId: number, requestedStatus: "approved" | "rejected") {
    if (!authToken) {
      return;
    }
    setDoctorDashboardStatus("Updating appointment...");
    try {
      const patchPath = isDoctor
        ? `/doctor-tenant/appointments/${appointmentId}`
        : `/admin/doctors/${routeDoctorId}/appointments/${appointmentId}`;
      const listPath = isDoctor ? "/doctor-tenant/appointments" : `/admin/doctors/${routeDoctorId}/appointments`;
      await api.patch(patchPath, { status: requestedStatus }, { headers: { Authorization: `Bearer ${authToken}` } });
      const { data } = await api.get(listPath, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDoctorAppointments(data as DoctorAppointment[]);
      setDoctorDashboardStatus(`Appointment ${requestedStatus}.`);
    } catch (error: any) {
      setDoctorDashboardStatus(String(error?.response?.data?.detail ?? "Unable to update appointment."));
    }
  }

  async function createPrescription(event: FormEvent) {
    event.preventDefault();
    if (!authToken || !prescriptionDraft.appointmentId) {
      return;
    }
    if (!prescriptionDraft.diagnosis.trim() || !prescriptionDraft.drugNames.trim()) {
      setPrescriptionStatus("Diagnosis and drug names are required.");
      return;
    }
    setPrescriptionStatus("Saving prescription...");
    try {
      const drugNames = prescriptionDraft.drugNames
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await api.post(
        `/doctor-tenant/appointments/${prescriptionDraft.appointmentId}/prescriptions`,
        {
          diagnosis: prescriptionDraft.diagnosis,
          drug_names: drugNames,
          instructions: prescriptionDraft.instructions || undefined,
          start_date: prescriptionDraft.startDate || undefined,
          end_date: prescriptionDraft.endDate || undefined
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const appointmentPath = isDoctor ? "/doctor-tenant/appointments" : `/admin/doctors/${routeDoctorId}/appointments`;
      const patientsPath = `/patients/doctor/${effectiveDoctorId}/records`;
      const [appointmentsRes, patientsRes] = await Promise.all([
        api.get(appointmentPath, { headers: { Authorization: `Bearer ${authToken}` } }),
        api.get(patientsPath, { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      setDoctorAppointments(appointmentsRes.data as DoctorAppointment[]);
      setDoctorPatients(patientsRes.data as DoctorPatientRecord[]);

      setPrescriptionDraft({ appointmentId: null, diagnosis: "", drugNames: "", instructions: "", startDate: "", endDate: "" });
      setPrescriptionStatus("Prescription saved.");
    } catch (error: any) {
      setPrescriptionStatus(String(error?.response?.data?.detail ?? "Unable to save prescription."));
    }
  }

  function updateInventoryDraft(patientId: number, field: keyof PatientInventoryDraft, value: string) {
    setInventoryDrafts((previous) => ({
      ...previous,
        [patientId]: {
          ...(previous[patientId] || createEmptyInventoryDraft()),
          [field]: value,
        },
      }));
  }

  function updateNewPatientDraft(field: keyof NewPatientDraft, value: string) {
    setNewPatientDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function resolveNewPatientPincode(pin: string) {
    const normalized = pin.trim();
    updateNewPatientDraft("pincode", normalized);
    if (normalized.length !== 6) {
      setNewPatientPincodeStatus("");
      return;
    }
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`);
      const payload = (await response.json()) as Array<{ Status: string; PostOffice?: Array<{ District?: string; State?: string }> }>;
      const office = payload?.[0]?.PostOffice?.[0];
      if (payload?.[0]?.Status === "Success" && office?.District && office?.State) {
        setNewPatientDraft((previous) => ({
          ...previous,
          pincode: normalized,
          city: office.District || previous.city,
          state: office.State || previous.state,
        }));
        setNewPatientPincodeStatus("");
        return;
      }
      setNewPatientPincodeStatus("Unable to auto-fill for this PIN code. Please enter city and state manually.");
    } catch {
      setNewPatientPincodeStatus("Unable to auto-fill right now. Please enter city and state manually.");
    }
  }

  async function createNewPatientInventory(event: FormEvent) {
    event.preventDefault();
    if (!authToken || !isDoctor) {
      return;
    }
    if (!newPatientDraft.fullName.trim()) {
      setNewPatientStatus("Patient name is required.");
      return;
    }
    setNewPatientStatus("Creating patient inventory...");
    try {
      let derivedDateOfBirth = newPatientDraft.dateOfBirth || undefined;
      if (!derivedDateOfBirth && newPatientDraft.age.trim()) {
        const numericAge = Number(newPatientDraft.age.trim());
        if (Number.isFinite(numericAge) && numericAge > 0) {
          const today = new Date();
          derivedDateOfBirth = `${today.getFullYear() - numericAge}-01-01`;
        }
      }
      const { data } = await api.post(
        "/doctor-tenant/patients",
        {
          full_name: newPatientDraft.fullName.trim(),
          email: newPatientDraft.email.trim() || undefined,
          phone: newPatientDraft.phone.trim() || undefined,
          local_address: newPatientDraft.localAddress.trim() || undefined,
          pincode: newPatientDraft.pincode.trim() || undefined,
          city: newPatientDraft.city.trim() || undefined,
          state: newPatientDraft.state.trim() || undefined,
          gender: newPatientDraft.gender.trim() || undefined,
          date_of_birth: derivedDateOfBirth,
          religion: newPatientDraft.religion.trim() || undefined,
          diagnosis: newPatientDraft.diagnosis.trim() || undefined,
          investigation: newPatientDraft.investigation.trim() || undefined,
          finding: newPatientDraft.finding.trim() || undefined,
          prescription: newPatientDraft.prescription.trim() || undefined,
          special_instruction: newPatientDraft.specialInstruction.trim() || undefined,
          family_history: newPatientDraft.familyHistory.trim() || undefined,
          past_medication_history: newPatientDraft.pastMedicationHistory.trim() || undefined,
          surgical_history: newPatientDraft.surgicalHistory.trim() || undefined,
          presenting_complaints: newPatientDraft.presentingComplaints.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const createdPatient = data.patient;
      const createdInventory = data.inventory;
      const patientRecord: DoctorPatientRecord = {
        id: createdPatient.id,
        full_name: createdPatient.full_name,
        email: createdPatient.email,
        phone: createdPatient.phone,
        address: createdPatient.address,
        local_address: createdPatient.local_address,
        pincode: createdPatient.pincode,
        city: createdPatient.city,
        state: createdPatient.state,
        gender: createdPatient.gender,
        date_of_birth: createdPatient.date_of_birth,
        appointment_history: [],
        prescriptions: [],
        inventory: createdInventory,
      };

      setDoctorPatients((previous) => [patientRecord, ...previous]);
      setInventoryDrafts((previous) => ({
        ...previous,
        [createdPatient.id]: buildInventoryDraft(patientRecord),
      }));
      setNewPatientDraft(createEmptyNewPatientDraft());
      setNewPatientStatus("Patient inventory created.");
    } catch (error: any) {
      setNewPatientStatus(String(error?.response?.data?.detail ?? "Unable to create patient inventory."));
    }
  }

  async function savePatientInventory(patientId: number) {
    if (!authToken || !isDoctor) {
      return;
    }
    const draft = inventoryDrafts[patientId];
    if (!draft) {
      return;
    }
    setInventoryStatus((previous) => ({ ...previous, [patientId]: "Saving inventory..." }));
    try {
      const { data } = await api.put(
        `/doctor-tenant/patients/${patientId}/inventory`,
        {
          religion: draft.religion || undefined,
          diagnosis: draft.diagnosis || undefined,
          investigation: draft.investigation || undefined,
          investigation_date: draft.investigationDate || undefined,
          finding: draft.finding || undefined,
          finding_date: draft.findingDate || undefined,
          prescription: draft.prescription || undefined,
          special_instruction: draft.specialInstruction || undefined,
          family_history: draft.familyHistory || undefined,
          past_medication_history: draft.pastMedicationHistory || undefined,
          surgical_history: draft.surgicalHistory || undefined,
          presenting_complaints: draft.presentingComplaints || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setDoctorPatients((previous) =>
        previous.map((patient) => (patient.id === patientId ? { ...patient, inventory: data } : patient))
      );
      setInventoryStatus((previous) => ({ ...previous, [patientId]: "Inventory saved." }));
    } catch (error: any) {
      setInventoryStatus((previous) => ({
        ...previous,
        [patientId]: String(error?.response?.data?.detail ?? "Unable to save inventory."),
      }));
    }
  }

  async function deletePatientRecord() {
    if (!authToken || !isDoctor || !patientPendingDelete) {
      return;
    }
    setIsDeletingPatient(true);
    setDoctorDashboardStatus(`Deleting ${patientPendingDelete.full_name}...`);
    try {
      const patientId = patientPendingDelete.id;
      await api.delete(`/doctor-tenant/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDoctorPatients((previous) => previous.filter((patient) => patient.id !== patientId));
      setDoctorAppointments((previous) => previous.filter((appointment) => appointment.patient_id !== patientId));
      setInventoryDrafts((previous) => {
        const next = { ...previous };
        delete next[patientId];
        return next;
      });
      setInventoryStatus((previous) => {
        const next = { ...previous };
        delete next[patientId];
        return next;
      });
      setPatientPendingDelete(null);
      setSelectedPatientId((previous) => (previous === patientId ? null : previous));
      setDoctorDashboardStatus("Patient deleted successfully.");
    } catch (error: any) {
      setDoctorDashboardStatus(String(error?.response?.data?.detail ?? "Unable to delete patient."));
    } finally {
      setIsDeletingPatient(false);
    }
  }

  function signOut() {
    localStorage.removeItem("careleo_clinic_token");
    localStorage.removeItem("careleo_doctor_token");
    localStorage.removeItem("careleo_admin_token");
    window.location.href = `/clinic/${id}`;
  }

  function scrollToSection(section: DashboardSection) {
    setActiveSection(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openPatientFromSearch(patient: DoctorPatientRecord) {
    setPatientSearchInput(patient.full_name);
    setPatientSearchQuery(patient.full_name);
    setSelectedPatientId(patient.id);
    setShowPatientPicker(false);
  }

  function renderPatientPickerContent() {
    return (
      <>
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: darkMode ? "#8fb2c8" : "#6f8798" }}>
            Patients A-Z
          </p>
          <button
            type="button"
            onClick={() => setShowPatientPicker(false)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: darkMode ? "#d5e9f6" : "#234863" }}
          >
            Close
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto px-1 pb-1">
          {patientPickerResults.length === 0 ? (
            <div className="rounded-2xl px-3 py-4 text-sm" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>
              No patient records found.
            </div>
          ) : (
            patientPickerResults.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => openPatientFromSearch(patient)}
                className="w-full rounded-2xl border px-3 py-3 text-left"
                style={{
                  borderColor: selectedPatient?.id === patient.id ? (darkMode ? "#4f9fd5" : "#bad7ec") : (darkMode ? "#214459" : "#e1e8ed"),
                  backgroundColor: selectedPatient?.id === patient.id ? (darkMode ? "#18374a" : "#f1f9fe") : (darkMode ? "#142636" : "#f9fcfe")
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: darkMode ? "#eff8ff" : "#17354c" }}>{patient.full_name}</p>
                    <p className="truncate text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>
                      ID #{patient.id} · {patient.phone || patient.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: darkMode ? "#9ee0ff" : "#2f79bd" }}>
                    Select
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </>
    );
  }

  if (!isDoctor && !isAdmin) {
    return (
      <main className="min-h-screen bg-[#f4f1e7] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#d7cfbf] bg-[#f2ebdb] p-8 text-center">
          <p className="text-sm font-semibold text-[#4b5d56]">Restricted access</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-[#12342f]">Please sign in as doctor or admin first</h1>
          <Link
            to={`/clinic/${id}`}
            className="mt-5 inline-flex rounded-full px-5 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "#0f4c5c" }}
          >
            Go to Clinic Site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PageFade
      className="min-h-screen pb-12"
      style={{
        background: darkMode
          ? "#0f1f2b"
          : "#f6f4ef"
      }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: darkMode ? "#203746" : "#d8d2c2",
          backgroundColor: darkMode ? "rgba(11, 31, 42, 0.82)" : "rgba(244, 241, 231, 0.80)"
        }}
      >
        <div className="flex w-full flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 2xl:px-14">
          <div className="flex min-w-0 items-center gap-3">
            {logo ? <img src={logo} alt={doctorName} className="h-10 w-10 rounded-full object-cover" /> : <Leaf className="h-5 w-5 text-[#35544a]" />}
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold" style={{ color: darkMode ? "#e8f3f1" : "#15342f" }}>{doctorName}</p>
              <p className="text-xs" style={{ color: darkMode ? "#b8d0ca" : "#4b5d56" }}>Doctor Operations Dashboard</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border p-2"
              style={{
                borderColor: darkMode ? "#3f5867" : "#b7b09f",
                backgroundColor: darkMode ? "#173243" : "#f8f2e6",
                color: darkMode ? "#dff4f0" : "#15342f"
              }}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to={`/clinic/${id}`} className="rounded-full border border-[#9bb0a8] bg-[#f8f2e6] px-4 py-2 text-xs font-bold text-[#173e37] sm:text-sm">
              Back to Website
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                className="rounded-full border border-[#b7b09f] bg-[#f8f2e6] p-2 text-[#15342f]"
                aria-label="Open profile menu"
              >
                <UserRound className="h-5 w-5" />
              </button>
              {profileMenuOpen ? (
                <div className="absolute right-0 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-[#d4ccb9] bg-[#fbf7ee] p-4 shadow-2xl">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#5e6f68]">Signed in as</p>
                  <p className="mt-1 text-sm font-bold text-[#173e37]">{isAdmin ? "admin" : "doctor"}</p>
                  <InteractiveLogoutButton
                    onClick={signOut}
                    className="mt-3 w-full"
                    style={{
                      "--logout-bg": darkMode ? "#173243" : "#f8f2e6",
                      "--logout-text": darkMode ? "#eaf5f9" : "#163b35",
                      "--logout-door": darkMode ? "#63b8d8" : "#2f79bd",
                      "--logout-figure": darkMode ? "#d9c07a" : "#cc8f2f",
                      "--logout-shadow": darkMode ? "rgba(8, 20, 30, 0.42)" : "rgba(47, 121, 189, 0.18)"
                    } as CSSProperties}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {isDoctor ? (
        <section className="snap-section mt-6 w-full px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="grid gap-6">
            <div className="rounded-[28px] border p-6 shadow-xl sm:p-8" style={{ borderColor: darkMode ? "#224759" : "#d7e8f4", backgroundColor: darkMode ? "#102a37" : "#ffffff" }}>
              <MotionText as="h2" text="Create Patient Inventory" className="font-sans text-2xl font-bold tracking-tight" />
              <p className="mt-2 text-sm" style={{ color: darkMode ? "#a7c4d7" : "#65839a" }}>
                Add a brand new patient directly from the dashboard. If a patient books online later, appointment details continue under the same record.
              </p>
              <form onSubmit={createNewPatientInventory} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={newPatientDraft.fullName}
                  onChange={(e) => updateNewPatientDraft("fullName", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Patient name"
                  required
                />
                <input
                  value={newPatientDraft.phone}
                  onChange={(e) => updateNewPatientDraft("phone", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Phone number"
                />
                <input
                  value={newPatientDraft.age}
                  onChange={(e) => updateNewPatientDraft("age", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Age"
                  inputMode="numeric"
                />
                <input
                  value={newPatientDraft.email}
                  onChange={(e) => updateNewPatientDraft("email", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Email (optional)"
                />
                <select
                  value={newPatientDraft.gender}
                  onChange={(e) => updateNewPatientDraft("gender", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  value={newPatientDraft.dateOfBirth}
                  onChange={(e) => updateNewPatientDraft("dateOfBirth", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  type="date"
                  placeholder="Date of birth (optional)"
                />
                <select
                  value={newPatientDraft.religion}
                  onChange={(e) => updateNewPatientDraft("religion", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                >
                  <option value="">Religion</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Christian">Christian</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  value={newPatientDraft.localAddress}
                  onChange={(e) => updateNewPatientDraft("localAddress", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Local address"
                />
                <input
                  value={newPatientDraft.pincode}
                  onChange={(e) => void resolveNewPatientPincode(e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Pincode"
                />
                <input
                  value={newPatientDraft.city}
                  onChange={(e) => updateNewPatientDraft("city", e.target.value)}
                  className="rounded-2xl border p-3 text-sm"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="City"
                />
                <input
                  value={newPatientDraft.state}
                  onChange={(e) => updateNewPatientDraft("state", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="State"
                />
                {newPatientPincodeStatus ? (
                  <p className="text-xs font-medium sm:col-span-2" style={{ color: darkMode ? "#f6c38b" : "#9b5f1d" }}>
                    {newPatientPincodeStatus}
                  </p>
                ) : null}
                <textarea
                  value={newPatientDraft.presentingComplaints}
                  onChange={(e) => updateNewPatientDraft("presentingComplaints", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Presenting complaints"
                />
                <textarea
                  value={newPatientDraft.diagnosis}
                  onChange={(e) => updateNewPatientDraft("diagnosis", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Diagnosis"
                />
                <textarea
                  value={newPatientDraft.investigation}
                  onChange={(e) => updateNewPatientDraft("investigation", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Investigation"
                />
                <textarea
                  value={newPatientDraft.finding}
                  onChange={(e) => updateNewPatientDraft("finding", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Finding"
                />
                <textarea
                  value={newPatientDraft.prescription}
                  onChange={(e) => updateNewPatientDraft("prescription", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Prescription"
                />
                <textarea
                  value={newPatientDraft.specialInstruction}
                  onChange={(e) => updateNewPatientDraft("specialInstruction", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Special instruction"
                />
                <textarea
                  value={newPatientDraft.familyHistory}
                  onChange={(e) => updateNewPatientDraft("familyHistory", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Family history"
                />
                <textarea
                  value={newPatientDraft.pastMedicationHistory}
                  onChange={(e) => updateNewPatientDraft("pastMedicationHistory", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Past medication history"
                />
                <textarea
                  value={newPatientDraft.surgicalHistory}
                  onChange={(e) => updateNewPatientDraft("surgicalHistory", e.target.value)}
                  className="rounded-2xl border p-3 text-sm sm:col-span-2"
                  style={{ borderColor: darkMode ? "#2a5569" : "#cfe3f3", backgroundColor: darkMode ? "#0d2230" : "#f8fcff", color: darkMode ? "#eff8ff" : "#16314a" }}
                  placeholder="Surgical history"
                />
                <button type="submit" className="rounded-2xl px-4 py-3 text-sm font-semibold text-white sm:col-span-2" style={{ backgroundColor: darkMode ? "#2f8fd1" : "#1f76c2" }}>
                  Save New Patient
                </button>
              </form>
              {newPatientStatus ? <p className="mt-3 text-sm font-semibold" style={{ color: darkMode ? "#9edbff" : "#335149" }}>{newPatientStatus}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      <motion.section className="snap-section mt-8 w-full px-4 sm:px-6 lg:px-10 2xl:px-14" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div
          className="rounded-[32px] border p-4 shadow-[0_22px_48px_rgba(15,35,55,0.08)] sm:p-6"
          style={{
            borderColor: darkMode ? "#24475a" : "#dde5ea",
            backgroundColor: darkMode ? "#142636" : "#f6f4ef"
          }}
        >
          <div className="grid gap-5 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <div className="grid gap-5">
                <div
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: darkMode ? "rgba(91, 181, 255, 0.14)" : "#eef6fb" }}>
                      <Stethoscope className="h-5 w-5" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                    </div>
                    <div>
                      <MotionText as="h1" text="Doctor Dashboard" className="font-sans text-2xl font-semibold tracking-tight" />
                      <p className="text-xs" style={{ color: darkMode ? "#aac0d0" : "#6e8495" }}>
                        Arogya Ashram clinical workspace
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {[
                      { label: "Overview", icon: Stethoscope, section: "overview" as const },
                      { label: "Patient Records", icon: Users, section: "patient-records" as const },
                      { label: "Appointments", icon: CalendarClock, section: "appointments" as const },
                      { label: "Observations", icon: ClipboardPenLine, section: "observations" as const }
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => scrollToSection(item.section)}
                        className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
                        style={{
                          borderColor:
                            activeSection === item.section
                              ? darkMode
                                ? "#4f9fd5"
                                : "#bad7ec"
                              : darkMode
                                ? "#2a5165"
                                : "#e1e8ed",
                          backgroundColor:
                            activeSection === item.section
                              ? darkMode
                                ? "#18374a"
                                : "#f1f9fe"
                              : darkMode
                                ? "#102332"
                                : "#ffffff"
                        }}
                      >
                        <item.icon className="h-4 w-4" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                        <span className="text-sm font-medium" style={{ color: darkMode ? "#eef7ff" : "#1e3446" }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  ref={(node) => {
                    sectionRefs.current.overview = node;
                  }}
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <MotionText as="p" text="Statistics Overview" className="font-sans text-lg font-semibold" />
                  <div className="mt-4 grid gap-3">
                    {[
                      { label: "Patient Count", value: String(doctorPatients.length), icon: Users },
                      { label: "Appointments", value: String(doctorAppointments.length), icon: CalendarClock },
                      { label: "Pending", value: String(doctorAppointments.filter((item) => item.status === "pending").length), icon: ClipboardPenLine }
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          borderColor: darkMode ? "#2a5165" : "#e1e8ed",
                          backgroundColor: darkMode ? "#102332" : "#ffffff"
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{stat.label}</p>
                          <stat.icon className="h-4 w-4" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                        </div>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: darkMode ? "#f5fbff" : "#153047" }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  ref={(node) => {
                    sectionRefs.current["patient-records"] = node;
                  }}
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                    <MotionText as="p" text="Today's Appointments" className="font-sans text-lg font-semibold" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {sidebarAppointments.length === 0 ? (
                      <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff", color: darkMode ? "#a7bfd0" : "#72889a" }}>
                        No appointments scheduled for today.
                      </div>
                    ) : (
                      sidebarAppointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: darkMode ? "#eff8ff" : "#17354c" }}>{appointment.patient_name}</p>
                              <p className="text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>
                                {new Date(appointment.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: darkMode ? "#173446" : "#eef6fb", color: darkMode ? "#9ee0ff" : "#2f79bd" }}>
                              {appointment.status === "approved" ? "Completed" : appointment.status === "pending" ? "Waiting" : "In-Progress"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {todaysAppointments.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllSidebarAppointments((value) => !value)}
                      className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        backgroundColor: darkMode ? "#102332" : "#f9fcfe",
                        color: darkMode ? "#d9edf8" : "#234863"
                      }}
                    >
                      {showAllSidebarAppointments ? "Show less" : `Open drawer (${todaysAppointments.length - 5} more)`}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="xl:col-span-4">
              <div className="grid gap-5">
                <div
                  ref={(node) => {
                    sectionRefs.current.appointments = node;
                  }}
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <MotionText as="p" text="Patient Search" className="font-sans text-lg font-semibold" />
                      <p className="text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>Locate patient records quickly</p>
                    </div>
                    <Search className="h-5 w-5" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                  </div>
                  <div ref={patientSearchRef} className="mt-4 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: darkMode ? "#88adc5" : "#7a98ad" }} />
                      <input
                        ref={patientSearchInputRef}
                        value={patientSearchInput}
                        onChange={(e) => {
                          setPatientSearchInput(e.target.value);
                          setShowPatientPicker(true);
                        }}
                        onFocus={() => setShowPatientPicker(true)}
                        className="w-full rounded-2xl border py-3 pl-10 pr-3 text-sm"
                        style={{
                          borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                          backgroundColor: darkMode ? "#102332" : "#ffffff",
                          color: darkMode ? "#eff8ff" : "#18344c"
                        }}
                        placeholder="Search by patient name, ID, or address"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearchQuery(patientSearchInput);
                        setShowPatientPicker(true);
                      }}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: darkMode ? "#2f8fd1" : "#2f79bd" }}
                    >
                      Search
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {!patientSearchQuery.trim() ? (
                      <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff", color: darkMode ? "#a7bfd0" : "#72889a" }}>
                        Search by patient name, ID, phone, or address to view records.
                      </div>
                    ) : visiblePatientDirectory.length === 0 ? (
                      <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff", color: darkMode ? "#a7bfd0" : "#72889a" }}>
                        No patient records found.
                      </div>
                    ) : (
                      visiblePatientDirectory.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="w-full rounded-2xl border p-4 text-left"
                          style={{
                            borderColor: selectedPatient?.id === patient.id ? (darkMode ? "#4f9fd5" : "#bad7ec") : (darkMode ? "#2a5165" : "#e1e8ed"),
                            backgroundColor: selectedPatient?.id === patient.id ? (darkMode ? "#18374a" : "#f1f9fe") : (darkMode ? "#102332" : "#ffffff")
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: darkMode ? "#eff8ff" : "#17354c" }}>{patient.full_name}</p>
                              <p className="mt-1 text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>ID #{patient.id}</p>
                            </div>
                            <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ backgroundColor: darkMode ? "#173446" : "#eef6fb", color: darkMode ? "#9ee0ff" : "#2f79bd" }}>
                              {patient.appointment_history?.[0]?.created_at ? new Date(patient.appointment_history[0].created_at).toLocaleDateString() : "New"}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-1 text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{patient.address || patient.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                  {patientSearchQuery.trim() && filteredDoctorPatients.length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllPatientDirectory((value) => !value)}
                      className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        backgroundColor: darkMode ? "#102332" : "#f9fcfe",
                        color: darkMode ? "#d9edf8" : "#234863"
                      }}
                    >
                      {showAllPatientDirectory ? "Show less patients" : `Open patient drawer (${filteredDoctorPatients.length - 5} more)`}
                    </button>
                  ) : null}
                </div>

                <div
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <MotionText as="p" text="Selected Patient Details" className="font-sans text-lg font-semibold" />
                  {selectedPatient ? (
                    <div className="mt-4 grid gap-3">
                      {[
                        { label: "Name", value: selectedPatient.full_name },
                        { label: "Age", value: calculateAge(selectedPatient.date_of_birth) },
                        { label: "Phone", value: selectedPatient.phone || "-" },
                        { label: "Address", value: selectedPatient.address || "-" },
                        { label: "Gender", value: selectedPatient.gender || "-" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{item.label}</p>
                          <p className="mt-1 text-sm font-medium" style={{ color: darkMode ? "#eef7ff" : "#18344c" }}>{item.value}</p>
                        </div>
                      ))}
                      {isDoctor ? (
                        <button
                          type="button"
                          onClick={() => setPatientPendingDelete(selectedPatient)}
                          className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                          style={{
                            borderColor: darkMode ? "#7a3042" : "#f0bcc8",
                            backgroundColor: darkMode ? "rgba(97, 29, 47, 0.3)" : "#fff3f6",
                            color: darkMode ? "#ffc6d2" : "#b4234f"
                          }}
                        >
                          Delete Patient
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>Select a patient to inspect details.</p>
                  )}
                </div>

                <div
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <MotionText as="p" text="Vitals Sparklines" className="font-sans text-lg font-semibold" />
                  <div className="mt-4 grid gap-3">
                    {selectedPatient ? selectedPatientMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border p-4" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{metric.label}</p>
                          <Activity className="h-4 w-4" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                        </div>
                        <p className="mt-2 text-xl font-semibold" style={{ color: darkMode ? "#f5fbff" : "#153047" }}>{metric.value}</p>
                        <svg viewBox="0 0 140 36" className="mt-3 h-10 w-full">
                          <path d={buildSparklinePath(metric.trend)} fill="none" stroke={darkMode ? "#8edbff" : "#2f79bd"} strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                      </div>
                    )) : (
                      <p className="text-sm" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>Vitals will appear after a patient is selected.</p>
                    )}
                  </div>
                </div>
                {showPatientPicker ? (
                  <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 px-3 py-4 md:hidden">
                    <div
                      className="w-full rounded-t-[28px] border p-3 shadow-2xl"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        backgroundColor: darkMode ? "#102332" : "#ffffff"
                      }}
                    >
                      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full" style={{ backgroundColor: darkMode ? "#31596f" : "#d4e0e8" }} />
                      <div className="max-h-[68vh]">
                        {renderPatientPickerContent()}
                      </div>
                    </div>
                  </div>
                ) : null}
                {showPatientPicker && patientPickerPosition ? (
                  <div
                    ref={patientPickerOverlayRef}
                    className="fixed z-[80] hidden rounded-[24px] border p-2 shadow-2xl md:block"
                    style={{
                      top: patientPickerPosition.top,
                      left: patientPickerPosition.left,
                      width: patientPickerPosition.width,
                      borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                      backgroundColor: darkMode ? "#102332" : "#ffffff"
                    }}
                  >
                    <div className="max-h-72">
                      {renderPatientPickerContent()}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="xl:col-span-5">
              <div className="grid gap-5">
                <div
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <MotionText as="p" text="Prescription & History" className="font-sans text-lg font-semibold" />
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "pending", label: "Pending" },
                        { key: "approved", label: "Approved" },
                        { key: "rejected", label: "Rejected" },
                        { key: "all", label: "All" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAppointmentFilter(item.key as "all" | "pending" | "approved" | "rejected")}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={
                            appointmentFilter === item.key
                              ? { backgroundColor: darkMode ? "#2f8fd1" : "#2f79bd", color: "#ffffff" }
                              : { border: `1px solid ${darkMode ? "#2a5165" : "#d7e3eb"}`, color: darkMode ? "#d9edf8" : "#234863" }
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <label className="text-xs font-semibold" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>Date</label>
                    <select
                      value={createdDateFilter}
                      onChange={(e) => setCreatedDateFilter(e.target.value)}
                      className="rounded-2xl border px-3 py-2 text-sm"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        backgroundColor: darkMode ? "#102332" : "#ffffff",
                        color: darkMode ? "#eff8ff" : "#18344c"
                      }}
                    >
                      <option value="all">25/03/2026 style date picker</option>
                      {createdDateOptions.map((dateLabel) => (
                        <option key={dateLabel} value={dateLabel}>
                          {dateLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 space-y-4">
                    {visibleAppointmentEntries.length === 0 ? (
                      <p className="text-sm" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>No appointments in this filter.</p>
                    ) : (
                      visibleAppointmentEntries.map(([dateLabel, appointments]) => (
                        <div key={dateLabel} className="rounded-2xl border p-4" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{dateLabel}</p>
                          <div className="mt-3 space-y-3">
                            {appointments.map((appointment) => (
                              <div key={appointment.id} className="rounded-2xl border p-3" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#142636" : "#f9fcfe" }}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: darkMode ? "#eef7ff" : "#17354c" }}>{appointment.patient_name}</p>
                                    <p className="text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{new Date(appointment.time).toLocaleString()}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPatientId(appointment.patient_id);
                                      scrollToSection("patient-records");
                                    }}
                                    className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                                    style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", color: darkMode ? "#d9edf8" : "#234863" }}
                                  >
                                    Open
                                  </button>
                                </div>
                                {appointment.notes ? <p className="mt-2 text-xs" style={{ color: darkMode ? "#d4e6f2" : "#446177" }}>Notes: {appointment.notes}</p> : null}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => decideAppointment(appointment.id, "approved")}
                                    className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold text-white"
                                    style={{ backgroundColor: "#2e9f68" }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => decideAppointment(appointment.id, "rejected")}
                                    className="inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold text-white"
                                    style={{ backgroundColor: "#d95b66" }}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {Object.keys(visibleAppointmentGroups).length > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllAppointmentGroups((value) => !value)}
                      className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        backgroundColor: darkMode ? "#102332" : "#f9fcfe",
                        color: darkMode ? "#d9edf8" : "#234863"
                      }}
                    >
                      {showAllAppointmentGroups ? "Show fewer dates" : `Open appointments drawer (${Object.keys(visibleAppointmentGroups).length - 5} more dates)`}
                    </button>
                  ) : null}

                  {selectedPatient ? (
                    <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                      <p className="text-sm font-semibold" style={{ color: darkMode ? "#eef7ff" : "#17354c" }}>Patient History</p>
                      <div className="mt-3 space-y-3">
                        {visiblePatientHistory.map((item) => (
                          <div key={item.id} className="rounded-2xl border p-3" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#142636" : "#f9fcfe" }}>
                            <p className="text-xs" style={{ color: darkMode ? "#a7bfd0" : "#72889a" }}>{item.time ? new Date(item.time).toLocaleString() : "-"}</p>
                            {item.notes ? <p className="mt-1 text-sm" style={{ color: darkMode ? "#d4e6f2" : "#446177" }}>{item.notes}</p> : null}
                          </div>
                        ))}
                      </div>
                      {(selectedPatient.appointment_history || []).length > 5 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPatientHistory((value) => !value)}
                          className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                          style={{
                            borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                            backgroundColor: darkMode ? "#102332" : "#f9fcfe",
                            color: darkMode ? "#d9edf8" : "#234863"
                          }}
                        >
                          {showAllPatientHistory ? "Show less history" : `Open history drawer (${(selectedPatient.appointment_history || []).length - 5} more)`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div
                  ref={(node) => {
                    sectionRefs.current.observations = node;
                  }}
                  className="rounded-[28px] border p-5"
                  style={{
                    borderColor: darkMode ? "#284c5f" : "#dde5ea",
                    backgroundColor: darkMode ? "rgba(18, 37, 53, 0.9)" : "rgba(255,255,255,0.88)",
                    backdropFilter: "blur(14px)"
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <MotionText as="p" text="Doctor's Observations" className="font-sans text-lg font-semibold" />
                    <ClipboardPenLine className="h-5 w-5" style={{ color: darkMode ? "#8edbff" : "#2f79bd" }} />
                  </div>
                  <textarea
                    value={doctorObservations}
                    onChange={(e) => setDoctorObservations(e.target.value)}
                    className="mt-4 min-h-[180px] w-full rounded-2xl border p-4 text-sm leading-6"
                    style={{
                      borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                      backgroundColor: darkMode ? "#102332" : "#ffffff",
                      color: darkMode ? "#eff8ff" : "#18344c"
                    }}
                    placeholder="Record clinical observations, follow-up notes, or instructions."
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPatient) {
                          setDoctorDashboardStatus("Select a patient first to start prescribing.");
                          scrollToSection("patient-records");
                          return;
                        }
                        scrollToSection("observations");
                        setDoctorDashboardStatus(`Prescription notes ready for ${selectedPatient.full_name}. Update the inventory below and save it.`);
                      }}
                      className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
                      style={{ backgroundColor: darkMode ? "#2f8fd1" : "#2f79bd" }}
                    >
                      Prescribe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPatient) {
                          setDoctorDashboardStatus("Select a patient first to prepare a referral note.");
                          scrollToSection("patient-records");
                          return;
                        }
                        scrollToSection("observations");
                        setDoctorDashboardStatus(`Referral workflow is not automated yet. Add referral notes for ${selectedPatient.full_name} in Doctor's Observations.`);
                      }}
                      className="rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                      style={{
                        borderColor: darkMode ? "#2a5165" : "#d7e3eb",
                        color: darkMode ? "#d9edf8" : "#234863"
                      }}
                    >
                      Refer
                    </button>
                  </div>

                  {selectedPatient && isDoctor ? (
                    <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: darkMode ? "#2a5165" : "#e1e8ed", backgroundColor: darkMode ? "#102332" : "#ffffff" }}>
                      <p className="text-sm font-semibold" style={{ color: darkMode ? "#eef7ff" : "#17354c" }}>Patient Inventory</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input value={inventoryDrafts[selectedPatient.id]?.religion || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "religion", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Religion" />
                        <input value={inventoryDrafts[selectedPatient.id]?.investigationDate || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "investigationDate", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} type="date" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.presentingComplaints || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "presentingComplaints", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Presenting complaints" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.diagnosis || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "diagnosis", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Diagnosis" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.investigation || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "investigation", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Investigation" />
                        <input value={inventoryDrafts[selectedPatient.id]?.findingDate || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "findingDate", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} type="date" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.finding || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "finding", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Finding" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.prescription || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "prescription", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Prescription" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.specialInstruction || ""} onChange={(e) => { updateInventoryDraft(selectedPatient.id, "specialInstruction", e.target.value); setDoctorObservations(e.target.value); }} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Special instruction" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.familyHistory || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "familyHistory", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Family history" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.pastMedicationHistory || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "pastMedicationHistory", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Past medication history" />
                        <textarea value={inventoryDrafts[selectedPatient.id]?.surgicalHistory || ""} onChange={(e) => updateInventoryDraft(selectedPatient.id, "surgicalHistory", e.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm sm:col-span-2" style={{ borderColor: darkMode ? "#2a5165" : "#d7e3eb", backgroundColor: darkMode ? "#142636" : "#f9fcfe", color: darkMode ? "#eff8ff" : "#18344c" }} placeholder="Surgical history" />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => savePatientInventory(selectedPatient.id)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: darkMode ? "#2f8fd1" : "#2f79bd" }}>
                          Save Inventory
                        </button>
                        {inventoryStatus[selectedPatient.id] ? <p className="text-xs font-semibold" style={{ color: darkMode ? "#9edbff" : "#335149" }}>{inventoryStatus[selectedPatient.id]}</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {doctorDashboardStatus ? <p className="mt-4 text-sm font-semibold" style={{ color: darkMode ? "#9edbff" : "#335149" }}>{doctorDashboardStatus}</p> : null}
        </div>
      </motion.section>
      {patientPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div
            className="w-full max-w-md rounded-[28px] border p-6 shadow-2xl"
            style={{
              borderColor: darkMode ? "#365567" : "#d8e1e7",
              backgroundColor: darkMode ? "#112633" : "#ffffff"
            }}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2" style={{ backgroundColor: darkMode ? "rgba(128, 39, 60, 0.24)" : "#fff1f4" }}>
                <XCircle className="h-5 w-5" style={{ color: darkMode ? "#ffc0cd" : "#c42854" }} />
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: darkMode ? "#f2f7fb" : "#17354c" }}>Delete patient record?</p>
                <p className="mt-2 text-sm leading-6" style={{ color: darkMode ? "#b9cfde" : "#5c7488" }}>
                  Are you sure you want to delete {patientPendingDelete.full_name}? This will permanently remove the patient, their appointments, prescriptions, and inventory from the database.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPatientPendingDelete(null)}
                disabled={isDeletingPatient}
                className="rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                style={{
                  borderColor: darkMode ? "#365567" : "#d8e1e7",
                  color: darkMode ? "#e0edf7" : "#234863"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deletePatientRecord()}
                disabled={isDeletingPatient}
                className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: darkMode ? "#c53d65" : "#c42854" }}
              >
                {isDeletingPatient ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageFade>
  );
}

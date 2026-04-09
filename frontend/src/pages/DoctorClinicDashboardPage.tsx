import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, CalendarClock, CheckCircle2, ClipboardPenLine, Copy, Leaf, MessageSquare, Moon, Phone, Pill, Search, Send, Stethoscope, Sun, UserRound, Users, XCircle } from "lucide-react";
import { api } from "../api/client";
import { InteractiveLogoutButton } from "../components/InteractiveLogoutButton";
import { MotionText, PageFade } from "../components/Motion";
import { ActionButton, MetricCard, SectionHeader, SurfaceCard } from "../components/dashboard/DoctorDashboardPrimitives";

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
  consultation_mode?: string | null;
  teleconsultation_link?: string | null;
  follow_up_date?: string | null;
  reminder_channel?: string | null;
  fee_amount?: string | null;
  receipt_number?: string | null;
  payment_status?: string | null;
  payment_notes?: string | null;
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
    consultation_mode?: string | null;
    teleconsultation_link?: string | null;
    follow_up_date?: string | null;
    reminder_channel?: string | null;
    fee_amount?: string | null;
    receipt_number?: string | null;
    payment_status?: string | null;
    payment_notes?: string | null;
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
    printable_notes?: string | null;
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
    diet_plan?: string | null;
    pathya?: string | null;
    apathya?: string | null;
    lab_reports?: string[] | null;
    document_vault?: string[] | null;
    preferred_language?: string | null;
    follow_up_notes?: string | null;
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
  dietPlan: string;
  pathya: string;
  apathya: string;
  labReports: string;
  documentVault: string;
  preferredLanguage: string;
  followUpNotes: string;
}

interface PatientSupportDraft {
  consultationMode: string;
  teleconsultationLink: string;
  reminderChannel: string;
  feeAmount: string;
  receiptNumber: string;
  paymentStatus: string;
  paymentNotes: string;
  followUpDate: string;
  followUpTime: string;
}

interface PatientMessageDraft {
  subject: string;
  body: string;
  channel: "whatsapp" | "sms";
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
type IntakeStepKey = "personal" | "symptoms" | "treatment" | "history";

const INTAKE_STEPS: Array<{ key: IntakeStepKey; label: string; description: string }> = [
  { key: "personal", label: "Personal Info", description: "Demographics and contact details" },
  { key: "symptoms", label: "Symptoms & Diagnosis", description: "Complaint, diagnosis, and investigations" },
  { key: "treatment", label: "Treatment Plan", description: "Vitals, notes, and prescriptions" },
  { key: "history", label: "History", description: "Past medical, surgical, and family history" },
];

const ICD10_SUGGESTIONS = [
  "A09 - Infectious gastroenteritis and colitis, unspecified",
  "E11.9 - Type 2 diabetes mellitus without complications",
  "I10 - Essential (primary) hypertension",
  "J06.9 - Acute upper respiratory infection, unspecified",
  "J45.909 - Unspecified asthma, uncomplicated",
  "K21.9 - Gastro-esophageal reflux disease without esophagitis",
  "M54.5 - Low back pain",
  "M79.1 - Myalgia",
  "R05 - Cough",
  "R50.9 - Fever, unspecified",
];

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const RELIGION_OPTIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "Marathi", "Gujarati", "Punjabi", "Bengali"];

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
    dietPlan: patient.inventory?.diet_plan || "",
    pathya: (patient.inventory?.pathya || ""),
    apathya: (patient.inventory?.apathya || ""),
    labReports: (patient.inventory?.lab_reports || []).join("\n"),
    documentVault: (patient.inventory?.document_vault || []).join("\n"),
    preferredLanguage: patient.inventory?.preferred_language || "English",
    followUpNotes: patient.inventory?.follow_up_notes || "",
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
    dietPlan: "",
    pathya: "",
    apathya: "",
    labReports: "",
    documentVault: "",
    preferredLanguage: "English",
    followUpNotes: "",
  };
}

function buildPatientSupportDraft(patient: DoctorPatientRecord): PatientSupportDraft {
  const latestAppointment = patient.appointment_history?.[0];
  const followUpDate = latestAppointment?.follow_up_date ? new Date(latestAppointment.follow_up_date) : null;
  return {
    consultationMode: latestAppointment?.consultation_mode || "In-person",
    teleconsultationLink: latestAppointment?.teleconsultation_link || "",
    reminderChannel: latestAppointment?.reminder_channel || "WhatsApp",
    feeAmount: latestAppointment?.fee_amount || "",
    receiptNumber: latestAppointment?.receipt_number || "",
    paymentStatus: latestAppointment?.payment_status || "Pending",
    paymentNotes: latestAppointment?.payment_notes || "",
    followUpDate: followUpDate ? followUpDate.toISOString().slice(0, 10) : "",
    followUpTime: followUpDate ? followUpDate.toISOString().slice(11, 16) : "10:00",
  };
}

function createEmptyPatientSupportDraft(): PatientSupportDraft {
  return {
    consultationMode: "In-person",
    teleconsultationLink: "",
    reminderChannel: "WhatsApp",
    feeAmount: "",
    receiptNumber: "",
    paymentStatus: "Pending",
    paymentNotes: "",
    followUpDate: "",
    followUpTime: "10:00",
  };
}

function linesToItems(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildReminderMessage(patient: DoctorPatientRecord, supportDraft: PatientSupportDraft, followUpNote: string): string {
  return [
    `Namaste ${patient.full_name},`,
    supportDraft.followUpDate ? `Your follow-up with Arogya Ashram is scheduled for ${supportDraft.followUpDate} ${supportDraft.followUpTime}.` : "",
    followUpNote ? `Doctor notes: ${followUpNote}` : "",
    supportDraft.consultationMode ? `Consultation mode: ${supportDraft.consultationMode}.` : "",
    supportDraft.teleconsultationLink ? `Teleconsultation link: ${supportDraft.teleconsultationLink}` : "",
    "Please reply if you need to reschedule."
  ].filter(Boolean).join(" ");
}

function buildMessageDraft(patient: DoctorPatientRecord, supportDraft: PatientSupportDraft, followUpNote: string): PatientMessageDraft {
  return {
    subject: supportDraft.followUpDate ? "Follow-up confirmation" : "Care follow-up",
    body: buildReminderMessage(patient, supportDraft, followUpNote),
    channel: supportDraft.reminderChannel.toLowerCase().includes("sms") ? "sms" : "whatsapp",
  };
}

function openPrintWindow(title: string, bodyHtml: string, logoUrl?: string) {
  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) {
    console.error("Popup blocked");
    alert("Popups are blocked. Please allow popups for this site to print.");
    return;
  }
  
  const bgImage = logoUrl 
    ? `url('${logoUrl}')` 
    : `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%232f7d6b" opacity="0.05"><path d="M50 0C50 0 20 20 20 50C20 80 50 100 50 100C50 100 80 80 80 50C80 20 50 0 50 0Z" /><path d="M50 20C50 20 30 40 30 65C30 90 50 100 50 100C50 100 70 90 70 65C70 40 50 20 50 20Z" fill="%230f5d73"/></svg>')`;

  popup.document.open();
  popup.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: 'Georgia', serif; 
            margin: 0; 
            padding: 40px; 
            color: #17354c; 
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f6fbf8;
            text-align: center;
          }
          h1 { margin: 0 0 16px; font-size: 2.4rem; color: #0f5d73; }
          .muted { color: #5c7488; font-size: 14px; margin-bottom: 24px; font-weight: 500; }
          .card { 
            position: relative;
            border: 1px solid rgba(47, 125, 107, 0.2); 
            border-radius: 24px; 
            padding: 40px; 
            background: #ffffff; 
            max-width: 680px; 
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }
          .card::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 80%;
            background-image: ${bgImage};
            background-repeat: no-repeat;
            background-size: contain;
            background-position: center;
            opacity: 0.12;
            pointer-events: none;
            z-index: 0;
          }
          .card > * {
            position: relative;
            z-index: 1;
          }
          h2, h3 { margin: 24px 0 8px; color: #2f7d6b; text-transform: uppercase; font-size: 1.1rem; letter-spacing: 0.15em; }
          ul { padding: 0; list-style: none; margin: 0; }
          p, li { font-size: 1.15rem; line-height: 1.7; margin: 0; }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
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

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not recorded";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not recorded" : parsed.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not scheduled";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not scheduled" : parsed.toLocaleString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function deriveBloodType(patient: DoctorPatientRecord): string {
  const candidates = [
    patient.inventory?.finding,
    patient.inventory?.special_instruction,
    patient.inventory?.follow_up_notes,
    patient.inventory?.lab_reports?.join(" "),
  ];
  for (const entry of candidates) {
    const match = entry?.match(/\b(?:A|B|AB|O)[+-]\b/i);
    if (match?.[0]) {
      return match[0].toUpperCase();
    }
  }
  return "Pending";
}

function deriveAllergySummary(patient: DoctorPatientRecord): string {
  const candidates = [
    patient.inventory?.special_instruction,
    patient.inventory?.past_medication_history,
    patient.inventory?.follow_up_notes,
    patient.inventory?.family_history,
  ];
  for (const entry of candidates) {
    if (entry && /allerg/i.test(entry)) {
      return entry;
    }
  }
  return "Not recorded";
}

function getAppointmentTone(appointment: DoctorAppointment): "completed" | "late" | "upcoming" {
  if (appointment.status === "approved") {
    return "completed";
  }
  if (appointment.status === "rejected") {
    return "late";
  }
  return new Date(appointment.time).getTime() < Date.now() ? "late" : "upcoming";
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
  const [patientSupportDrafts, setPatientSupportDrafts] = useState<Record<number, PatientSupportDraft>>({});
  const [patientMessageDrafts, setPatientMessageDrafts] = useState<Record<number, PatientMessageDraft>>({});
  const [inventoryStatus, setInventoryStatus] = useState<Record<number, string>>({});
  const [supportStatus, setSupportStatus] = useState<Record<number, string>>({});
  const [messageStatus, setMessageStatus] = useState<Record<number, string>>({});
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
  const [showAdminInsights, setShowAdminInsights] = useState(false);
  const [newPatientStep, setNewPatientStep] = useState<IntakeStepKey>("personal");
  const [selectedPatientStep, setSelectedPatientStep] = useState<IntakeStepKey>("personal");
  const sectionRefs = useRef<Record<DashboardSection, HTMLElement | null>>({
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
    if (selectedPatientId === null) {
      return null;
    }
    return doctorPatients.find((patient) => patient.id === selectedPatientId) || null;
  }, [doctorPatients, selectedPatientId]);

  const selectedPatientMetrics = useMemo(
    () => (selectedPatient ? buildPatientMetrics(selectedPatient) : []),
    [selectedPatient]
  );

  const clinicAnalytics = useMemo(() => {
    const paidAppointments = doctorAppointments.filter((appointment) => appointment.payment_status?.toLowerCase() === "paid");
    const teleconsultations = doctorAppointments.filter((appointment) => appointment.consultation_mode?.toLowerCase().includes("tele"));
    const remindersConfigured = doctorAppointments.filter((appointment) => appointment.reminder_channel);
    const totalRevenue = paidAppointments.reduce((sum, appointment) => sum + Number(appointment.fee_amount || 0), 0);
    const preferredLanguageCount = doctorPatients.reduce<Record<string, number>>((accumulator, patient) => {
      const language = patient.inventory?.preferred_language || "English";
      accumulator[language] = (accumulator[language] || 0) + 1;
      return accumulator;
    }, {});
    const topLanguage = Object.entries(preferredLanguageCount).sort((left, right) => right[1] - left[1])[0]?.[0] || "English";
    return {
      totalRevenue,
      teleconsultations: teleconsultations.length,
      remindersConfigured: remindersConfigured.length,
      topLanguage,
    };
  }, [doctorAppointments, doctorPatients]);

  const sidebarAppointments = useMemo(
    () => (showAllSidebarAppointments ? todaysAppointments : todaysAppointments.slice(0, 6)),
    [showAllSidebarAppointments, todaysAppointments]
  );

  const visiblePatientDirectory = useMemo(
    () => (showAllPatientDirectory ? filteredDoctorPatients : filteredDoctorPatients.slice(0, 6)),
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

  const [brandPrimary, brandSecondary] = brandColors;
  const theme = {
    pageBackground: darkMode
      ? "radial-gradient(circle at 12% 14%, rgba(59, 130, 246, 0.18), transparent 32%), radial-gradient(circle at 86% 10%, rgba(14, 165, 233, 0.15), transparent 28%), linear-gradient(180deg, #07121d 0%, #0d1f2d 44%, #102538 100%)"
      : "radial-gradient(circle at 14% 14%, rgba(96, 165, 250, 0.22), transparent 32%), radial-gradient(circle at 86% 8%, rgba(56, 189, 248, 0.18), transparent 28%), linear-gradient(180deg, #f3f8ff 0%, #ebf4ff 42%, #f8fbff 100%)",
    shell: darkMode ? "rgba(11, 25, 37, 0.78)" : "rgba(255, 255, 255, 0.82)",
    shellBorder: darkMode ? "#20384b" : "#d9e5f1",
    panel: darkMode ? "rgba(12, 27, 39, 0.92)" : "rgba(255, 255, 255, 0.94)",
    panelBorder: darkMode ? "#1e3a4f" : "#d9e5f1",
    surface: darkMode ? "#102435" : "#ffffff",
    surfaceAlt: darkMode ? "#122b3f" : "#f8fbfe",
    input: darkMode ? "#0d2232" : "#f8fbff",
    text: darkMode ? "#edf6ff" : "#0f172a",
    textMuted: darkMode ? "#9fb3c8" : "#64748b",
    textSubtle: darkMode ? "#c8d7e6" : "#334155",
    accent: darkMode ? "#7dd3fc" : "#2563eb",
    accentStrong: darkMode ? "#38bdf8" : "#1d4ed8",
    accentSoft: darkMode ? "rgba(56, 189, 248, 0.16)" : "rgba(37, 99, 235, 0.08)",
    infoSoft: darkMode ? "rgba(59, 130, 246, 0.16)" : "rgba(59, 130, 246, 0.1)",
    successSoft: darkMode ? "rgba(22, 163, 74, 0.16)" : "rgba(22, 163, 74, 0.1)",
    dangerSoft: darkMode ? "rgba(220, 38, 38, 0.16)" : "rgba(220, 38, 38, 0.1)",
    success: "#16a34a",
    danger: "#dc2626",
  } as const;

  const panelStyle: CSSProperties = {
    borderColor: theme.panelBorder,
    backgroundColor: theme.panel,
    backdropFilter: "blur(18px)",
    boxShadow: darkMode ? "0 24px 60px rgba(2, 8, 23, 0.34)" : "0 24px 60px rgba(15, 23, 42, 0.08)"
  };

  const surfaceStyle: CSSProperties = {
    borderColor: theme.panelBorder,
    backgroundColor: theme.surface
  };

  const mutedSurfaceStyle: CSSProperties = {
    borderColor: theme.panelBorder,
    backgroundColor: theme.surfaceAlt
  };

  const inputStyle: CSSProperties = {
    borderColor: theme.panelBorder,
    backgroundColor: theme.input,
    color: theme.text
  };

  const primaryButtonStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${theme.accentStrong}, ${brandPrimary})`,
    color: "#ffffff"
  };

  const secondaryButtonStyle: CSSProperties = {
    borderColor: theme.panelBorder,
    backgroundColor: theme.surface,
    color: theme.textSubtle
  };

  const dashboardStats = [
    { label: "Total Patients", value: String(doctorPatients.length), icon: Users, detail: "Active clinical records" },
    { label: "Appointments", value: String(doctorAppointments.length), icon: CalendarClock, detail: "Booked consultations" },
    { label: "Reminder Ready", value: String(clinicAnalytics.remindersConfigured), icon: ClipboardPenLine, detail: "Follow-ups prepared" },
    { label: "Teleconsults", value: String(clinicAnalytics.teleconsultations), icon: Pill, detail: "Virtual consultations" }
  ];

  const sectionNavItems = [
    { label: "Overview", icon: Stethoscope, section: "overview" as const },
    { label: "Patient Records", icon: Users, section: "patient-records" as const },
    { label: "Appointments", icon: CalendarClock, section: "appointments" as const },
    { label: "Observations", icon: ClipboardPenLine, section: "observations" as const }
  ];

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
    setPatientSupportDrafts((previous) => {
      const next = { ...previous };
      for (const patient of doctorPatients) {
        if (!next[patient.id]) {
          next[patient.id] = buildPatientSupportDraft(patient);
        }
      }
      return next;
    });
  }, [doctorPatients]);

  useEffect(() => {
    setPatientMessageDrafts((previous) => {
      const next = { ...previous };
      for (const patient of doctorPatients) {
        const supportDraft = patientSupportDrafts[patient.id] || buildPatientSupportDraft(patient);
        if (!next[patient.id]) {
          next[patient.id] = buildMessageDraft(patient, supportDraft, patient.inventory?.follow_up_notes || "");
        }
      }
      return next;
    });
  }, [doctorPatients, patientSupportDrafts]);

  useEffect(() => {
    if (selectedPatientId && !doctorPatients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(null);
    }
  }, [doctorPatients, selectedPatientId]);

  useEffect(() => {
    setSelectedPatientStep("personal");
  }, [selectedPatientId]);

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
          end_date: prescriptionDraft.endDate || undefined,
          printable_notes: doctorObservations || undefined,
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

  function updatePatientSupportDraft(patientId: number, field: keyof PatientSupportDraft, value: string) {
    setPatientSupportDrafts((previous) => ({
      ...previous,
      [patientId]: {
        ...(previous[patientId] || createEmptyPatientSupportDraft()),
        [field]: value,
      },
    }));
  }

  function updatePatientMessageDraft(patientId: number, field: keyof PatientMessageDraft, value: string) {
    setPatientMessageDrafts((previous) => ({
      ...previous,
      [patientId]: {
        ...(previous[patientId] || { subject: "", body: "", channel: "whatsapp" }),
        [field]: value,
      },
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
          diet_plan: newPatientDraft.dietPlan.trim() || undefined,
          pathya: newPatientDraft.pathya.trim() || undefined,
          apathya: newPatientDraft.apathya.trim() || undefined,
          lab_reports: linesToItems(newPatientDraft.labReports),
          document_vault: linesToItems(newPatientDraft.documentVault),
          preferred_language: newPatientDraft.preferredLanguage.trim() || undefined,
          follow_up_notes: newPatientDraft.followUpNotes.trim() || undefined,
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
      setPatientSupportDrafts((previous) => ({
        ...previous,
        [createdPatient.id]: createEmptyPatientSupportDraft(),
      }));
      setNewPatientDraft(createEmptyNewPatientDraft());
      setNewPatientStep("personal");
      setNewPatientPincodeStatus("");
      setPatientSearchInput(createdPatient.full_name);
      setPatientSearchQuery(createdPatient.full_name);
      setSelectedPatientId(createdPatient.id);
      setNewPatientStatus("Patient inventory created.");
    } catch (error: any) {
      let msg = "Unable to create patient inventory.";
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
      }
      setNewPatientStatus(msg);
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
          diet_plan: draft.dietPlan || undefined,
          pathya: draft.pathya || undefined,
          apathya: draft.apathya || undefined,
          lab_reports: linesToItems(draft.labReports),
          document_vault: linesToItems(draft.documentVault),
          preferred_language: draft.preferredLanguage || undefined,
          follow_up_notes: draft.followUpNotes || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setDoctorPatients((previous) =>
        previous.map((patient) => (patient.id === patientId ? { ...patient, inventory: data } : patient))
      );
      setInventoryStatus((previous) => ({ ...previous, [patientId]: "Inventory saved." }));
    } catch (error: any) {
      let msg = "Unable to save inventory.";
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
      }
      setInventoryStatus((previous) => ({
        ...previous,
        [patientId]: msg,
      }));
    }
  }

  async function savePatientSupportDetails(patientId: number) {
    if (!authToken || !isDoctor) {
      return;
    }
    const draft = patientSupportDrafts[patientId];
    const latestAppointment = doctorPatients.find((patient) => patient.id === patientId)?.appointment_history?.[0];
    if (!draft || !latestAppointment?.id) {
      setSupportStatus((previous) => ({ ...previous, [patientId]: "Create or receive an appointment before saving support details." }));
      return;
    }
    setSupportStatus((previous) => ({ ...previous, [patientId]: "Saving support details..." }));
    try {
      const followUpDateTime =
        draft.followUpDate
          ? `${draft.followUpDate}T${draft.followUpTime || "10:00"}:00`
          : undefined;
      await api.patch(
        `/doctor-tenant/appointments/${latestAppointment.id}/details`,
        {
          consultation_mode: draft.consultationMode || undefined,
          teleconsultation_link: draft.teleconsultationLink || undefined,
          follow_up_date: followUpDateTime || undefined,
          reminder_channel: draft.reminderChannel || undefined,
          fee_amount: draft.feeAmount || undefined,
          receipt_number: draft.receiptNumber || undefined,
          payment_status: draft.paymentStatus || undefined,
          payment_notes: draft.paymentNotes || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const patientsPath = `/patients/doctor/${effectiveDoctorId}/records`;
      const { data } = await api.get(patientsPath, { headers: { Authorization: `Bearer ${authToken}` } });
      setDoctorPatients(data as DoctorPatientRecord[]);
      setSupportStatus((previous) => ({ ...previous, [patientId]: "Support details saved." }));
    } catch (error: any) {
      setSupportStatus((previous) => ({
        ...previous,
        [patientId]: String(error?.response?.data?.detail ?? "Unable to save support details."),
      }));
    }
  }

  async function bookFollowUp(patientId: number) {
    if (!authToken || !isDoctor) {
      return;
    }
    const draft = patientSupportDrafts[patientId];
    if (!draft?.followUpDate) {
      setSupportStatus((previous) => ({ ...previous, [patientId]: "Choose a follow-up date first." }));
      return;
    }
    setSupportStatus((previous) => ({ ...previous, [patientId]: "Booking follow-up..." }));
    try {
      await api.post(
        `/doctor-tenant/patients/${patientId}/follow-up`,
        {
          time: `${draft.followUpDate}T${draft.followUpTime || "10:00"}:00`,
          notes: inventoryDrafts[patientId]?.followUpNotes || undefined,
          consultation_mode: draft.consultationMode || undefined,
          teleconsultation_link: draft.teleconsultationLink || undefined,
          reminder_channel: draft.reminderChannel || undefined,
          fee_amount: draft.feeAmount || undefined,
          receipt_number: draft.receiptNumber || undefined,
          payment_status: draft.paymentStatus || undefined,
          payment_notes: draft.paymentNotes || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const [appointmentsRes, patientsRes] = await Promise.all([
        api.get("/doctor-tenant/appointments", { headers: { Authorization: `Bearer ${authToken}` } }),
        api.get(`/patients/doctor/${effectiveDoctorId}/records`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      setDoctorAppointments(appointmentsRes.data as DoctorAppointment[]);
      setDoctorPatients(patientsRes.data as DoctorPatientRecord[]);
      setSupportStatus((previous) => ({ ...previous, [patientId]: "Follow-up booked." }));
    } catch (error: any) {
      setSupportStatus((previous) => ({
        ...previous,
        [patientId]: String(error?.response?.data?.detail ?? "Unable to book follow-up."),
      }));
    }
  }

  function openReminder(patient: DoctorPatientRecord, channel: "whatsapp" | "sms") {
    const draft = patientSupportDrafts[patient.id] || createEmptyPatientSupportDraft();
    const composedMessage = patientMessageDrafts[patient.id]?.body || buildReminderMessage(patient, draft, inventoryDrafts[patient.id]?.followUpNotes || "");
    const message = encodeURIComponent(composedMessage);
    const phone = (patient.phone || "").replace(/[^\d+]/g, "");
    const url = channel === "whatsapp"
      ? `https://wa.me/${phone.replace(/^\+/, "")}?text=${message}`
      : `sms:${phone}?&body=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyPatientMessage(patientId: number) {
    const body = patientMessageDrafts[patientId]?.body;
    if (!body) {
      setMessageStatus((previous) => ({ ...previous, [patientId]: "Write a message first." }));
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      setMessageStatus((previous) => ({ ...previous, [patientId]: "Message copied." }));
    } catch {
      setMessageStatus((previous) => ({ ...previous, [patientId]: "Copy failed. Please try again." }));
    }
  }

  function sendPatientMessage(patient: DoctorPatientRecord) {
    const draft = patientMessageDrafts[patient.id];
    const channel = draft?.channel || "whatsapp";
    if (!draft?.body.trim()) {
      setMessageStatus((previous) => ({ ...previous, [patient.id]: "Message body is empty." }));
      return;
    }
    openReminder(patient, channel);
    setMessageStatus((previous) => ({ ...previous, [patient.id]: `Opened ${channel === "whatsapp" ? "WhatsApp" : "SMS"} composer.` }));
  }

  function printPrescriptionPdf(patient: DoctorPatientRecord) {
    const latestPrescription = patient.prescriptions?.[0];
    const inventory = patient.inventory;
    openPrintWindow(
      `${patient.full_name} Prescription`,
      `
        <h1>Arogya Ashram Prescription</h1>
        <p class="muted">Patient: ${patient.full_name} | Generated: ${new Date().toLocaleString()}</p>
        <div class="card">
          <h3>Diagnosis</h3>
          <p>${latestPrescription?.diagnosis || inventory?.diagnosis || "-"}</p>
          <h3>Medicines</h3>
          <ul>${(latestPrescription?.drug_names || []).map((drug) => `<li>${drug}</li>`).join("") || "<li>-</li>"}</ul>
          <h3>Instructions</h3>
          <p>${latestPrescription?.instructions || inventory?.special_instruction || "-"}</p>
          <h3>Diet Advice</h3>
          <p>${inventory?.diet_plan || "-"}</p>
          <h3>Pathya</h3>
          <p>${inventory?.pathya || "-"}</p>
          <h3>Apathya</h3>
          <p>${inventory?.apathya || "-"}</p>
        </div>
      `,
      logo
    );
  }

  function printReceipt(patient: DoctorPatientRecord) {
    const draft = patientSupportDrafts[patient.id] || createEmptyPatientSupportDraft();
    openPrintWindow(
      `${patient.full_name} Receipt`,
      `
        <h1>Arogya Ashram Receipt</h1>
        <p class="muted">Receipt No: ${draft.receiptNumber || "Pending"} | Date: ${new Date().toLocaleDateString()}</p>
        <div class="card">
          <h3>Patient</h3>
          <p>${patient.full_name}</p>
          <h3>Consultation Mode</h3>
          <p>${draft.consultationMode || "-"}</p>
          <h3>Amount</h3>
          <p>${draft.feeAmount || "-"}</p>
          <h3>Payment Status</h3>
          <p>${draft.paymentStatus || "-"}</p>
          <h3>Notes</h3>
          <p>${draft.paymentNotes || "-"}</p>
        </div>
      `,
      logo
    );
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
      setPatientSupportDrafts((previous) => {
        const next = { ...previous };
        delete next[patientId];
        return next;
      });
      setSupportStatus((previous) => {
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
                onTouchEnd={() => openPatientFromSearch(patient)}
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

  function moveStep(current: IntakeStepKey, direction: -1 | 1, setter: (step: IntakeStepKey) => void) {
    const currentIndex = INTAKE_STEPS.findIndex((step) => step.key === current);
    const nextStep = INTAKE_STEPS[currentIndex + direction];
    if (nextStep) {
      setter(nextStep.key);
    }
  }

  function renderField(label: string, child: ReactNode, hint?: string, className = "") {
    return (
      <label className={`flex flex-col gap-2 ${className}`.trim()}>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
          {label}
        </span>
        {child}
        {hint ? (
          <span className="text-xs leading-5" style={{ color: theme.textMuted }}>
            {hint}
          </span>
        ) : null}
      </label>
    );
  }

  function renderVoiceTextArea({
    label,
    value,
    onChange,
    placeholder,
    className = "",
    minHeight = 132,
    hint,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
    minHeight?: number;
    hint?: string;
  }) {
    return renderField(
      label,
      <div className="relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 pr-12 text-sm leading-6 ${className}`.trim()}
          style={{ ...inputStyle, minHeight }}
          placeholder={placeholder}
        />
        <span
          className="absolute right-3 top-3 rounded-full border px-2 py-1 text-xs"
          style={{ borderColor: theme.panelBorder, backgroundColor: theme.surfaceAlt, color: theme.textMuted }}
          title="Voice-to-text ready"
        >
          🎙️
        </span>
      </div>,
      hint
    );
  }

  function renderStepperTabs(activeStep: IntakeStepKey, setStep: (step: IntakeStepKey) => void) {
    return (
      <div className="grid gap-2 md:grid-cols-4">
        {INTAKE_STEPS.map((step, index) => {
          const isActive = activeStep === step.key;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setStep(step.key)}
              className="rounded-[22px] border px-4 py-3 text-left transition"
              style={{
                borderColor: isActive ? theme.accentStrong : theme.panelBorder,
                backgroundColor: isActive ? theme.accentSoft : theme.surfaceAlt,
                color: theme.text,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: isActive ? theme.accentStrong : theme.surface,
                    color: isActive ? "#ffffff" : theme.textMuted,
                  }}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{step.label}</p>
                  <p className="truncate text-xs" style={{ color: isActive ? theme.textSubtle : theme.textMuted }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderNewPatientStepContent() {
    if (newPatientStep === "personal") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {renderField("Patient Name", <input value={newPatientDraft.fullName} onChange={(event) => updateNewPatientDraft("fullName", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Full name" required />)}
          {renderField("Phone", <input value={newPatientDraft.phone} onChange={(event) => updateNewPatientDraft("phone", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Phone number" />)}
          {renderField("Age", <input value={newPatientDraft.age} onChange={(event) => updateNewPatientDraft("age", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Age" inputMode="numeric" />)}
          {renderField("Email", <input value={newPatientDraft.email} onChange={(event) => updateNewPatientDraft("email", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Email address" />)}
          {renderField("Gender", <input value={newPatientDraft.gender} onChange={(event) => updateNewPatientDraft("gender", event.target.value)} list="gender-options" className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Search gender" />)}
          {renderField("Religion", <input value={newPatientDraft.religion} onChange={(event) => updateNewPatientDraft("religion", event.target.value)} list="religion-options" className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Search religion" />)}
          {renderField("Date of Birth", <input value={newPatientDraft.dateOfBirth} onChange={(event) => updateNewPatientDraft("dateOfBirth", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} type="date" />)}
          {renderField("Preferred Language", <input value={newPatientDraft.preferredLanguage} onChange={(event) => updateNewPatientDraft("preferredLanguage", event.target.value)} list="language-options" className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Search language" />)}
          {renderField("Address", <input value={newPatientDraft.localAddress} onChange={(event) => updateNewPatientDraft("localAddress", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Street / locality" />, undefined, "md:col-span-2 xl:col-span-4")}
          <div className="grid gap-4 md:col-span-2 xl:col-span-4 md:grid-cols-3">
            {renderField("City", <input value={newPatientDraft.city} onChange={(event) => updateNewPatientDraft("city", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="City" />)}
            {renderField("State", <input value={newPatientDraft.state} onChange={(event) => updateNewPatientDraft("state", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="State" />)}
            {renderField("Pincode", <input value={newPatientDraft.pincode} onChange={(event) => void resolveNewPatientPincode(event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Pincode" />)}
          </div>
          {newPatientPincodeStatus ? (
            <p className="text-xs font-semibold md:col-span-2 xl:col-span-4" style={{ color: "#c2410c" }}>
              {newPatientPincodeStatus}
            </p>
          ) : null}
        </div>
      );
    }

    if (newPatientStep === "symptoms") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderVoiceTextArea({
            label: "Presenting Complaints",
            value: newPatientDraft.presentingComplaints,
            onChange: (value) => updateNewPatientDraft("presentingComplaints", value),
            placeholder: "Record chief complaint and symptom narrative",
          })}
          {renderField(
            "ICD-10 Search",
            <input
              value={newPatientDraft.diagnosis}
              onChange={(event) => updateNewPatientDraft("diagnosis", event.target.value)}
              list="icd10-options"
              className="rounded-2xl border px-4 py-3 text-sm"
              style={inputStyle}
              placeholder="Search standardized diagnosis"
            />,
            "Auto-suggests standardized diagnosis labels."
          )}
          {renderField("Investigations", <textarea value={newPatientDraft.investigation} onChange={(event) => updateNewPatientDraft("investigation", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Investigations ordered or reviewed" />)}
          {renderField("Findings / Vitals Summary", <textarea value={newPatientDraft.finding} onChange={(event) => updateNewPatientDraft("finding", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Clinical findings or initial vital summary" />)}
        </div>
      );
    }

    if (newPatientStep === "treatment") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderField("Investigation Date", <input value={newPatientDraft.investigationDate} onChange={(event) => updateNewPatientDraft("investigationDate", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} type="date" />)}
          {renderField("Finding Date", <input value={newPatientDraft.findingDate} onChange={(event) => updateNewPatientDraft("findingDate", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} type="date" />)}
          {renderField("Prescription", <textarea value={newPatientDraft.prescription} onChange={(event) => updateNewPatientDraft("prescription", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Medicines and treatment plan" />)}
          {renderVoiceTextArea({
            label: "Clinical Notes",
            value: newPatientDraft.specialInstruction,
            onChange: (value) => updateNewPatientDraft("specialInstruction", value),
            placeholder: "Notes, precautions, and care instructions",
          })}
          {renderField("Diet Plan", <textarea value={newPatientDraft.dietPlan} onChange={(event) => updateNewPatientDraft("dietPlan", event.target.value)} className="min-h-[118px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Diet or ahar advice" />)}
          {renderField("Follow-up Notes", <textarea value={newPatientDraft.followUpNotes} onChange={(event) => updateNewPatientDraft("followUpNotes", event.target.value)} className="min-h-[118px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Follow-up timing and revisit plan" />)}
          {renderField("Pathya", <textarea value={newPatientDraft.pathya} onChange={(event) => updateNewPatientDraft("pathya", event.target.value)} className="min-h-[112px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Recommended regimen" />)}
          {renderField("Apathya", <textarea value={newPatientDraft.apathya} onChange={(event) => updateNewPatientDraft("apathya", event.target.value)} className="min-h-[112px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Avoid / contraindications" />)}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {renderField("Family History", <textarea value={newPatientDraft.familyHistory} onChange={(event) => updateNewPatientDraft("familyHistory", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Family history notes" />)}
        {renderField("Past Medical History", <textarea value={newPatientDraft.pastMedicationHistory} onChange={(event) => updateNewPatientDraft("pastMedicationHistory", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Past medical and medication history" />)}
        {renderVoiceTextArea({
          label: "Surgical History",
          value: newPatientDraft.surgicalHistory,
          onChange: (value) => updateNewPatientDraft("surgicalHistory", value),
          placeholder: "Past surgeries, procedures, and recovery notes",
        })}
        {renderField("Lab Reports", <textarea value={newPatientDraft.labReports} onChange={(event) => updateNewPatientDraft("labReports", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="One lab report per line" />)}
        {renderField("Document Vault", <textarea value={newPatientDraft.documentVault} onChange={(event) => updateNewPatientDraft("documentVault", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Shared files or supporting documents" />, undefined, "md:col-span-2")}
      </div>
    );
  }

  function renderSelectedPatientStepContent() {
    if (!selectedPatient) {
      return null;
    }

    const draft = inventoryDrafts[selectedPatient.id] || createEmptyInventoryDraft();
    if (selectedPatientStep === "personal") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {renderField("Patient Name", <input value={selectedPatient.full_name} readOnly className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />)}
          {renderField("Phone", <input value={selectedPatient.phone || "-"} readOnly className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />)}
          {renderField("Age", <input value={calculateAge(selectedPatient.date_of_birth)} readOnly className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />)}
          {renderField("Gender", <input value={selectedPatient.gender || "Not recorded"} readOnly className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />)}
          {renderField("Religion", <input value={draft.religion} onChange={(event) => updateInventoryDraft(selectedPatient.id, "religion", event.target.value)} list="religion-options" className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Search religion" />)}
          {renderField("Preferred Language", <input value={draft.preferredLanguage} onChange={(event) => updateInventoryDraft(selectedPatient.id, "preferredLanguage", event.target.value)} list="language-options" className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Search language" />)}
          {renderField("Address", <input value={selectedPatient.local_address || selectedPatient.address || "Not recorded"} readOnly className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />, "Demographics are currently read-only from this workspace.", "md:col-span-2 xl:col-span-4")}
        </div>
      );
    }

    if (selectedPatientStep === "symptoms") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderVoiceTextArea({
            label: "Presenting Complaints",
            value: draft.presentingComplaints,
            onChange: (value) => updateInventoryDraft(selectedPatient.id, "presentingComplaints", value),
            placeholder: "Current complaint narrative",
          })}
          {renderField(
            "ICD-10 Search",
            <input
              value={draft.diagnosis}
              onChange={(event) => updateInventoryDraft(selectedPatient.id, "diagnosis", event.target.value)}
              list="icd10-options"
              className="rounded-2xl border px-4 py-3 text-sm"
              style={inputStyle}
              placeholder="Search standardized diagnosis"
            />,
            "Use a coded diagnosis for cleaner downstream documentation."
          )}
          {renderField("Investigations", <textarea value={draft.investigation} onChange={(event) => updateInventoryDraft(selectedPatient.id, "investigation", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Investigations and tests" />)}
          {renderField("Vitals / Findings", <textarea value={draft.finding} onChange={(event) => updateInventoryDraft(selectedPatient.id, "finding", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Vitals and notable findings" />)}
        </div>
      );
    }

    if (selectedPatientStep === "treatment") {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {renderField("Investigation Date", <input value={draft.investigationDate} onChange={(event) => updateInventoryDraft(selectedPatient.id, "investigationDate", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} type="date" />)}
          {renderField("Finding Date", <input value={draft.findingDate} onChange={(event) => updateInventoryDraft(selectedPatient.id, "findingDate", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} type="date" />)}
          {renderField("Prescription", <textarea value={draft.prescription} onChange={(event) => updateInventoryDraft(selectedPatient.id, "prescription", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Prescription and regimen" />)}
          {renderVoiceTextArea({
            label: "Clinical Notes",
            value: draft.specialInstruction,
            onChange: (value) => {
              updateInventoryDraft(selectedPatient.id, "specialInstruction", value);
              setDoctorObservations(value);
            },
            placeholder: "Clinical notes and cautions",
          })}
          {renderField("Diet Plan", <textarea value={draft.dietPlan} onChange={(event) => updateInventoryDraft(selectedPatient.id, "dietPlan", event.target.value)} className="min-h-[118px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Diet plan / ahar advice" />)}
          {renderField("Follow-up Notes", <textarea value={draft.followUpNotes} onChange={(event) => updateInventoryDraft(selectedPatient.id, "followUpNotes", event.target.value)} className="min-h-[118px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Follow-up plan and revisit notes" />)}
          {renderField("Pathya", <textarea value={draft.pathya} onChange={(event) => updateInventoryDraft(selectedPatient.id, "pathya", event.target.value)} className="min-h-[112px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Recommended" />)}
          {renderField("Apathya", <textarea value={draft.apathya} onChange={(event) => updateInventoryDraft(selectedPatient.id, "apathya", event.target.value)} className="min-h-[112px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Avoid" />)}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {renderField("Family History", <textarea value={draft.familyHistory} onChange={(event) => updateInventoryDraft(selectedPatient.id, "familyHistory", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Family history notes" />)}
        {renderField("Past Medical History", <textarea value={draft.pastMedicationHistory} onChange={(event) => updateInventoryDraft(selectedPatient.id, "pastMedicationHistory", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Past medical and medication history" />)}
        {renderVoiceTextArea({
          label: "Surgical History",
          value: draft.surgicalHistory,
          onChange: (value) => updateInventoryDraft(selectedPatient.id, "surgicalHistory", value),
          placeholder: "Surgical and procedure history",
        })}
        {renderField("Lab Reports", <textarea value={draft.labReports} onChange={(event) => updateInventoryDraft(selectedPatient.id, "labReports", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="One lab report per line" />)}
        {renderField("Document Vault", <textarea value={draft.documentVault} onChange={(event) => updateInventoryDraft(selectedPatient.id, "documentVault", event.target.value)} className="min-h-[132px] rounded-2xl border px-4 py-3 text-sm leading-6" style={inputStyle} placeholder="Shared files and documents" />, undefined, "md:col-span-2")}
      </div>
    );
  }

  function openPatientWorkspace(patientId: number, section: DashboardSection, step?: IntakeStepKey) {
    setSelectedPatientId(patientId);
    if (step) {
      setSelectedPatientStep(step);
    }
    window.setTimeout(() => scrollToSection(section), 40);
  }

  const selectedPatientAllergySummary = selectedPatient ? deriveAllergySummary(selectedPatient) : "Not recorded";
  const selectedPatientBloodType = selectedPatient ? deriveBloodType(selectedPatient) : "Pending";
  const latestSelectedAppointment = selectedPatient?.appointment_history?.[0];

  function renderRedesignedDashboard() {
    return (
      <PageFade className="min-h-screen pb-10" style={{ background: theme.pageBackground }}>
        <header
          className="sticky top-0 z-40 border-b backdrop-blur-xl"
          style={{ borderColor: theme.shellBorder, backgroundColor: theme.shell }}
        >
          <div className="mx-auto grid max-w-[1800px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[auto_minmax(340px,1fr)_auto] xl:items-center xl:px-8 2xl:px-10">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                style={{
                  borderColor: theme.shellBorder,
                  background: `linear-gradient(135deg, ${theme.accentSoft}, rgba(255,255,255,0.06))`,
                }}
              >
                {logo ? <img src={logo} alt={doctorName} className="h-10 w-10 rounded-xl object-cover" /> : <Leaf className="h-5 w-5" style={{ color: theme.accent }} />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold tracking-tight" style={{ color: theme.text }}>
                  {doctorName}
                </p>
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  {selectedPatient ? "Active Patient Workspace" : "Clinical Dashboard"}
                </p>
              </div>
            </div>

            <div ref={patientSearchRef} className="flex w-full gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: theme.textMuted }} />
                <input
                  ref={patientSearchInputRef}
                  value={patientSearchInput}
                  onChange={(event) => {
                    setPatientSearchInput(event.target.value);
                    setShowPatientPicker(true);
                  }}
                  onFocus={() => setShowPatientPicker(true)}
                  className="w-full rounded-2xl border py-3 pl-10 pr-4 text-sm"
                  style={inputStyle}
                  placeholder="Find patient by name, ID, phone, or address"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setPatientSearchQuery(patientSearchInput);
                  setShowPatientPicker(true);
                }}
                className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
                style={primaryButtonStyle}
              >
                Search
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link to={`/clinic/${id}`} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                Back to Website
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((value) => !value)}
                  className="rounded-2xl border p-2.5"
                  style={secondaryButtonStyle}
                  aria-label="Open profile menu"
                >
                  <UserRound className="h-5 w-5" />
                </button>
                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-3xl border p-4 shadow-2xl" style={panelStyle}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                      Signed in as
                    </p>
                    <p className="mt-2 text-sm font-bold capitalize" style={{ color: theme.text }}>
                      {isAdmin ? "admin" : "doctor"}
                    </p>
                    <InteractiveLogoutButton
                      onClick={signOut}
                      className="mt-3 w-full"
                      style={{
                        "--logout-bg": darkMode ? "#173243" : "#eff6ff",
                        "--logout-text": darkMode ? "#eaf5f9" : "#163b35",
                        "--logout-door": darkMode ? "#63b8d8" : "#2563eb",
                        "--logout-figure": darkMode ? "#d9c07a" : "#2563eb",
                        "--logout-shadow": darkMode ? "rgba(8, 20, 30, 0.42)" : "rgba(47, 121, 189, 0.18)",
                      } as CSSProperties}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(220px,15%)_minmax(0,1fr)_minmax(320px,25%)] xl:items-start">
            <aside className="space-y-5 xl:sticky xl:top-24">
              <div className="rounded-[30px] border p-5" style={panelStyle}>
                <div
                  className="rounded-[26px] border p-5"
                  style={{
                    ...mutedSurfaceStyle,
                    background: darkMode
                      ? `linear-gradient(160deg, rgba(56, 189, 248, 0.14), rgba(10, 25, 38, 0.96) 62%)`
                      : `linear-gradient(160deg, rgba(37, 99, 235, 0.1), rgba(255, 255, 255, 0.98) 60%)`,
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accentStrong }}>
                    Clinical Workspace
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                    {selectedPatient ? "Chart Open" : "Dashboard Ready"}
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    {selectedPatient
                      ? `Working in ${selectedPatient.full_name}'s active workspace.`
                      : "Select a patient to open the persistent snapshot and focused charting workspace."}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {sectionNavItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => scrollToSection(item.section)}
                      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: activeSection === item.section ? theme.accentStrong : theme.panelBorder,
                        backgroundColor: activeSection === item.section ? theme.accentSoft : theme.surface,
                        color: theme.text,
                      }}
                    >
                      <item.icon className="h-4 w-4" style={{ color: theme.accent }} />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-[24px] border p-4" style={surfaceStyle}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: theme.text }}>
                        Dark Mode
                      </p>
                      <p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>
                        Reduce glare for longer charting sessions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDarkMode((value) => !value)}
                      className="relative h-7 w-14 rounded-full border transition"
                      style={{ borderColor: theme.panelBorder, backgroundColor: darkMode ? theme.accentStrong : theme.surfaceAlt }}
                      aria-label="Toggle dark mode"
                    >
                      <span
                        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition"
                        style={{ left: darkMode ? "calc(100% - 1.5rem)" : "0.25rem" }}
                      />
                    </button>
                  </div>
                  {selectedPatient ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientId(null);
                        setPatientSearchInput("");
                        setPatientSearchQuery("");
                      }}
                      className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                      style={secondaryButtonStyle}
                    >
                      Return to Main Dashboard
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[30px] border p-5" style={panelStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: theme.text }}>
                      Today&apos;s Schedule
                    </p>
                    <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                      Compact patient flow with live status badges.
                    </p>
                  </div>
                  <CalendarClock className="h-5 w-5" style={{ color: theme.accent }} />
                </div>

                <div className="mt-4 space-y-3">
                  {sidebarAppointments.length === 0 ? (
                    <div className="rounded-2xl border px-4 py-4 text-sm" style={mutedSurfaceStyle}>
                      <span style={{ color: theme.textMuted }}>No appointments scheduled for today.</span>
                    </div>
                  ) : (
                    sidebarAppointments.map((appointment) => {
                      const tone = getAppointmentTone(appointment);
                      const badgeLabel = tone === "completed" ? "Completed" : tone === "late" ? "Late" : "Upcoming";
                      const badgeStyle =
                        tone === "completed"
                          ? { backgroundColor: theme.successSoft, color: theme.success }
                          : tone === "late"
                            ? { backgroundColor: theme.dangerSoft, color: theme.danger }
                            : { backgroundColor: theme.infoSoft, color: theme.accentStrong };

                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => setSelectedPatientId(appointment.patient_id)}
                          className="w-full rounded-2xl border px-4 py-3 text-left"
                          style={mutedSurfaceStyle}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold" style={{ color: theme.text }}>
                                {appointment.patient_name}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                                {new Date(appointment.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={badgeStyle}>
                              {badgeLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {todaysAppointments.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSidebarAppointments((value) => !value)}
                    className="mt-4 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                    style={secondaryButtonStyle}
                  >
                    {showAllSidebarAppointments ? "Show less" : `Show ${todaysAppointments.length - 6} more`}
                  </button>
                ) : null}
              </div>
            </aside>

            <div className="min-w-0 space-y-6">
              {!selectedPatient ? (
                <>
                  <section
                    ref={(node) => {
                      sectionRefs.current.overview = node;
                    }}
                    className="rounded-[32px] border p-6 sm:p-8"
                    style={panelStyle}
                  >
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accentStrong }}>
                        Overview
                      </p>
                      <MotionText
                        as="h2"
                        text="A faster three-pane dashboard built for clinical scanning"
                        className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
                      />
                      <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: theme.textMuted }}>
                        The workspace now keeps navigation, schedule, directory, and patient context visible at once so clinicians spend less time hunting through long vertical cards.
                      </p>
                    </motion.div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {dashboardStats.map((stat) => (
                        <div key={stat.label} className="rounded-[24px] border p-4" style={surfaceStyle}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                                {stat.label}
                              </p>
                              <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                                {stat.value}
                              </p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.accentSoft }}>
                              <stat.icon className="h-4 w-4" style={{ color: theme.accentStrong }} />
                            </div>
                          </div>
                          <p className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
                            {stat.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[26px] border p-4" style={surfaceStyle}>
                      <button
                        type="button"
                        onClick={() => setShowAdminInsights((value) => !value)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: theme.text }}>
                            Administrative Insights
                          </p>
                          <p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>
                            Revenue and language distribution stay available without competing with clinical metrics.
                          </p>
                        </div>
                        <span className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]" style={secondaryButtonStyle}>
                          {showAdminInsights ? "Hide" : "Show"}
                        </span>
                      </button>
                      {showAdminInsights ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border p-4" style={mutedSurfaceStyle}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                              Revenue
                            </p>
                            <p className="mt-2 text-xl font-semibold" style={{ color: theme.text }}>
                              Rs {clinicAnalytics.totalRevenue.toFixed(0)}
                            </p>
                          </div>
                          <div className="rounded-2xl border p-4" style={mutedSurfaceStyle}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                              Top Language
                            </p>
                            <p className="mt-2 text-xl font-semibold" style={{ color: theme.text }}>
                              {clinicAnalytics.topLanguage}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section
                    ref={(node) => {
                      sectionRefs.current["patient-records"] = node;
                    }}
                    className="rounded-[32px] border p-6"
                    style={panelStyle}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xl font-semibold" style={{ color: theme.text }}>
                          Patient Directory
                        </p>
                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          Bolder patient hierarchy, tighter rows, and quick chart actions built for clinic speed.
                        </p>
                      </div>
                      <div className="rounded-2xl border px-4 py-3 text-sm" style={mutedSurfaceStyle}>
                        <p className="font-semibold" style={{ color: theme.text }}>
                          {filteredDoctorPatients.length} visible patient{filteredDoctorPatients.length === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1" style={{ color: theme.textMuted }}>
                          {patientSearchQuery.trim() ? `Filtered by "${patientSearchQuery}"` : "Showing full directory"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-[26px] border" style={surfaceStyle}>
                      <div className="hidden grid-cols-[1.45fr_0.75fr_1fr_0.95fr_0.95fr] gap-4 border-b px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] md:grid" style={{ borderColor: theme.panelBorder, color: theme.textMuted }}>
                        <span>Patient</span>
                        <span>ID</span>
                        <span>Contact</span>
                        <span>Last Visit</span>
                        <span>Actions</span>
                      </div>
                      <div className="divide-y" style={{ borderColor: theme.panelBorder }}>
                        {visiblePatientDirectory.length === 0 ? (
                          <div className="px-5 py-8 text-sm" style={{ color: theme.textMuted }}>
                            No patient records found.
                          </div>
                        ) : (
                          visiblePatientDirectory.map((patient, index) => (
                            <div
                              key={patient.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedPatientId(patient.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  setSelectedPatientId(patient.id);
                                }
                              }}
                              className="grid gap-4 px-5 py-4 transition md:grid-cols-[1.45fr_0.75fr_1fr_0.95fr_0.95fr]"
                              style={{
                                backgroundColor: selectedPatientId === patient.id ? theme.accentSoft : index % 2 === 0 ? theme.surface : theme.surfaceAlt,
                                boxShadow: selectedPatientId === patient.id ? `inset 3px 0 0 ${theme.accentStrong}` : "none",
                              }}
                            >
                              <div>
                                <p className="text-base font-bold tracking-tight" style={{ color: theme.text }}>
                                  {patient.full_name}
                                </p>
                                <p className="mt-1 text-xs md:hidden" style={{ color: theme.textMuted }}>
                                  Patient #{patient.id}
                                </p>
                              </div>
                              <div className="hidden text-sm font-semibold md:block" style={{ color: theme.textSubtle }}>
                                #{patient.id}
                              </div>
                              <div className="text-sm" style={{ color: theme.textSubtle }}>
                                {patient.phone || patient.email || "-"}
                              </div>
                              <div className="text-sm" style={{ color: theme.textSubtle }}>
                                {patient.appointment_history?.[0]?.time
                                  ? new Date(patient.appointment_history[0].time).toLocaleDateString()
                                  : patient.appointment_history?.[0]?.created_at
                                    ? new Date(patient.appointment_history[0].created_at).toLocaleDateString()
                                    : "New"}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedPatientId(patient.id);
                                    printPrescriptionPdf(patient);
                                  }}
                                  className="rounded-xl border px-2.5 py-2 text-sm"
                                  style={secondaryButtonStyle}
                                  title="View Last Rx"
                                >
                                  📄
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPatientWorkspace(patient.id, "observations", "treatment");
                                  }}
                                  className="rounded-xl border px-2.5 py-2 text-sm"
                                  style={secondaryButtonStyle}
                                  title="New Observation"
                                >
                                  ➕
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPatientWorkspace(patient.id, "appointments", "treatment");
                                  }}
                                  className="rounded-xl border px-2.5 py-2 text-sm"
                                  style={secondaryButtonStyle}
                                  title="Reschedule Visit"
                                >
                                  🗓️
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {filteredDoctorPatients.length > 6 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllPatientDirectory((value) => !value)}
                        className="mt-4 rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                        style={secondaryButtonStyle}
                      >
                        {showAllPatientDirectory ? "Show fewer patients" : `Show ${filteredDoctorPatients.length - 6} more patients`}
                      </button>
                    ) : null}
                  </section>

                  <section
                    ref={(node) => {
                      sectionRefs.current.appointments = node;
                    }}
                    className="rounded-[32px] border p-6"
                    style={panelStyle}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xl font-semibold" style={{ color: theme.text }}>
                          Appointments
                        </p>
                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          Color-coded urgency badges keep late visits visible while completed and upcoming slots stay lightweight.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "pending", label: "Pending" },
                          { key: "approved", label: "Approved" },
                          { key: "rejected", label: "Rejected" },
                          { key: "all", label: "All" },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setAppointmentFilter(item.key as "all" | "pending" | "approved" | "rejected")}
                            className="rounded-full px-3.5 py-2 text-xs font-semibold"
                            style={appointmentFilter === item.key ? { backgroundColor: theme.accentStrong, color: "#ffffff" } : secondaryButtonStyle}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                        Created Date
                      </label>
                      <select value={createdDateFilter} onChange={(event) => setCreatedDateFilter(event.target.value)} className="rounded-2xl border px-3 py-2.5 text-sm" style={inputStyle}>
                        <option value="all">All dates</option>
                        {createdDateOptions.map((dateLabel) => (
                          <option key={dateLabel} value={dateLabel}>
                            {dateLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-6 space-y-4">
                      {visibleAppointmentEntries.length === 0 ? (
                        <p className="text-sm" style={{ color: theme.textMuted }}>
                          No appointments in this filter.
                        </p>
                      ) : (
                        visibleAppointmentEntries.map(([dateLabel, appointments]) => (
                          <div key={dateLabel} className="rounded-[26px] border p-4" style={surfaceStyle}>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                              {dateLabel}
                            </p>
                            <div className="mt-4 space-y-3">
                              {appointments.map((appointment) => {
                                const tone = getAppointmentTone(appointment);
                                const badgeLabel = tone === "completed" ? "Completed" : tone === "late" ? "Late" : "Upcoming";
                                const badgeStyle =
                                  tone === "completed"
                                    ? { backgroundColor: theme.successSoft, color: theme.success }
                                    : tone === "late"
                                      ? { backgroundColor: theme.dangerSoft, color: theme.danger }
                                      : { backgroundColor: theme.infoSoft, color: theme.accentStrong };
                                return (
                                  <div key={appointment.id} className="rounded-2xl border p-4" style={mutedSurfaceStyle}>
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-base font-semibold" style={{ color: theme.text }}>
                                            {appointment.patient_name}
                                          </p>
                                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={badgeStyle}>
                                            {badgeLabel}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                                          {formatDateTime(appointment.time)}
                                        </p>
                                        {appointment.notes ? (
                                          <p className="mt-3 text-sm leading-6" style={{ color: theme.textSubtle }}>
                                            Notes: {appointment.notes}
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedPatientId(appointment.patient_id)}
                                          className="rounded-2xl border px-3.5 py-2 text-xs font-semibold"
                                          style={secondaryButtonStyle}
                                        >
                                          Open Patient
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => decideAppointment(appointment.id, "approved")}
                                          className="rounded-2xl px-3.5 py-2 text-xs font-semibold text-white"
                                          style={{ backgroundColor: theme.success }}
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => decideAppointment(appointment.id, "rejected")}
                                          className="rounded-2xl px-3.5 py-2 text-xs font-semibold text-white"
                                          style={{ backgroundColor: theme.danger }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {Object.keys(visibleAppointmentGroups).length > 5 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllAppointmentGroups((value) => !value)}
                        className="mt-4 rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                        style={secondaryButtonStyle}
                      >
                        {showAllAppointmentGroups ? "Show fewer dates" : `Show ${Object.keys(visibleAppointmentGroups).length - 5} more dates`}
                      </button>
                    ) : null}
                  </section>

                  {isDoctor ? (
                    <section
                      ref={(node) => {
                        sectionRefs.current.observations = node;
                      }}
                      className="rounded-[32px] border p-6 sm:p-8"
                      style={panelStyle}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xl font-semibold" style={{ color: theme.text }}>
                            Progressive Patient Intake
                          </p>
                          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                            The long intake form is now split into clinical steps so doctors can move from demographics to treatment without a giant scrolling wall.
                          </p>
                        </div>
                        <div className="rounded-2xl border px-4 py-3 text-sm" style={mutedSurfaceStyle}>
                          <p className="font-semibold" style={{ color: theme.text }}>
                            Step {INTAKE_STEPS.findIndex((step) => step.key === newPatientStep) + 1} of {INTAKE_STEPS.length}
                          </p>
                          <p className="mt-1" style={{ color: theme.textMuted }}>
                            {INTAKE_STEPS.find((step) => step.key === newPatientStep)?.label}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={createNewPatientInventory} className="mt-6">
                        {renderStepperTabs(newPatientStep, setNewPatientStep)}
                        <div className="mt-6">{renderNewPatientStepContent()}</div>
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => moveStep(newPatientStep, -1, setNewPatientStep)}
                              disabled={newPatientStep === "personal"}
                              className="rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              style={secondaryButtonStyle}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(newPatientStep, 1, setNewPatientStep)}
                              disabled={newPatientStep === "history"}
                              className="rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                              style={secondaryButtonStyle}
                            >
                              Next
                            </button>
                          </div>
                          <button type="submit" className="rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg" style={primaryButtonStyle}>
                            Save New Patient
                          </button>
                        </div>
                      </form>

                      {newPatientStatus ? (
                        <p className="mt-4 text-sm font-semibold" style={{ color: theme.textSubtle }}>
                          {newPatientStatus}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                </>
              ) : (
                <>
                  <section
                    ref={(node) => {
                      sectionRefs.current.overview = node;
                    }}
                    className="rounded-[32px] border p-6 sm:p-8"
                    style={panelStyle}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accentStrong }}>
                          Active Patient Workspace
                        </p>
                        <MotionText as="h2" text={selectedPatient.full_name} className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl" />
                        <p className="mt-3 text-sm leading-7" style={{ color: theme.textMuted }}>
                          Patient #{selectedPatient.id} • Last visit {formatDateTime(latestSelectedAppointment?.time || latestSelectedAppointment?.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(null);
                            setPatientSearchInput("");
                            setPatientSearchQuery("");
                          }}
                          className="rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                          style={secondaryButtonStyle}
                        >
                          Dashboard
                        </button>
                        <button type="button" onClick={() => printPrescriptionPdf(selectedPatient)} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                          View Last Rx
                        </button>
                        <button type="button" onClick={() => openPatientWorkspace(selectedPatient.id, "observations", "treatment")} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                          New Observation
                        </button>
                        <button type="button" onClick={() => openPatientWorkspace(selectedPatient.id, "appointments", "treatment")} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                          Reschedule Visit
                        </button>
                        {isDoctor ? (
                          <button
                            type="button"
                            onClick={() => setPatientPendingDelete(selectedPatient)}
                            className="rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                            style={{
                              borderColor: darkMode ? "#7f1d1d" : "#fecaca",
                              backgroundColor: darkMode ? "rgba(127, 29, 29, 0.18)" : "#fff1f2",
                              color: darkMode ? "#fecaca" : "#b91c1c",
                            }}
                          >
                            Delete Patient
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border p-4" style={surfaceStyle}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                          Last Visit
                        </p>
                        <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                          {formatDateTime(latestSelectedAppointment?.time || latestSelectedAppointment?.created_at)}
                        </p>
                      </div>
                      <div className="rounded-2xl border p-4" style={surfaceStyle}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                          Next Follow-up
                        </p>
                        <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                          {patientSupportDrafts[selectedPatient.id]?.followUpDate
                            ? `${patientSupportDrafts[selectedPatient.id]?.followUpDate} ${patientSupportDrafts[selectedPatient.id]?.followUpTime || ""}`
                            : "Not scheduled"}
                        </p>
                      </div>
                      <div className="rounded-2xl border p-4" style={surfaceStyle}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                          Preferred Language
                        </p>
                        <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                          {(inventoryDrafts[selectedPatient.id] || createEmptyInventoryDraft()).preferredLanguage || "English"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section
                    ref={(node) => {
                      sectionRefs.current["patient-records"] = node;
                    }}
                    className="rounded-[32px] border p-6 sm:p-8"
                    style={panelStyle}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xl font-semibold" style={{ color: theme.text }}>
                          Patient Inventory
                        </p>
                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          Progressive charting keeps personal information, symptoms, treatment, and history in distinct clinical steps.
                        </p>
                      </div>
                      <div className="rounded-2xl border px-4 py-3 text-sm" style={mutedSurfaceStyle}>
                        <p className="font-semibold" style={{ color: theme.text }}>
                          Step {INTAKE_STEPS.findIndex((step) => step.key === selectedPatientStep) + 1} of {INTAKE_STEPS.length}
                        </p>
                        <p className="mt-1" style={{ color: theme.textMuted }}>
                          {INTAKE_STEPS.find((step) => step.key === selectedPatientStep)?.label}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">{renderStepperTabs(selectedPatientStep, setSelectedPatientStep)}</div>
                    <div className="mt-6">{renderSelectedPatientStepContent()}</div>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => moveStep(selectedPatientStep, -1, setSelectedPatientStep)}
                          disabled={selectedPatientStep === "personal"}
                          className="rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          style={secondaryButtonStyle}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(selectedPatientStep, 1, setSelectedPatientStep)}
                          disabled={selectedPatientStep === "history"}
                          className="rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          style={secondaryButtonStyle}
                        >
                          Next
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {inventoryStatus[selectedPatient.id] ? (
                          <p className="text-xs font-semibold" style={{ color: theme.textSubtle }}>
                            {inventoryStatus[selectedPatient.id]}
                          </p>
                        ) : null}
                        <button type="button" onClick={() => savePatientInventory(selectedPatient.id)} className="rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg" style={primaryButtonStyle}>
                          Save Inventory
                        </button>
                      </div>
                    </div>
                  </section>

                  <section
                    ref={(node) => {
                      sectionRefs.current.observations = node;
                    }}
                    className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
                  >
                    <div className="rounded-[32px] border p-6" style={panelStyle}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-semibold" style={{ color: theme.text }}>
                            Clinical Notes
                          </p>
                          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                            Voice-ready notes keep the active encounter focused in the middle pane.
                          </p>
                        </div>
                        <ClipboardPenLine className="h-5 w-5" style={{ color: theme.accent }} />
                      </div>
                      <div className="mt-5">
                        {renderVoiceTextArea({
                          label: "Clinical Notes",
                          value: doctorObservations,
                          onChange: setDoctorObservations,
                          placeholder: "Record assessment, impression, and active clinical observations.",
                          minHeight: 240,
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setDoctorDashboardStatus(`Prescription notes ready for ${selectedPatient.full_name}. Save the treatment plan to persist them.`)}
                          className="rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg"
                          style={primaryButtonStyle}
                        >
                          Prescribe
                        </button>
                        <button
                          type="button"
                          onClick={() => setDoctorDashboardStatus(`Referral workflow is not automated yet. Add referral notes for ${selectedPatient.full_name} here.`)}
                          className="rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                          style={secondaryButtonStyle}
                        >
                          Refer
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[32px] border p-6" style={panelStyle}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-semibold" style={{ color: theme.text }}>
                            Messaging
                          </p>
                          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                            Compose reminders without leaving the active chart.
                          </p>
                        </div>
                        <MessageSquare className="h-5 w-5" style={{ color: theme.accent }} />
                      </div>
                      <div className="mt-5 grid gap-4">
                        <input
                          value={patientMessageDrafts[selectedPatient.id]?.subject || ""}
                          onChange={(event) => updatePatientMessageDraft(selectedPatient.id, "subject", event.target.value)}
                          className="rounded-2xl border px-4 py-3 text-sm"
                          style={inputStyle}
                          placeholder="Message subject"
                        />
                        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                          <select
                            value={patientMessageDrafts[selectedPatient.id]?.channel || "whatsapp"}
                            onChange={(event) => updatePatientMessageDraft(selectedPatient.id, "channel", event.target.value as "whatsapp" | "sms")}
                            className="rounded-2xl border px-4 py-3 text-sm"
                            style={inputStyle}
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="sms">SMS</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updatePatientMessageDraft(
                                selectedPatient.id,
                                "body",
                                buildReminderMessage(
                                  selectedPatient,
                                  patientSupportDrafts[selectedPatient.id] || createEmptyPatientSupportDraft(),
                                  inventoryDrafts[selectedPatient.id]?.followUpNotes || ""
                                )
                              )
                            }
                            className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                            style={secondaryButtonStyle}
                          >
                            Refresh from follow-up details
                          </button>
                        </div>
                        <textarea
                          value={patientMessageDrafts[selectedPatient.id]?.body || ""}
                          onChange={(event) => updatePatientMessageDraft(selectedPatient.id, "body", event.target.value)}
                          className="min-h-[200px] rounded-2xl border px-4 py-3 text-sm leading-7"
                          style={inputStyle}
                          placeholder="Draft a patient message"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={() => sendPatientMessage(selectedPatient)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg" style={primaryButtonStyle}>
                            Send Message
                          </button>
                          <button type="button" onClick={() => void copyPatientMessage(selectedPatient.id)} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                            Copy
                          </button>
                        </div>
                        {messageStatus[selectedPatient.id] ? (
                          <p className="text-xs font-semibold" style={{ color: theme.textSubtle }}>
                            {messageStatus[selectedPatient.id]}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section
                    ref={(node) => {
                      sectionRefs.current.appointments = node;
                    }}
                    className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
                  >
                    <div className="space-y-6">
                      <div className="rounded-[32px] border p-6" style={panelStyle}>
                        <p className="text-xl font-semibold" style={{ color: theme.text }}>
                          Communication & Follow-up
                        </p>
                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          Reschedule and reminder controls stay grouped together for fewer mental context switches.
                        </p>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <select value={patientSupportDrafts[selectedPatient.id]?.consultationMode || "In-person"} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "consultationMode", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle}>
                            <option value="In-person">In-person</option>
                            <option value="Teleconsultation">Teleconsultation</option>
                            <option value="Video call">Video call</option>
                          </select>
                          <select value={patientSupportDrafts[selectedPatient.id]?.reminderChannel || "WhatsApp"} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "reminderChannel", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle}>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="SMS">SMS</option>
                            <option value="Both">Both</option>
                          </select>
                          <input value={patientSupportDrafts[selectedPatient.id]?.teleconsultationLink || ""} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "teleconsultationLink", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm md:col-span-2" style={inputStyle} placeholder="Video consultation link" />
                          <input type="date" value={patientSupportDrafts[selectedPatient.id]?.followUpDate || ""} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "followUpDate", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />
                          <input type="time" value={patientSupportDrafts[selectedPatient.id]?.followUpTime || "10:00"} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "followUpTime", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={() => savePatientSupportDetails(selectedPatient.id)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg" style={primaryButtonStyle}>
                            Save Details
                          </button>
                          <button type="button" onClick={() => bookFollowUp(selectedPatient.id)} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                            Book Follow-up
                          </button>
                          <button type="button" onClick={() => openReminder(selectedPatient, "whatsapp")} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                            WhatsApp Reminder
                          </button>
                          <button type="button" onClick={() => openReminder(selectedPatient, "sms")} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                            SMS Reminder
                          </button>
                        </div>
                        {supportStatus[selectedPatient.id] ? (
                          <p className="mt-4 text-xs font-semibold" style={{ color: theme.textSubtle }}>
                            {supportStatus[selectedPatient.id]}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-[32px] border p-6" style={panelStyle}>
                        <p className="text-xl font-semibold" style={{ color: theme.text }}>
                          Billing & Documents
                        </p>
                        <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                          Receipts and clinical documents remain available without taking over the charting flow.
                        </p>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <input value={patientSupportDrafts[selectedPatient.id]?.feeAmount || ""} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "feeAmount", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Consultation fee" />
                          <input value={patientSupportDrafts[selectedPatient.id]?.receiptNumber || ""} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "receiptNumber", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle} placeholder="Receipt number" />
                          <select value={patientSupportDrafts[selectedPatient.id]?.paymentStatus || "Pending"} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "paymentStatus", event.target.value)} className="rounded-2xl border px-4 py-3 text-sm" style={inputStyle}>
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Partially Paid">Partially Paid</option>
                          </select>
                          <textarea value={patientSupportDrafts[selectedPatient.id]?.paymentNotes || ""} onChange={(event) => updatePatientSupportDraft(selectedPatient.id, "paymentNotes", event.target.value)} className="min-h-[104px] rounded-2xl border px-4 py-3 text-sm md:col-span-2" style={inputStyle} placeholder="Billing notes" />
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={() => printPrescriptionPdf(selectedPatient)} className="rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg" style={primaryButtonStyle}>
                            Prescription PDF
                          </button>
                          <button type="button" onClick={() => printReceipt(selectedPatient)} className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                            Print Receipt
                          </button>
                          {patientSupportDrafts[selectedPatient.id]?.teleconsultationLink ? (
                            <a href={patientSupportDrafts[selectedPatient.id]?.teleconsultationLink || "#"} target="_blank" rel="noreferrer" className="rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                              Open Video Link
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[32px] border p-6" style={panelStyle}>
                      <p className="text-xl font-semibold" style={{ color: theme.text }}>
                        Patient History
                      </p>
                      <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                        Recent visits and notes stay visible while the patient snapshot remains pinned on the right.
                      </p>
                      <div className="mt-6 space-y-3">
                        {visiblePatientHistory.length === 0 ? (
                          <div className="rounded-2xl border px-4 py-4 text-sm" style={mutedSurfaceStyle}>
                            <span style={{ color: theme.textMuted }}>No appointment history yet.</span>
                          </div>
                        ) : (
                          visiblePatientHistory.map((item) => (
                            <div key={item.id} className="rounded-2xl border p-4" style={surfaceStyle}>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                                {formatDateTime(item.time || item.created_at)}
                              </p>
                              {item.notes ? (
                                <p className="mt-2 text-sm leading-6" style={{ color: theme.textSubtle }}>
                                  {item.notes}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                                  No notes attached.
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      {(selectedPatient.appointment_history || []).length > 5 ? (
                        <button type="button" onClick={() => setShowAllPatientHistory((value) => !value)} className="mt-4 rounded-2xl border px-4 py-2.5 text-sm font-semibold" style={secondaryButtonStyle}>
                          {showAllPatientHistory ? "Show less history" : `Show ${(selectedPatient.appointment_history || []).length - 5} more history items`}
                        </button>
                      ) : null}
                    </div>
                  </section>
                </>
              )}

              {doctorDashboardStatus ? (
                <p className="text-sm font-semibold" style={{ color: theme.textSubtle }}>
                  {doctorDashboardStatus}
                </p>
              ) : null}
            </div>

            <aside className="xl:sticky xl:top-24">
              <div className="rounded-[32px] border p-5" style={panelStyle}>
                {!selectedPatient ? (
                  <div className="rounded-[28px] border px-5 py-12 text-center" style={surfaceStyle}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.accentStrong }}>
                      Snapshot Panel
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                      Waiting for Patient Selection
                    </p>
                    <p className="mt-3 text-sm leading-7" style={{ color: theme.textMuted }}>
                      Choose a patient from the directory, schedule, or global search to pin their critical clinical details here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="rounded-[28px] border p-5"
                      style={{
                        ...surfaceStyle,
                        background: darkMode
                          ? `linear-gradient(160deg, rgba(56, 189, 248, 0.12), rgba(10, 25, 38, 0.96) 65%)`
                          : `linear-gradient(160deg, rgba(37, 99, 235, 0.08), rgba(255,255,255,0.98) 62%)`,
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] text-xl font-bold" style={{ backgroundColor: theme.accentSoft, color: theme.accentStrong }}>
                          {getInitials(selectedPatient.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-2xl font-bold tracking-tight" style={{ color: theme.text }}>
                            {selectedPatient.full_name}
                          </p>
                          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                            Patient #{selectedPatient.id}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                        <div className="rounded-2xl border p-3" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Age
                          </p>
                          <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                            {calculateAge(selectedPatient.date_of_birth)}
                          </p>
                        </div>
                        <div className="rounded-2xl border p-3" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Gender
                          </p>
                          <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                            {selectedPatient.gender || "Not recorded"}
                          </p>
                        </div>
                        <div className="rounded-2xl border p-3" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Blood Type
                          </p>
                          <p className="mt-2 text-lg font-semibold" style={{ color: theme.text }}>
                            {selectedPatientBloodType}
                          </p>
                        </div>
                        <div className="rounded-2xl border p-3" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Last Visit
                          </p>
                          <p className="mt-2 text-sm font-semibold" style={{ color: theme.text }}>
                            {formatDate(latestSelectedAppointment?.time || latestSelectedAppointment?.created_at)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="mt-4 rounded-2xl border px-4 py-4"
                        style={{
                          borderColor: darkMode ? "#7f1d1d" : "#fecaca",
                          backgroundColor: theme.dangerSoft,
                        }}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.danger }}>
                          Allergies
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6" style={{ color: darkMode ? "#fecaca" : "#991b1b" }}>
                          {selectedPatientAllergySummary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                        Last 3 Vitals
                      </p>
                      <div className="mt-3 grid gap-3">
                        {selectedPatientMetrics.map((metric) => (
                          <div key={metric.label} className="rounded-2xl border p-4" style={surfaceStyle}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                                {metric.label}
                              </p>
                              <Activity className="h-4 w-4" style={{ color: theme.accent }} />
                            </div>
                            <p className="mt-3 text-xl font-semibold" style={{ color: theme.text }}>
                              {metric.value}
                            </p>
                            <svg viewBox="0 0 140 36" className="mt-4 h-10 w-full">
                              <path d={buildSparklinePath(metric.trend)} fill="none" stroke={theme.accentStrong} strokeWidth="2.4" strokeLinecap="round" />
                            </svg>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border p-4" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Latest Appointment
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6" style={{ color: theme.text }}>
                            {formatDateTime(latestSelectedAppointment?.time || latestSelectedAppointment?.created_at)}
                          </p>
                        </div>
                        <div className="rounded-2xl border p-4" style={mutedSurfaceStyle}>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                            Next Follow-up
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6" style={{ color: theme.text }}>
                            {patientSupportDrafts[selectedPatient.id]?.followUpDate
                              ? `${patientSupportDrafts[selectedPatient.id]?.followUpDate} ${patientSupportDrafts[selectedPatient.id]?.followUpTime || ""}`
                              : "Not scheduled"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>

          <datalist id="icd10-options">
            {ICD10_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <datalist id="gender-options">
            {GENDER_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <datalist id="religion-options">
            {RELIGION_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <datalist id="language-options">
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </main>

        {showPatientPicker ? (
          <div className="fixed inset-0 z-40 flex items-end bg-slate-950/55 px-3 py-4 md:hidden">
            <div className="w-full rounded-t-[28px] border p-3 shadow-2xl" style={surfaceStyle}>
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full" style={{ backgroundColor: theme.panelBorder }} />
              <div className="max-h-[68vh]">{renderPatientPickerContent()}</div>
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
              ...surfaceStyle,
            }}
          >
            <div className="max-h-72">{renderPatientPickerContent()}</div>
          </div>
        ) : null}

        {patientPendingDelete ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
            <div
              className="w-full max-w-md rounded-[28px] border p-6 shadow-2xl"
              style={{
                borderColor: darkMode ? "#365567" : "#d8e1e7",
                backgroundColor: darkMode ? "#112633" : "#ffffff",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2" style={{ backgroundColor: darkMode ? "rgba(128, 39, 60, 0.24)" : "#fff1f4" }}>
                  <XCircle className="h-5 w-5" style={{ color: darkMode ? "#ffc0cd" : "#c42854" }} />
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: darkMode ? "#f2f7fb" : "#17354c" }}>
                    Delete patient record?
                  </p>
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
                    color: darkMode ? "#e0edf7" : "#234863",
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

  return renderRedesignedDashboard();
}

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Leaf,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  UserRound
} from "lucide-react";
import { api, SESSION_EXPIRED_MESSAGE } from "../api/client";
import practitionerPortrait from "../assets/arogya/senior-ayurveda-practitioner.jpg";
import logoJourneyVideo from "../assets/arogya/logo-to-video-generation.mp4";
import { InteractiveLogoutButton } from "../components/InteractiveLogoutButton";
import { Float, MotionText, PageFade, Parallax } from "../components/Motion";
import authIdleVideo from "../assets/auth/arogya-auth-idle.mp4";
import authSuccessVideo from "../assets/auth/arogya-auth-success.mp4";
import authErrorVideo from "../assets/auth/arogya-auth-error.mp4";

interface DoctorData {
  id: number;
  specialization?: string;
  bio?: string;
  availability?: string;
}

interface DoctorProfile {
  doctor?: {
    id: number;
    specialization?: string;
    bio?: string;
    availability?: string;
  };
  domain?: string | null;
}

interface PatientProfile {
  id: number;
  doctor_id: number;
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
}

interface PatientAppointment {
  id: number;
  doctor_id: number;
  time: string;
  status: "pending" | "approved" | "rejected";
  notes?: string | null;
  medical_files?: string[] | null;
  created_at: string;
}

interface PatientPrescription {
  id: number;
  doctor_id: number;
  patient_id: number;
  appointment_id: number;
  diagnosis: string;
  drug_names: string[];
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

type Dosha = "Vata" | "Pitta" | "Kapha";

interface QuizOption {
  label: string;
  dosha: Dosha;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
  hint?: string;
}

interface Testimonial {
  name: string;
  concern: string;
  text: string;
  rating: number;
}

const quizQuestions: QuizQuestion[] = [
  {
    question: "How would you describe your natural body frame?",
    hint: "Adapted from Prakriti screening: Body Frame / Build",
    options: [
      { label: "Lean and light", dosha: "Vata" },
      { label: "Moderate and athletic", dosha: "Pitta" },
      { label: "Broad and sturdy", dosha: "Kapha" }
    ]
  },
  {
    question: "How is your appetite most of the time?",
    hint: "Adapted from Prakriti screening: appetite regularity/frequency",
    options: [
      { label: "Irregular or changing", dosha: "Vata" },
      { label: "Frequent and strong", dosha: "Pitta" },
      { label: "Infrequent but stable", dosha: "Kapha" }
    ]
  },
  {
    question: "How would you describe your sleep pattern?",
    hint: "Adapted from Prakriti screening: amount + quality of sleep",
    options: [
      { label: "Light or interrupted", dosha: "Vata" },
      { label: "Moderate and sound", dosha: "Pitta" },
      { label: "Deep and prolonged", dosha: "Kapha" }
    ]
  },
  {
    question: "What best matches your bowel pattern?",
    hint: "Adapted from Prakriti screening: bowel habits + stool tendency",
    options: [
      { label: "Constipation tendency / dryness", dosha: "Vata" },
      { label: "Loose stool tendency / heat", dosha: "Pitta" },
      { label: "Soft, heavy, slower elimination", dosha: "Kapha" }
    ]
  },
  {
    question: "In which weather do you usually feel discomfort?",
    hint: "Adapted from Prakriti screening: weather preference + health issues",
    options: [
      { label: "Cold and dry weather", dosha: "Vata" },
      { label: "Hot weather", dosha: "Pitta" },
      { label: "Cold and damp weather", dosha: "Kapha" }
    ]
  },
  {
    question: "How is your skin usually?",
    hint: "Adapted from Prakriti screening: skin nature/texture",
    options: [
      { label: "Dry, rough, easily cracked", dosha: "Vata" },
      { label: "Warm, sensitive, may be oily", dosha: "Pitta" },
      { label: "Soft, thick, smooth/oily", dosha: "Kapha" }
    ]
  },
  {
    question: "How is your perspiration pattern?",
    hint: "Adapted from Prakriti screening: perspiration amount",
    options: [
      { label: "Low / variable sweating", dosha: "Vata" },
      { label: "Profuse sweating", dosha: "Pitta" },
      { label: "Moderate, steady sweating", dosha: "Kapha" }
    ]
  },
  {
    question: "Compared to others, your body temperature feels:",
    hint: "Adapted from Prakriti screening: body temperature tendency",
    options: [
      { label: "Lower / cold hands-feet", dosha: "Vata" },
      { label: "Higher / feels warm-hot", dosha: "Pitta" },
      { label: "Usually moderate-cool", dosha: "Kapha" }
    ]
  },
  {
    question: "Your speaking style is generally:",
    hint: "Adapted from Prakriti screening: amount/speed/style of speaking",
    options: [
      { label: "Fast, variable, expressive", dosha: "Vata" },
      { label: "Sharp, clear, intense", dosha: "Pitta" },
      { label: "Calm, deep, measured", dosha: "Kapha" }
    ]
  },
  {
    question: "When under stress, you most often:",
    hint: "Adapted from Prakriti screening: mental strength and stress response",
    options: [
      { label: "Feel anxious/restless quickly", dosha: "Vata" },
      { label: "Become irritable/reactive", dosha: "Pitta" },
      { label: "Withdraw, slow down, feel heavy", dosha: "Kapha" }
    ]
  }
];

const quizQuestionsHindi: QuizQuestion[] = [
  {
    question: "आपकी प्राकृतिक शारीरिक बनावट कैसी है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: शारीरिक बनावट",
    options: [
      { label: "पतली और हल्की", dosha: "Vata" },
      { label: "मध्यम और एथलेटिक", dosha: "Pitta" },
      { label: "मजबूत और भारी", dosha: "Kapha" }
    ]
  },
  {
    question: "अक्सर आपकी भूख कैसी रहती है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: भूख का पैटर्न",
    options: [
      { label: "अनियमित या बदलती हुई", dosha: "Vata" },
      { label: "तेज़ और बार-बार लगती है", dosha: "Pitta" },
      { label: "कम लेकिन स्थिर", dosha: "Kapha" }
    ]
  },
  {
    question: "आपकी नींद का पैटर्न कैसा है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: नींद की गुणवत्ता",
    options: [
      { label: "हल्की या टूट-टूट कर", dosha: "Vata" },
      { label: "मध्यम और संतुलित", dosha: "Pitta" },
      { label: "गहरी और लंबी", dosha: "Kapha" }
    ]
  },
  {
    question: "मल त्याग का पैटर्न किससे मिलता है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: पाचन और मल आदत",
    options: [
      { label: "कब्ज या सूखापन", dosha: "Vata" },
      { label: "ढीलापन या गर्मी", dosha: "Pitta" },
      { label: "धीमा, भारी और नरम", dosha: "Kapha" }
    ]
  },
  {
    question: "किस मौसम में आपको अधिक असहजता होती है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: मौसम संवेदनशीलता",
    options: [
      { label: "ठंडा और सूखा मौसम", dosha: "Vata" },
      { label: "गरम मौसम", dosha: "Pitta" },
      { label: "ठंडा और नम मौसम", dosha: "Kapha" }
    ]
  },
  {
    question: "आपकी त्वचा सामान्यतः कैसी रहती है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: त्वचा प्रकार",
    options: [
      { label: "रूखी, खुरदरी, फटने वाली", dosha: "Vata" },
      { label: "गरम, संवेदनशील, तैलीय", dosha: "Pitta" },
      { label: "मुलायम, मोटी, चिकनी", dosha: "Kapha" }
    ]
  },
  {
    question: "पसीने का पैटर्न कैसा है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: पसीना प्रवृत्ति",
    options: [
      { label: "कम या अनियमित", dosha: "Vata" },
      { label: "ज्यादा पसीना", dosha: "Pitta" },
      { label: "मध्यम और स्थिर", dosha: "Kapha" }
    ]
  },
  {
    question: "आपके शरीर का तापमान आमतौर पर कैसा लगता है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: शरीर तापमान प्रवृत्ति",
    options: [
      { label: "ठंडा, हाथ-पैर ठंडे", dosha: "Vata" },
      { label: "गरम या अधिक गर्म", dosha: "Pitta" },
      { label: "सामान्य या हल्का ठंडा", dosha: "Kapha" }
    ]
  },
  {
    question: "आपकी बोलने की शैली कैसी है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: बोलने का पैटर्न",
    options: [
      { label: "तेज़, बदलती, अभिव्यक्तिपूर्ण", dosha: "Vata" },
      { label: "स्पष्ट, तेज़ और प्रभावी", dosha: "Pitta" },
      { label: "शांत, गहरी, स्थिर", dosha: "Kapha" }
    ]
  },
  {
    question: "तनाव में आपका सामान्य व्यवहार क्या होता है?",
    hint: "प्रकृति स्क्रीनिंग से अनुकूलित: मानसिक प्रतिक्रिया",
    options: [
      { label: "चिंता या बेचैनी बढ़ती है", dosha: "Vata" },
      { label: "चिड़चिड़ापन या गुस्सा", dosha: "Pitta" },
      { label: "धीमापन, सुस्ती या अलगाव", dosha: "Kapha" }
    ]
  }
];

const timelineSteps = [
  {
    title: "Nadi Pariksha",
    detail: "Pulse-based diagnosis to map imbalance at root level.",
    icon: Activity
  },
  {
    title: "Personalized Detox",
    detail: "Herbal and dietary cleansing adapted to your prakriti.",
    icon: Leaf
  },
  {
    title: "Corrective Protocol",
    detail: "Targeted medicines and routines to stabilize core systems.",
    icon: ShieldCheck
  },
  {
    title: "Rasayana Rejuvenation",
    detail: "Long-term vitality and immunity restoration program.",
    icon: Sparkles
  }
];

const testimonials: Testimonial[] = [
  {
    name: "Ritika S.",
    concern: "Chronic migraine",
    text: "Within 8 weeks, my migraine frequency dropped dramatically. The treatment felt deeply personalized.",
    rating: 5
  },
  {
    name: "Mahesh P.",
    concern: "Digestive imbalance",
    text: "For the first time in years, digestion feels stable. The doctor explained every step with clarity.",
    rating: 5
  },
  {
    name: "Anjali R.",
    concern: "Stress and sleep",
    text: "The prakriti-based routine changed my sleep cycle and energy levels. Very grounded approach.",
    rating: 5
  }
];

const practitionerHeroImage = practitionerPortrait;

const arogyaWisdom = [
  {
    verse: "हिताहितं सुखं दुःखमायुस्तस्य हिताहितम् । मानं च तच्च यत्रोक्तमायुर्वेदः स उच्यते ॥",
    meaning:
      "Ayurveda teaches what supports life and what harms it. It helps us choose habits that increase health, comfort, and long-term wellbeing."
  },
  {
    verse: "समदोषः समाग्निश्च समधातुमलक्रियः । प्रसन्नात्मेन्द्रियमनाः स्वस्थ इत्यभिधीयते ॥",
    meaning:
      "True health means body systems are balanced, digestion is steady, tissues are nourished, and the mind and senses feel calm and happy."
  }
];

const doshaResultContent: Record<Dosha, { title: string; summary: string; strengths: string[]; balancing: string[] }> = {
  Vata: {
    title: "Vata Dominant",
    summary: "Your constitution appears air/space dominant. You likely have creativity, quick responses, and sensitivity to change.",
    strengths: ["Creative mind and adaptability", "Fast learning and enthusiasm", "Natural spontaneity"],
    balancing: ["Keep fixed meal and sleep times", "Prefer warm, nourishing foods", "Use grounding routines like oil massage and gentle yoga"]
  },
  Pitta: {
    title: "Pitta Dominant",
    summary: "Your constitution appears fire/water dominant. You likely have strong digestion, focus, and strong drive.",
    strengths: ["Sharp intellect and decision making", "Good metabolism and discipline", "Leadership and execution"],
    balancing: ["Avoid excessive heat and spicy overload", "Use cooling foods and hydration", "Include calming breathwork and recovery breaks"]
  },
  Kapha: {
    title: "Kapha Dominant",
    summary: "Your constitution appears earth/water dominant. You likely have stability, endurance, and emotional steadiness.",
    strengths: ["Strong immunity and stamina", "Calm and supportive temperament", "Consistency and resilience"],
    balancing: ["Favor lighter, warm meals", "Keep daily physical activity consistent", "Reduce oversleeping and lethargy triggers"]
  }
};

const doshaResultContentHindi: Record<Dosha, { title: string; summary: string; strengths: string[]; balancing: string[] }> = {
  Vata: {
    title: "वात प्रमुख",
    summary: "आपकी प्रकृति में वायु और आकाश तत्व प्रमुख दिखते हैं। आप तेज़ सोच, रचनात्मकता और संवेदनशीलता वाले हो सकते हैं।",
    strengths: ["रचनात्मक और अनुकूलनीय सोच", "तेज़ सीखने की क्षमता", "उत्साह और नवीनता"],
    balancing: ["नियमित भोजन और नींद रखें", "गर्म और पौष्टिक भोजन लें", "हल्का योग और अभ्यंग अपनाएँ"]
  },
  Pitta: {
    title: "पित्त प्रमुख",
    summary: "आपकी प्रकृति में अग्नि और जल तत्व प्रमुख दिखते हैं। पाचन, निर्णय क्षमता और कार्यकुशलता मजबूत रहती है।",
    strengths: ["तेज़ निर्णय और विश्लेषण", "मजबूत पाचन और अनुशासन", "नेतृत्व और कार्य निष्पादन"],
    balancing: ["अत्यधिक गर्म/तीखा भोजन कम करें", "शीतल आहार और पर्याप्त जल लें", "श्वास अभ्यास और विश्राम जोड़ें"]
  },
  Kapha: {
    title: "कफ प्रमुख",
    summary: "आपकी प्रकृति में पृथ्वी और जल तत्व प्रमुख दिखते हैं। स्थिरता, सहनशक्ति और मानसिक संतुलन आपकी ताकत है।",
    strengths: ["अच्छी सहनशक्ति और स्थिर ऊर्जा", "शांत और सहयोगी स्वभाव", "दीर्घकालिक निरंतरता"],
    balancing: ["हल्का और गरम भोजन लें", "दैनिक शारीरिक गतिविधि बढ़ाएँ", "अधिक नींद और जड़ता से बचें"]
  }
};

function parseBrandColors(colors?: string): [string, string] {
  if (!colors) {
    return ["#2f7d6b", "#0f5d73"];
  }
  const parts = colors.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) {
    return ["#2f7d6b", "#0f5d73"];
  }
  if (parts.length === 1) {
    return [parts[0], "#0f5d73"];
  }
  return [parts[0], parts[1]];
}

function getDominantDosha(answers: Dosha[]): Dosha | null {
  if (answers.length !== quizQuestions.length) {
    return null;
  }
  const score = { Vata: 0, Pitta: 0, Kapha: 0 };
  for (const answer of answers) {
    score[answer] += 1;
  }
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as Dosha;
}

function getDoshaScore(answers: Dosha[]): Record<Dosha, number> {
  const score: Record<Dosha, number> = { Vata: 0, Pitta: 0, Kapha: 0 };
  for (const answer of answers) {
    score[answer] += 1;
  }
  return score;
}

export function ClinicHomepagePage() {
  const { id } = useParams();

  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [hospitalName, setHospitalName] = useState("Ayurvedic Clinic");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("Guided Ayurvedic healing with precision diagnostics and compassionate care.");
  const [brandColors, setBrandColors] = useState<[string, string]>(["#2f7d6b", "#0f5d73"]);

  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Dosha[]>([]);
  const [quizLanguage, setQuizLanguage] = useState<"en" | "hi">("en");
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingGender, setBookingGender] = useState("");
  const [medicalFiles, setMedicalFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [bookStatus, setBookStatus] = useState("");
  const [patientAppointments, setPatientAppointments] = useState<PatientAppointment[]>([]);
  const [trackerStatus, setTrackerStatus] = useState("");

  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("careleo_clinic_token"));
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authVisual, setAuthVisual] = useState<"idle" | "success" | "error">("idle");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authPanelPointer, setAuthPanelPointer] = useState({ x: 180, y: 180 });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [patientPrescriptions, setPatientPrescriptions] = useState<PatientPrescription[]>([]);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPincode, setSignupPincode] = useState("");
  const [signupCity, setSignupCity] = useState("");
  const [signupState, setSignupState] = useState("");
  const [signupLocalAddress, setSignupLocalAddress] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [signupGender, setSignupGender] = useState("");
  const [signupDob, setSignupDob] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem("careleo_doctor_site_theme") === "dark");
  const reduceMotion = useReducedMotion();
  const theme = useMemo(
    () =>
      darkMode
        ? {
            pageGradient: "linear-gradient(180deg, #071a1f 0%, #0c262b 52%, #0b1e23 100%)",
            headerBg: "rgba(7, 23, 28, 0.82)",
            border: "#1f4349",
            surface: "#112e35",
            surfaceSoft: "#153941",
            surfaceCard: "#0f2930",
            text: "#e8f5f2",
            textMuted: "#a9c6bf",
            inputBg: "#193d44",
            inputText: "#e6f5f2",
            gold: "#d7b46f"
          }
        : {
            pageGradient: "linear-gradient(180deg, #f0f6f1 0%, #e7f1ed 45%, #f5efe2 100%)",
            headerBg: "rgba(240, 246, 241, 0.86)",
            border: "#b8d3ca",
            surface: "#f6fbf8",
            surfaceSoft: "#edf6f1",
            surfaceCard: "#fffaf0",
            text: "#153d36",
            textMuted: "#48655e",
            inputBg: "#ffffff",
            inputText: "#153d36",
            gold: "#b9882f"
          },
    [darkMode]
  );

  useEffect(() => {
    localStorage.setItem("careleo_doctor_site_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (authError) {
      setAuthVisual("error");
      return;
    }
    if (authSuccess) {
      setAuthVisual("success");
      return;
    }
    setAuthVisual("idle");
  }, [authError, authSuccess, authMode]);

  useEffect(() => {
    api.get(`/public/doctor/${id}`).then(({ data }) => {
      setDoctor(data.doctor);
      setHospitalName(data.hospital?.name || "Ayurvedic Clinic");
      setLogo(data.branding?.logo || "");
      setDescription(data.branding?.description || "Guided Ayurvedic healing with precision diagnostics and compassionate care.");
      setBrandColors(parseBrandColors(data.branding?.colors));
    });
  }, [id]);

  useEffect(() => {
    if (!authToken) {
      setAuthRole(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      setBookingName("");
      setBookingEmail("");
      setBookingPhone("");
      setBookingGender("");
      setMedicalFiles([]);
      setPatientPrescriptions([]);
      return;
    }
    try {
      const payload = authToken.split(".")[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decoded) as { role?: string; doctor_id?: number };
      if (parsed.role === "patient" || parsed.role === "doctor") {
        setAuthRole(parsed.role);
        if (parsed.role === "doctor" && parsed.doctor_id && parsed.doctor_id !== Number(id)) {
          window.location.href = `/clinic/${parsed.doctor_id}`;
          return;
        }
      } else {
        localStorage.removeItem("careleo_clinic_token");
        setAuthToken(null);
        setAuthRole(null);
      }
    } catch {
      setAuthRole(null);
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || authRole !== "patient") {
      setPatientAppointments([]);
      setTrackerStatus("");
      return;
    }
    api
      .get("/patients/me", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => setPatientProfile(data as PatientProfile))
      .catch(() => setPatientProfile(null));
  }, [authRole, authToken]);

  useEffect(() => {
    if (!patientProfile) {
      return;
    }
    setBookingName(patientProfile.full_name || "");
    setBookingEmail(patientProfile.email || "");
    setBookingPhone(patientProfile.phone || "");
    setBookingGender(patientProfile.gender || "");
  }, [patientProfile]);

  useEffect(() => {
    if (!authToken || authRole !== "patient") {
      return;
    }

    let active = true;
    const loadAppointments = () =>
      api
        .get("/patients/appointments", { headers: { Authorization: `Bearer ${authToken}` } })
        .then(({ data }) => {
          if (!active) {
            return;
          }
          setPatientAppointments(data as PatientAppointment[]);
          setTrackerStatus(`Live updates: ${new Date().toLocaleTimeString()}`);
        })
        .catch(() => {
          if (!active) {
            return;
          }
          setTrackerStatus("Unable to refresh live status right now.");
        });

    loadAppointments();
    const intervalId = window.setInterval(loadAppointments, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [authRole, authToken]);

  useEffect(() => {
    if (!authToken || authRole !== "patient") {
      setPatientPrescriptions([]);
      return;
    }
    api
      .get("/patients/prescriptions", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => setPatientPrescriptions(data as PatientPrescription[]))
      .catch(() => setPatientPrescriptions([]));
  }, [authRole, authToken]);

  useEffect(() => {
    if (!authToken || authRole !== "doctor") {
      return;
    }
    api
      .get("/doctor-tenant/me", { headers: { Authorization: `Bearer ${authToken}` } })
      .then(({ data }) => setDoctorProfile(data as DoctorProfile))
      .catch(() => setDoctorProfile(null));
  }, [authRole, authToken]);

  const dominantDosha = useMemo(() => getDominantDosha(quizAnswers), [quizAnswers]);
  const doshaScore = useMemo(() => getDoshaScore(quizAnswers), [quizAnswers]);
  const activeQuizQuestions = quizLanguage === "hi" ? quizQuestionsHindi : quizQuestions;
  const activeDoshaContent = quizLanguage === "hi" ? doshaResultContentHindi : doshaResultContent;
  const quizProgress = ((quizStep + 1) / quizQuestions.length) * 100;

  async function bookAppointment(event: FormEvent) {
    event.preventDefault();
    if (!id || !appointmentDate || !appointmentTime) {
      setBookStatus("Please choose date and time.");
      return;
    }

    const isoDateTime = new Date(`${appointmentDate}T${appointmentTime}`).toISOString();

    setBookStatus("Submitting appointment request...");
    try {
      if (!authToken || authRole !== "patient") {
        if (!bookingName || !bookingEmail) {
          setBookStatus("Please provide your name and email.");
          return;
        }
        const { data } = await api.post(`/public/doctor/${id}/appointments`, {
          patient_name: bookingName,
          patient_email: bookingEmail,
          patient_phone: bookingPhone || undefined,
          patient_gender: bookingGender || undefined,
          time: isoDateTime,
          notes: notes || undefined
        });
        setBookStatus(data.message || "Appointment request submitted.");
        window.setTimeout(() => setBookStatus(""), 2500);
        setAppointmentDate("");
        setAppointmentTime("10:00");
        setNotes("");
        setUploadStatus("");
        return;
      }

      await api.patch(
        "/patients/me",
        {
          phone: bookingPhone || undefined,
          gender: bookingGender || undefined,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      let uploadedFiles: string[] = [];
      if (medicalFiles.length > 0) {
        setUploadStatus("Uploading medical files...");
        const formData = new FormData();
        for (const file of medicalFiles) {
          formData.append("files", file);
        }
        const uploadResult = await api.post("/patients/uploads", formData, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        uploadedFiles = (uploadResult.data?.files || []).map((item: { url: string }) => item.url);
        setUploadStatus("Medical files uploaded.");
      } else {
        setUploadStatus("");
      }

      const { data } = await api.post(
        "/patients/appointments",
        {
          doctor_id: Number(id),
          patient_name: bookingName || undefined,
          time: isoDateTime,
          notes: notes || undefined,
          medical_files: uploadedFiles
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setBookStatus(data.message || "Appointment request submitted.");
      window.setTimeout(() => setBookStatus(""), 2500);
      setAppointmentDate("");
      setAppointmentTime("10:00");
      setNotes("");
      setMedicalFiles([]);
      const refreshed = await api.get("/patients/appointments", { headers: { Authorization: `Bearer ${authToken}` } });
      setPatientAppointments(refreshed.data as PatientAppointment[]);
      setTrackerStatus(`Live updates: ${new Date().toLocaleTimeString()}`);
    } catch (error: any) {
      setBookStatus(String(error?.response?.data?.detail ?? "Failed to submit appointment request."));
      if (String(error?.response?.data?.detail ?? "") === SESSION_EXPIRED_MESSAGE) {
        setAuthError(SESSION_EXPIRED_MESSAGE);
      }
      setUploadStatus("");
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsAuthSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", { email: signInEmail, password: signInPassword });
      const token = data.access_token as string;
      let doctorRouteId: number | null = null;
      try {
        const payload = token.split(".")[1];
        const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        const parsed = JSON.parse(decoded) as { role?: string; doctor_id?: number };
        if (parsed.role !== "patient" && parsed.role !== "doctor") {
          setAuthError("Please sign in from Careleo admin portal for admin access.");
          return;
        }
        if (parsed.role === "doctor") {
          doctorRouteId = parsed.doctor_id ?? null;
        }
      } catch {
        setAuthError("Invalid login response.");
        return;
      }
      setAuthToken(token);
      localStorage.setItem("careleo_clinic_token", token);
      setProfileMenuOpen(false);
      setAuthSuccess("Signed in successfully.");
      if (doctorRouteId) {
        window.location.href = `/clinic/${doctorRouteId}/dashboard`;
      }
    } catch (error: any) {
      setAuthError(String(error?.response?.data?.detail ?? "Sign in failed"));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function resolvePincode(pin: string) {
    const normalized = pin.trim();
    setSignupPincode(normalized);
    if (normalized.length !== 6) {
      setPincodeStatus("");
      setSignupCity("");
      setSignupState("");
      return;
    }
    setPincodeStatus("Looking up city and state...");
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`);
      const payload = (await response.json()) as Array<{ Status: string; PostOffice?: Array<{ District?: string; State?: string }> }>;
      const office = payload?.[0]?.PostOffice?.[0];
      if (payload?.[0]?.Status === "Success" && office?.District && office?.State) {
        setSignupCity(office.District);
        setSignupState(office.State);
        setPincodeStatus("City and state auto-filled.");
        return;
      }
      setPincodeStatus("Unable to auto-fill for this PIN code. Please enter manually.");
    } catch {
      setPincodeStatus("Unable to auto-fill right now. Please enter manually.");
    }
  }

  async function signUp(event: FormEvent) {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsAuthSubmitting(true);
    try {
      await api.post("/patients/signup", {
        doctor_id: Number(id),
        full_name: signupName,
        email: signupEmail,
        password: signupPassword,
        phone: signupPhone || undefined,
        local_address: signupLocalAddress || undefined,
        pincode: signupPincode || undefined,
        city: signupCity || undefined,
        state: signupState || undefined,
        gender: signupGender || undefined,
        date_of_birth: signupDob || undefined,
      });
      const loginResult = await api.post("/auth/login", { email: signupEmail, password: signupPassword });
      const token = loginResult.data.access_token as string;
      setAuthToken(token);
      localStorage.setItem("careleo_clinic_token", token);
      setAuthMode("signin");
      setSignInEmail(signupEmail);
      setSignInPassword("");
      setAuthSuccess("Profile created and signed in.");
    } catch (error: any) {
      setAuthError(String(error?.response?.data?.detail ?? "Sign up failed"));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function signOut() {
    localStorage.removeItem("careleo_clinic_token");
    localStorage.removeItem("careleo_admin_token");
    setAuthToken(null);
    setAuthRole(null);
    setPatientProfile(null);
    setDoctorProfile(null);
    setPatientAppointments([]);
    setTrackerStatus("");
    setProfileMenuOpen(false);
    setAuthSuccess("Signed out.");
  }

  useEffect(() => {
    function handleSessionExpired() {
      setAuthError(SESSION_EXPIRED_MESSAGE);
      setAuthSuccess("");
      setProfileMenuOpen(true);
    }

    window.addEventListener("careleo:session-expired", handleSessionExpired);
    return () => window.removeEventListener("careleo:session-expired", handleSessionExpired);
  }, []);

  function answerQuiz(option: QuizOption) {
    const nextAnswers = [...quizAnswers];
    nextAnswers[quizStep] = option.dosha;
    setQuizAnswers(nextAnswers);
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep((value) => value + 1);
    }
  }

  function resetQuiz() {
    setQuizAnswers([]);
    setQuizStep(0);
  }

  const authVideoSource = authVisual === "success" ? authSuccessVideo : authVisual === "error" ? authErrorVideo : authIdleVideo;
  const authPanelGlow = {
    backgroundImage: `radial-gradient(220px circle at ${authPanelPointer.x}px ${authPanelPointer.y}px, ${darkMode ? "rgba(146, 225, 205, 0.28)" : "rgba(85, 177, 156, 0.26)"}, transparent 70%)`
  };
  const authPanelBorderGlow = {
    backgroundImage: `radial-gradient(180px circle at ${authPanelPointer.x}px ${authPanelPointer.y}px, rgba(255,255,255,0.95), transparent 72%)`,
    WebkitMask:
      "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as const,
    maskComposite: "exclude" as const
  };

  return (
    <PageFade
      className="min-h-screen pb-16"
      style={{
        background: theme.pageGradient
      }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.headerBg
        }}
      >
        <div className="mx-auto flex w-full flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 2xl:px-14">
          <Link to={`/clinic/${id}`} className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={hospitalName}
                className="h-10 w-10 shrink-0 rounded-full border border-white/60 bg-white/90 p-1 object-contain shadow-sm sm:h-12 sm:w-12"
              />
            ) : <Leaf className="h-5 w-5" style={{ color: brandColors[0] }} />}
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-black tracking-tight sm:text-2xl" style={{ color: theme.text }}>{hospitalName}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>100+ Years of Experience</p>
            </div>
          </Link>
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border p-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.surfaceSoft,
                color: theme.text
              }}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a href="#booking" className="rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg sm:text-sm" style={{ background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})` }}>
              Book Consultation
            </a>
            {authRole === "doctor" ? (
              <Link
                to={`/clinic/${id}/dashboard`}
                className="rounded-full border px-4 py-2 text-xs font-bold shadow-sm sm:text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
              >
                Doctor Dashboard
              </Link>
            ) : null}
            {authRole ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((value) => !value)}
                  className="rounded-full border p-2"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
                  aria-label="Open profile menu"
                >
                  <UserRound className="h-5 w-5" />
                </button>
                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border p-4 shadow-2xl" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.textMuted }}>Signed in as</p>
                    <p className="mt-1 text-sm font-bold" style={{ color: theme.text }}>{authRole}</p>
                    {patientProfile ? (
                      <div className="mt-3 space-y-1 text-xs" style={{ color: theme.textMuted }}>
                        <p><b>Name:</b> {patientProfile.full_name}</p>
                        <p><b>Email:</b> {patientProfile.email}</p>
                        <p><b>Phone:</b> {patientProfile.phone || "-"}</p>
                        <p><b>Address:</b> {patientProfile.address || "-"}</p>
                      </div>
                    ) : null}
                    {authRole === "doctor" && doctorProfile?.doctor ? (
                      <div className="mt-3 space-y-1 text-xs" style={{ color: theme.textMuted }}>
                        <p><b>Doctor ID:</b> {doctorProfile.doctor.id}</p>
                        <p><b>Specialization:</b> {doctorProfile.doctor.specialization || "-"}</p>
                        <p><b>Availability:</b> {doctorProfile.doctor.availability || "-"}</p>
                      </div>
                    ) : null}
                    <InteractiveLogoutButton
                      onClick={signOut}
                      className="mt-3 w-full"
                      style={{
                        "--logout-bg": darkMode ? "#17444c" : brandColors[0],
                        "--logout-text": darkMode ? "#eaf8f5" : "#f8fffd",
                        "--logout-door": brandColors[1],
                        "--logout-figure": darkMode ? "#d7b46f" : "#f2c05b",
                        "--logout-shadow": darkMode ? "rgba(4, 18, 24, 0.5)" : "rgba(47, 125, 107, 0.24)"
                      } as CSSProperties}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="snap-section relative mx-auto grid w-full gap-6 overflow-hidden px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-10 2xl:px-14">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(79,111,82,0.35),_transparent_70%)] blur-3xl"
            animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={reduceMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-[-6%] top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(15,76,92,0.3),_transparent_70%)] blur-3xl"
            animate={reduceMotion ? undefined : { y: [0, 12, 0] }}
            transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute bottom-[-20%] left-[45%] h-72 w-72 rounded-full border blur-3xl" style={{ borderColor: darkMode ? "rgba(63,102,111,0.5)" : "rgba(184,211,202,0.5)", backgroundColor: darkMode ? "rgba(15,45,53,0.28)" : "rgba(244,250,245,0.45)" }} />
          {logo ? (
            <div className="absolute left-[8%] top-[12%] flex items-center justify-center sm:left-[10%] lg:left-[12%]">
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                className="h-[140px] w-[140px] object-contain sm:h-[280px] sm:w-[280px] lg:h-[360px] lg:w-[360px]"
                style={{
                  opacity: darkMode ? 0.16 : 0.12,
                  filter: darkMode ? "grayscale(1) brightness(1.15)" : "grayscale(1) saturate(0.8)"
                }}
              />
            </div>
          ) : null}
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: theme.textMuted }}>Holistic Medical Ayurveda</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-5xl" style={{ color: theme.text }}>
            <MotionText as="span" text="100+ Years of Healing Through" className="inline-block" delay={0.1} />
            <span className="block" style={{ color: brandColors[1] }}>
              <MotionText as="span" text="Precision Ayurveda" className="inline-block" delay={0.18} />
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: theme.textMuted }}>
            {description}
          </p>
          <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: theme.gold }}>
            Ayurveda nurtures harmony between body, mind, and nature so healing becomes a way of life, not just a treatment.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#booking" className="rounded-full px-5 py-2 text-sm font-bold text-white" style={{ background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})` }}>
              Start Healing Journey
            </a>
            <a
              href="#prakriti"
              className="rounded-full border px-5 py-2 text-sm font-bold"
              style={{
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: darkMode ? "rgba(24, 60, 67, 0.55)" : "rgba(255, 255, 255, 0.5)"
              }}
            >
              Discover Your Dosha
            </a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.65 }} className="relative z-10">
          <Float>
            <Parallax>
              <div className="relative overflow-hidden rounded-3xl border p-4 shadow-2xl" style={{ borderColor: theme.border, backgroundColor: darkMode ? "#123139" : "#eef6f1" }}>
                <img
                  src={practitionerHeroImage}
                  alt="Senior Ayurvedic practitioner"
                  className="h-[280px] w-full rounded-2xl object-contain object-center sm:h-[420px]"
                  style={{ backgroundColor: darkMode ? "#0b2229" : "#dfeee7" }}
                />
                <div className="absolute inset-x-4 bottom-4 rounded-xl px-4 py-2 backdrop-blur sm:inset-x-auto sm:bottom-8 sm:left-8" style={{ backgroundColor: darkMode ? "rgba(7, 27, 33, 0.76)" : "rgba(255, 251, 243, 0.92)" }}>
                  <p className="font-display text-lg font-bold" style={{ color: theme.text }}>Senior Ayurvedic Practitioner</p>
                  <p className="mt-1 text-sm font-extrabold" style={{ color: brandColors[1] }}>Dr YP Tiwari</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>Dr Yogeshwar Prasad Tiwari | Nadi Pariksha | Panchakarma | Rasayana</p>
                </div>
              </div>
            </Parallax>
          </Float>
        </motion.div>
      </section>

      <motion.section
        className="snap-section mx-auto mt-10 w-full px-4 sm:px-6 lg:px-10 2xl:px-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="rounded-3xl border p-6 shadow-xl sm:p-8"
          style={{
            borderColor: theme.border,
            background: darkMode
              ? "linear-gradient(120deg, rgba(13,44,50,0.96), rgba(18,63,72,0.94))"
              : "linear-gradient(120deg, #eef7f2, #f8f2e4)"
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: theme.textMuted }}>
            Arogya Ashram Philosophy
          </p>
          <MotionText
            as="h2"
            text="Live Pure, Live Sure, Ayurveda's Cure"
            className="mt-2 font-display text-3xl font-extrabold"
            style={{ color: theme.text }}
          />
          <p className="mt-2 text-sm" style={{ color: theme.gold }}>
            सर्वे भवन्तु सुखिनः, सर्वे सन्तु निरामयः।
          </p>
          <p className="mt-1 text-sm" style={{ color: theme.textMuted }}>
            Our care vision: may every patient live happily and remain free from illness through consistent, personalized Ayurvedic healing.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {arogyaWisdom.map((item) => (
              <div
                key={item.verse}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: theme.border,
                  backgroundColor: darkMode ? "rgba(8,30,37,0.7)" : "#fffbf2"
                }}
              >
                <p className="text-sm leading-7 font-semibold" style={{ color: theme.text }}>
                  {item.verse}
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                  {item.meaning}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section id="prakriti" className="snap-section mx-auto mt-12 w-full px-4 sm:px-6 lg:px-10 2xl:px-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="rounded-3xl border p-6 shadow-xl sm:p-8" style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: brandColors[1] }} />
            <MotionText as="h2" text={quizLanguage === "hi" ? "प्रकृति प्रश्नावली" : "Prakriti Quiz"} className="font-display text-3xl font-extrabold" style={{ color: theme.text }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {quizLanguage === "hi"
                ? "कुछ प्रश्नों के उत्तर देकर अपनी प्रमुख दोष प्रवृत्ति जानें।"
                : "Answer a few questions to discover your dominant dosha."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuizLanguage("en")}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={quizLanguage === "en" ? { backgroundColor: brandColors[1], color: "#fff" } : { border: `1px solid ${theme.border}`, color: theme.textMuted }}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setQuizLanguage("hi")}
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={quizLanguage === "hi" ? { backgroundColor: brandColors[0], color: "#fff" } : { border: `1px solid ${theme.border}`, color: theme.textMuted }}
              >
                हिन्दी
              </button>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: darkMode ? "#244852" : "#d6e6df" }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: brandColors[0] }} animate={{ width: `${quizProgress}%` }} />
          </div>

          <AnimatePresence mode="wait">
            {dominantDosha ? (
              <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6 rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <p className="text-sm" style={{ color: theme.textMuted }}>
                  {quizLanguage === "hi" ? "आपकी प्रारंभिक प्रकृति संकेत:" : "Your preliminary Prakriti signal:"}
                </p>
                <p className="mt-1 font-display text-4xl font-extrabold" style={{ color: brandColors[1] }}>{activeDoshaContent[dominantDosha].title}</p>
                <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>{activeDoshaContent[dominantDosha].summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: theme.surfaceSoft, color: theme.text }}>Vata Score: <span className="font-extrabold">{doshaScore.Vata}</span></div>
                  <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: theme.surfaceSoft, color: theme.text }}>Pitta Score: <span className="font-extrabold">{doshaScore.Pitta}</span></div>
                  <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: theme.surfaceSoft, color: theme.text }}>Kapha Score: <span className="font-extrabold">{doshaScore.Kapha}</span></div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.gold }}>{quizLanguage === "hi" ? "मुख्य शक्तियाँ" : "Core Strengths"}</p>
                    <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.textMuted }}>
                      {activeDoshaContent[dominantDosha].strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.gold }}>{quizLanguage === "hi" ? "संतुलन के उपाय" : "Balancing Focus"}</p>
                    <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.textMuted }}>
                      {activeDoshaContent[dominantDosha].balancing.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>
                  {quizLanguage === "hi"
                    ? "यह एक प्रारंभिक आकलन है। सटीक निदान के लिए नाड़ी परीक्षा परामर्श बुक करें।"
                    : "This is an indicative assessment. For accurate diagnosis, book Nadi Pariksha consultation."}
                </p>
                <button onClick={resetQuiz} className="mt-4 rounded-full px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: brandColors[0] }}>
                  {quizLanguage === "hi" ? "फिर से शुरू करें" : "Retake Quiz"}
                </button>
              </motion.div>
            ) : (
              <motion.div key={quizStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-6">
                <p className="text-sm font-semibold" style={{ color: theme.textMuted }}>
                  {quizLanguage === "hi"
                    ? `प्रश्न ${quizStep + 1} / ${activeQuizQuestions.length}`
                    : `Question ${quizStep + 1} of ${activeQuizQuestions.length}`}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold" style={{ color: theme.text }}>{activeQuizQuestions[quizStep].question}</h3>
                <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>{activeQuizQuestions[quizStep].hint}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {activeQuizQuestions[quizStep].options.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => answerQuiz(option)}
                      className="rounded-xl border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      <motion.section
        className="snap-section relative mt-12 min-h-[100svh] w-full overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
      >
        <div className="absolute inset-0" style={{ background: darkMode ? "radial-gradient(circle at center, rgba(24,78,88,0.34), #041116 78%)" : "radial-gradient(circle at center, rgba(205,233,225,0.85), #e7f3ee 78%)" }} />
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-contain"
          >
            <source src={logoJourneyVideo} type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0" style={{ background: darkMode ? "linear-gradient(180deg, rgba(5,14,18,0.24), rgba(5,14,18,0.74))" : "linear-gradient(180deg, rgba(244,249,245,0.04), rgba(16,39,33,0.52))" }} />
        <div className="relative z-10 flex min-h-[100svh] items-end px-6 py-10 sm:px-8 lg:px-12 2xl:px-16">
          <div className="max-w-2xl rounded-[28px] border px-5 py-4 backdrop-blur-md sm:px-6" style={{ borderColor: darkMode ? "rgba(151, 197, 188, 0.22)" : "rgba(255, 255, 255, 0.3)", backgroundColor: darkMode ? "rgba(6, 24, 29, 0.48)" : "rgba(255, 255, 255, 0.18)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Nature And Ayurveda</p>
            <p className="mt-3 font-display text-3xl font-extrabold text-white sm:text-4xl">
              From leaf, light, and life emerges the mark of healing
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">
              The rhythm of nature, the calm of the elements, and the wisdom of Ayurveda come together here to shape the Arogya Ashram identity.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="snap-section mx-auto mt-12 grid w-full gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-10 2xl:px-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="rounded-3xl border p-6 shadow-xl sm:p-8" style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" style={{ color: brandColors[1] }} />
            <h2 className="font-display text-3xl font-extrabold" style={{ color: theme.text }}>Path to Recovery</h2>
          </div>
          <div className="mt-6 space-y-4">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon;
              const active = timelineIndex === index;
              return (
                <button key={step.title} onClick={() => setTimelineIndex(index)} className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition" style={{ borderColor: theme.border, backgroundColor: active ? theme.surface : theme.surfaceCard }}>
                  <Icon className="mt-0.5 h-5 w-5" style={{ color: active ? brandColors[1] : theme.textMuted }} />
                  <div>
                    <p className="font-display text-lg font-bold" style={{ color: theme.text }}>{step.title}</p>
                    <p className="text-sm" style={{ color: theme.textMuted }}>{step.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border p-6 shadow-xl sm:p-8" style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}>
          <div className="flex items-center justify-between">
          <MotionText as="h2" text="Patient Stories" className="font-display text-3xl font-extrabold" style={{ color: theme.text }} />
            <div className="flex gap-2">
              <button onClick={() => setTestimonialIndex((v) => (v - 1 + testimonials.length) % testimonials.length)} className="rounded-full border p-2" style={{ borderColor: theme.border, color: theme.text }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setTestimonialIndex((v) => (v + 1) % testimonials.length)} className="rounded-full border p-2" style={{ borderColor: theme.border, color: theme.text }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={testimonialIndex} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -22 }} className="mt-5 rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <div className="flex gap-1">
                {Array.from({ length: testimonials[testimonialIndex].rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4" style={{ fill: theme.gold, color: theme.gold }} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>"{testimonials[testimonialIndex].text}"</p>
              <p className="mt-4 font-display text-lg font-bold" style={{ color: theme.text }}>{testimonials[testimonialIndex].name}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{testimonials[testimonialIndex].concern}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      <motion.section id="booking" className="snap-section mx-auto mt-12 w-full px-4 sm:px-6 lg:px-10 2xl:px-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="rounded-3xl border p-6 shadow-xl sm:p-8" style={{ borderColor: theme.border, backgroundColor: theme.surfaceSoft }}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" style={{ color: brandColors[1] }} />
            <MotionText as="h2" text="Book Consultation" className="font-display text-3xl font-extrabold" style={{ color: theme.text }} />
          </div>
          <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>Book as a guest or sign in to save your profile for faster future visits.</p>

          {!authRole ? (
            <motion.div
              className="relative mt-5 overflow-hidden rounded-[30px] p-[1.5px]"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setAuthPanelPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
              }}
              style={{
                background: `conic-gradient(from 160deg, ${brandColors[0]}, rgba(255,255,255,0.82), ${brandColors[1]}, rgba(255,255,255,0.18), ${brandColors[0]})`,
                boxShadow: darkMode ? "0 28px 90px rgba(3, 15, 19, 0.5)" : "0 28px 90px rgba(28, 67, 54, 0.18)"
              }}
            >
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={reduceMotion ? undefined : { duration: 14, ease: "linear", repeat: Infinity }}
                style={{
                  background: `conic-gradient(from 180deg, transparent 0deg, ${brandColors[0]} 60deg, transparent 120deg, ${brandColors[1]} 210deg, transparent 280deg, rgba(255,255,255,0.9) 330deg, transparent 360deg)`
                }}
              />
              <div className="relative overflow-hidden rounded-[28px]" style={{ backgroundColor: darkMode ? "#082028" : "#f6fbf8" }}>
                <div className="pointer-events-none absolute inset-0 opacity-90" style={authPanelGlow} />
                <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-transparent p-[1.5px] opacity-90" style={authPanelBorderGlow} />
                <div className="grid lg:grid-cols-[1.05fr_1fr]">
                  <div className="relative min-h-[280px] overflow-hidden lg:min-h-[560px]">
                    <motion.video
                      key={authVideoSource}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                      initial={{ opacity: 0.2, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <source src={authVideoSource} type="video/mp4" />
                    </motion.video>
                    <div className="absolute inset-0" style={{ background: darkMode ? "linear-gradient(180deg, rgba(4,14,18,0.12), rgba(4,14,18,0.72))" : "linear-gradient(180deg, rgba(10,42,36,0.05), rgba(11,39,33,0.65))" }} />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Arogya Ashram Access</p>
                      <p className="mt-3 max-w-sm font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                        {authVisual === "success" ? "Healing journey unlocked." : authVisual === "error" ? "Let&apos;s try that once more." : "Step into a calmer care experience."}
                      </p>
                      <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
                        {authMode === "signin"
                          ? "Use your patient credentials to continue into booking, prescriptions, and appointment tracking."
                          : "Create your patient profile inside the same animated shell, then continue straight into consultation booking."}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    className="relative p-5 sm:p-8 lg:p-10"
                    animate={reduceMotion ? undefined : { x: authMode === "signin" ? 0 : -6 }}
                    transition={reduceMotion ? undefined : { duration: 0.45, ease: "easeOut" }}
                    style={{ background: darkMode ? "linear-gradient(180deg, rgba(8,28,35,0.92), rgba(10,38,46,0.96))" : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(241,248,244,0.97))" }}
                  >
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-6 top-6 h-28 rounded-[24px] blur-3xl"
                      animate={reduceMotion ? undefined : {
                        opacity: authMode === "signin" ? 0.22 : 0.3,
                        x: authMode === "signin" ? -12 : 18,
                        scale: authMode === "signin" ? 1 : 1.06
                      }}
                      transition={reduceMotion ? undefined : { duration: 0.45, ease: "easeOut" }}
                      style={{
                        background: authMode === "signin"
                          ? `linear-gradient(120deg, ${brandColors[1]}55, transparent 72%)`
                          : `linear-gradient(120deg, ${brandColors[0]}66, transparent 72%)`
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: theme.textMuted }}>Patient Login</p>
                        <h3 className="mt-2 font-display text-3xl font-extrabold" style={{ color: theme.text }}>
                          {authMode === "signin" ? "Sign In" : "Create Account"}
                        </h3>
                      </div>
                      <div className="flex w-full flex-col gap-2 rounded-[24px] border p-1 sm:w-auto sm:flex-row sm:rounded-full" style={{ borderColor: theme.border, backgroundColor: darkMode ? "rgba(17,46,53,0.78)" : "rgba(237,246,241,0.92)" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signin");
                            setAuthError("");
                            setAuthSuccess("");
                          }}
                          className="rounded-full px-4 py-2 text-sm font-bold transition"
                          style={
                            authMode === "signin"
                              ? { background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})`, color: "#ffffff" }
                              : { color: theme.text, backgroundColor: "transparent" }
                          }
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signup");
                            setAuthError("");
                            setAuthSuccess("");
                          }}
                          className="rounded-full px-4 py-2 text-sm font-bold transition"
                          style={
                            authMode === "signup"
                              ? { background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})`, color: "#ffffff" }
                              : { color: theme.text, backgroundColor: "transparent" }
                          }
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
                      Use your patient credentials to continue faster, track appointments, and keep prescriptions in one place.
                    </p>

                    <div className="relative mt-6 overflow-hidden rounded-[30px] border p-3 sm:p-4" style={{ borderColor: theme.border, backgroundColor: darkMode ? "rgba(10,34,42,0.74)" : "rgba(255,255,255,0.8)" }}>
                      <div
                        className="pointer-events-none absolute top-3 bottom-3 w-[calc(50%-0.375rem)] rounded-[22px]"
                        style={{
                          left: authMode === "signin" ? "0.75rem" : "calc(50% + 0rem)",
                          width: "calc(50% - 0.75rem)",
                          background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})`,
                          transition: "left 320ms ease"
                        }}
                      />
                      <div className="relative z-10 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signin");
                            setAuthError("");
                            setAuthSuccess("");
                          }}
                          className="rounded-[22px] px-4 py-3 text-sm font-bold transition"
                          style={{ color: authMode === "signin" ? "#ffffff" : theme.text }}
                        >
                          Login
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("signup");
                            setAuthError("");
                            setAuthSuccess("");
                          }}
                          className="rounded-[22px] px-4 py-3 text-sm font-bold transition"
                          style={{ color: authMode === "signup" ? "#ffffff" : theme.text }}
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {authMode === "signin" ? (
                        <motion.form
                          key="signin-form"
                          onSubmit={signIn}
                          className="mt-6 grid gap-3 sm:grid-cols-2"
                          initial={{ opacity: 0, x: -28, rotateY: -8 }}
                          animate={{ opacity: 1, x: 0, rotateY: 0 }}
                          exit={{ opacity: 0, x: 28, rotateY: 8 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <input value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Email" type="email" required />
                          <input value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Password" type="password" required />
                          <button disabled={isAuthSubmitting} type="submit" className="rounded-[22px] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2" style={{ background: `linear-gradient(120deg, ${brandColors[1]}, ${brandColors[0]})` }}>
                            {isAuthSubmitting ? "Authenticating..." : "Continue"}
                          </button>
                        </motion.form>
                      ) : (
                        <motion.form
                          key="signup-form"
                          onSubmit={signUp}
                          className="mt-6 grid gap-3 sm:grid-cols-2"
                          initial={{ opacity: 0, x: 28, rotateY: 8 }}
                          animate={{ opacity: 1, x: 0, rotateY: 0 }}
                          exit={{ opacity: 0, x: -28, rotateY: -8 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <input value={signupName} onChange={(e) => setSignupName(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Full Name" required />
                          <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Email" type="email" required />
                          <input value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Password" type="password" required />
                          <input value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="Phone Number" />
                          <select value={signupGender} onChange={(e) => setSignupGender(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }}>
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <input value={signupDob} onChange={(e) => setSignupDob(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} type="date" />
                          <input
                            value={signupPincode}
                            onChange={(e) => resolvePincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="rounded-[22px] border p-3.5 shadow-sm"
                            style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }}
                            placeholder="PIN Code"
                          />
                          <input value={signupCity} onChange={(e) => setSignupCity(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="City" />
                          <input value={signupState} onChange={(e) => setSignupState(e.target.value)} className="rounded-[22px] border p-3.5 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }} placeholder="State" />
                          <textarea
                            value={signupLocalAddress}
                            onChange={(e) => setSignupLocalAddress(e.target.value)}
                            className="rounded-[22px] border p-3.5 shadow-sm sm:col-span-2"
                            style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText, boxShadow: darkMode ? "inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.55)" }}
                            placeholder="Local Address (House/Area/Landmark)"
                          />
                          {pincodeStatus ? <p className="text-xs sm:col-span-2" style={{ color: theme.textMuted }}>{pincodeStatus}</p> : null}
                          <button disabled={isAuthSubmitting} type="submit" className="rounded-[22px] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2" style={{ background: `linear-gradient(120deg, ${brandColors[0]}, ${brandColors[1]})` }}>
                            {isAuthSubmitting ? "Creating profile..." : "Create Patient Profile"}
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {authError ? (
                        <motion.p
                          key="auth-error"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
                          style={{ borderColor: "rgba(190, 24, 93, 0.24)", backgroundColor: darkMode ? "rgba(95, 27, 39, 0.42)" : "rgba(255, 236, 241, 0.9)", color: darkMode ? "#ffc5d2" : "#9f1239" }}
                        >
                          {authError}
                        </motion.p>
                      ) : authSuccess ? (
                        <motion.p
                          key="auth-success"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold"
                          style={{ borderColor: "rgba(5, 150, 105, 0.24)", backgroundColor: darkMode ? "rgba(12, 74, 49, 0.46)" : "rgba(228, 252, 240, 0.92)", color: darkMode ? "#c3f7d5" : "#047857" }}
                        >
                          {authSuccess}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : null}

          <form onSubmit={bookAppointment} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                className="rounded-xl border p-3"
                style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
                placeholder="Full Name"
                required
              />
              {!authRole || authRole !== "patient" ? (
                <input
                  value={bookingEmail}
                  onChange={(e) => setBookingEmail(e.target.value)}
                  className="rounded-xl border p-3"
                  style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
                  placeholder="Email"
                  type="email"
                  required
                />
              ) : null}
              <input
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                className="rounded-xl border p-3"
                style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
                placeholder="Phone Number"
                required
              />
              <select
                value={bookingGender}
                onChange={(e) => setBookingGender(e.target.value)}
                className="rounded-xl border p-3"
                style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }} type="date" required />
              <input value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }} type="time" required />
              {authRole === "patient" ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold" style={{ color: theme.text }}>Upload Medical Files (PDF/JPG/PNG)</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setMedicalFiles(Array.from(e.target.files || []))}
                    className="w-full rounded-xl border p-3 text-sm"
                    style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }}
                  />
                  {medicalFiles.length > 0 ? (
                    <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>{medicalFiles.length} file(s) selected for upload.</p>
                  ) : null}
                </div>
              ) : null}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl border p-3 sm:col-span-2" style={{ borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.inputText }} placeholder="Symptoms / Notes (optional)" />
              <button type="submit" className="rounded-xl px-4 py-3 text-sm font-extrabold text-white sm:col-span-2" style={{ backgroundColor: brandColors[1] }}>
                Request Appointment
              </button>
            </form>
          {uploadStatus ? <p className="mt-2 text-xs font-semibold" style={{ color: theme.text }}>{uploadStatus}</p> : null}
          {bookStatus ? <p className="mt-3 text-sm font-semibold" style={{ color: theme.text }}>{bookStatus}</p> : null}

          {authRole === "patient" ? (
            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold" style={{ color: theme.text }}>Your Appointment Status Tracker</p>
                <span className="text-xs" style={{ color: theme.textMuted }}>{trackerStatus || "Live updates enabled"}</span>
              </div>
              <div className="mt-3 space-y-2">
                {patientAppointments.length === 0 ? <p className="text-sm" style={{ color: theme.textMuted }}>No appointments yet.</p> : null}
                {patientAppointments.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceCard }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs" style={{ color: theme.textMuted }}>{new Date(item.time).toLocaleString()}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                          item.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.notes ? <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>Notes: {item.notes}</p> : null}
                    {item.medical_files && item.medical_files.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.medical_files.map((fileUrl) => (
                          <a key={fileUrl} href={fileUrl} target="_blank" rel="noreferrer" className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: theme.border, color: theme.text }}>
                            Medical File
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {authRole === "patient" ? (
            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold" style={{ color: theme.text }}>Your Prescriptions</p>
                <span className="text-xs" style={{ color: theme.textMuted }}>Updated after each visit</span>
              </div>
              <div className="mt-3 space-y-3">
                {patientPrescriptions.length === 0 ? <p className="text-sm" style={{ color: theme.textMuted }}>No prescriptions yet.</p> : null}
                {patientPrescriptions.map((item) => (
                  <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceCard }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs" style={{ color: theme.textMuted }}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: theme.text, backgroundColor: darkMode ? "#1f4b53" : "#dff0e8" }}>Prescription</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold" style={{ color: theme.text }}>Diagnosis</p>
                    <p className="text-sm" style={{ color: theme.textMuted }}>{item.diagnosis}</p>
                    <p className="mt-2 text-sm font-semibold" style={{ color: theme.text }}>Medicines</p>
                    <p className="text-sm" style={{ color: theme.textMuted }}>{item.drug_names.join(", ")}</p>
                    {item.instructions ? (
                      <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>Instructions: {item.instructions}</p>
                    ) : null}
                    {item.end_date ? (
                      <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>Course ends on {new Date(item.end_date).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </motion.section>

    </PageFade>
  );
}

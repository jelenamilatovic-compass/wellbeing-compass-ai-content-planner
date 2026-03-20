import React, { useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Target,
  MessageSquare,
  Instagram,
  Linkedin,
  Copy,
  Check,
  Wand2,
  Layers3,
  Users,
  Download,
  Library,
  PenTool,
  Filter,
  AlertCircle,
  Mail,
  MapPin,
  Building2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

const DAYS_BY_FREQUENCY = {
  1: ["Ponedjeljak"],
  2: ["Ponedjeljak", "Četvrtak"],
  3: ["Ponedjeljak", "Srijeda", "Petak"],
  4: ["Ponedjeljak", "Utorak", "Četvrtak", "Subota"],
  5: ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak"],
};

const CONTENT_TYPE_OPTIONS = [
  "Edukativni",
  "Autoritativni",
  "Konverzijski",
  "Storytelling",
  "Case study",
  "Lični osvrt",
  "Behind the scenes",
  "Thought leadership",
  "FAQ / objections",
  "Lead magnet",
];

const TONE_OPTIONS = [
  "Stručan i autoritativan",
  "Topao i empatičan",
  "Direktan i jasan",
  "Premium i sofisticiran",
  "Edukativan i smiren",
  "Provokativan ali profesionalan",
];

const GOAL_OPTIONS = [
  "Awareness",
  "Engagement",
  "Lead generation",
  "Konsultacije / upiti",
  "Prodaja",
  "Pozicioniranje eksperta",
  "Nurture / povjerenje",
];

const PLATFORM_OPTIONS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "both", label: "Oba" },
];

const BUYER_STAGE_OPTIONS = ["Cold", "Warm", "Hot"];
const EXPORT_OPTIONS = ["PDF", "DOCX", "CSV"];
const REWRITE_OPTIONS = ["LinkedIn post", "Instagram carousel", "Reel script", "Email"];

const FORMAT_RULES = {
  linkedin: ["Dugi post", "Članak", "Dokument post", "Case study", "Komentar na trend"],
  instagram: ["Carousel", "Reel", "Single image", "Story sequence"],
  both: ["Carousel", "Reel", "Dugi post", "Single image", "Thought leadership post"],
};

const DEFAULT_CTA_LIBRARY = [
  "Pošalji DM za detalje",
  "Komentariši riječ PLAN i šaljem dalje",
  "Preuzmi vodič / lead magnet",
  "Zakaži konsultacije",
  "Prijavi se na newsletter",
  "Odgovori sa DA ako želiš nastavak",
];

function countWords(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

function chunkText(text, max = 600) {
  if (!text) return [];
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  const paragraphs = cleaned.split(/\n\n+/);
  const chunks = [];
  let current = "";

  paragraphs.forEach((p) => {
    if ((current + "\n\n" + p).length <= max) {
      current = current ? `${current}\n\n${p}` : p;
    } else {
      if (current) chunks.push(current);
      current = p;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function deriveAngle(type, goal, stage) {
  const stageLabel = stage ? ` za publiku u ${stage.toLowerCase()} fazi` : "";
  const map = {
    Edukativni: `objasni temu jasno i praktično, sa fokusom na korist za publiku i cilj ${goal.toLowerCase()}${stageLabel}`,
    Autoritativni: `postavi autora kao stručnog vodiča, uz jasnu perspektivu i signal kompetencije za cilj ${goal.toLowerCase()}${stageLabel}`,
    Konverzijski: `vodi korisnika ka odluci kroz jasan problem, rješenje, benefit i CTA sa ciljem ${goal.toLowerCase()}${stageLabel}`,
    Storytelling: `ispričaj priču koja gradi vezu, kontekst i emocionalno razumijevanje teme${stageLabel}`,
    "Case study": `pretvori temu u primjer iz prakse sa problemom, pristupom i rezultatom${stageLabel}`,
    "Lični osvrt": `koristi lični ugao, iskustvo i refleksiju bez gubitka stručnosti${stageLabel}`,
    "Behind the scenes": `prikaži proces, način razmišljanja i logiku iza rada ili metode${stageLabel}`,
    "Thought leadership": `zauzmi stav o temi i prevedi ga u širi tržišni ili strateški kontekst${stageLabel}`,
    "FAQ / objections": `obradi najčešće dileme, otpore i pitanja koja sprečavaju akciju${stageLabel}`,
    "Lead magnet": `pretvori temu u vrijedan sadržaj koji motiviše ostavljanje kontakta ili naredni korak${stageLabel}`,
  };
  return map[type] || `obradi temu kroz ugao koji podržava cilj ${goal.toLowerCase()}${stageLabel}`;
}

function suggestFormat(platform, type, index) {
  const rules = FORMAT_RULES[platform] || FORMAT_RULES.both;
  if (type === "Konverzijski") return platform === "instagram" ? "Reel" : "Dugi post";
  if (type === "Case study") return platform === "instagram" ? "Carousel" : "Case study";
  if (type === "Storytelling") return platform === "instagram" ? "Reel" : "Dugi post";
  return rules[index % rules.length];
}

function parseLines(text) {
  return (text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function slugify(value) {
  return (value || "content-plan")
    .toLowerCase()
    .replace(/[^a-z0-9čćžšđ-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makePrompt({ form, extractedText, schedule }) {
  const selectedTypes = form.contentTypes.length ? form.contentTypes.join(", ") : "Edukativni, Autoritativni";
  const pillars = parseLines(form.contentPillars).join(", ") || "Nisu definisani";
  const ctas = parseLines(form.ctaLibrary).join(" | ") || "Nisu definisani";
  const brandVoice = `
- Brand voice opis: ${form.brandVoiceDescription || "Nije definisano"}
- Omiljene riječi / fraze: ${form.brandVoicePreferred || "Nije definisano"}
- Zabranjene riječi / fraze: ${form.brandVoiceAvoid || "Nije definisano"}
- Formalnost: ${form.formality}`;

  return `Ti si senior content strategist i copywriter.

Na osnovu sljedećeg dokumenta ili inputa napravi content plan.

ULAZNI SADRŽAJ:
${extractedText || form.topicNotes || "Nije unesen dokument. Koristi samo postavke ispod."}

POSTAVKE:
- Tema / oblast: ${form.topicTitle || "Nije definisano"}
- Cilj: ${form.goal}
- Platforma: ${form.platform}
- Broj objava sedmično: ${form.frequency}
- Ton: ${form.tone}
- Buyer stage: ${form.buyerStage}
- Ciljna publika: ${form.audience || "Nije definisana"}
- Ponuda / CTA fokus: ${form.offer || "Nije definisano"}
- Vrste sadržaja: ${selectedTypes}
- Content pillars: ${pillars}
- CTA library: ${ctas}
${brandVoice}
- Dodatne instrukcije: ${form.instructions || "Nema"}

VRATI ISKLJUČIVO VALIDAN JSON u ovom obliku:
{
  "posts": [
    {
      "day": "Ponedjeljak",
      "title": "...",
      "goal": "...",
      "buyerStage": "...",
      "format": "...",
      "contentType": "...",
      "pillar": "...",
      "angle": "...",
      "visual": "...",
      "cta": "...",
      "outline": "...",
      "rewrite": "..."
    }
  ]
}

ZADATAK:
1. Napravi ${form.frequency} objava za jednu sedmicu.
2. Za svaku objavu definiši sve gore navedene ključeve.
3. Ako je platforma Instagram, predloži carousel ili reel kada to ima više smisla.
4. Ako je platforma LinkedIn, predloži dugi post, članak ili dokument post kada to ima više smisla.
5. Zadrži ton: ${form.tone}.
6. Poštuj brand voice i izbjegni zabranjene fraze.
7. Piši na srpskom / crnogorskom jeziku.
8. Ne budi generičan; koristi jezik i logiku koja odražava stručnost.
9. Rewrite polje neka bude prilagođena verzija za: ${form.rewriteMode}.

RASPORED:
${schedule.map((item, i) => `${i + 1}. ${item.day} — ${item.contentType} — ${item.format}`).join("\n")}`;
}

function generateStructuredDraft(form, extractedText) {
  const days = DAYS_BY_FREQUENCY[form.frequency] || DAYS_BY_FREQUENCY[3];
  const chunks = chunkText(extractedText || form.topicNotes, 700);
  const fallbackBase = extractedText || form.topicNotes || form.topicTitle || "Tema nije unijeta";
  const contentTypes = form.contentTypes.length ? form.contentTypes : ["Edukativni", "Autoritativni", "Konverzijski"];
  const pillars = parseLines(form.contentPillars);
  const ctas = parseLines(form.ctaLibrary);

  return days.map((day, index) => {
    const contentType = contentTypes[index % contentTypes.length];
    const format = suggestFormat(form.platform, contentType, index);
    const source = chunks[index % Math.max(chunks.length, 1)] || fallbackBase;
    const shortSource = String(source).replace(/\n+/g, " ").slice(0, 260);
    const angle = deriveAngle(contentType, form.goal, form.buyerStage);
    const pillar = pillars[index % Math.max(pillars.length, 1)] || "Glavna tema";
    const cta = ctas[index % Math.max(ctas.length, 1)] || form.offer || "Pozovi publiku na naredni korak";

    const hook =
      contentType === "Konverzijski"
        ? "Najveća greška nije u temi — nego u tome kako je pretvaraš u odluku."
        : contentType === "Case study"
        ? "Evo kako ista tema izgleda kada je prevedeš u sistem, a ne samo u objavu."
        : contentType === "Storytelling"
        ? "Iskustvo me je naučilo da publika ne reaguje na informacije, nego na jasno vođen kontekst."
        : "Tema sama po sebi nije dovoljna. Važno je kako je strukturiraš da bi publika razumjela zašto je bitna.";

    const title =
      form.platform === "instagram"
        ? `${contentType}: ${form.topicTitle || "Tema"}`
        : `${form.topicTitle || "Tema"} — ${contentType.toLowerCase()} ugao`;

    const outline = [
      `Hook: ${hook}`,
      `Ključna ideja: ${angle}.`,
      `Content pillar: ${pillar}.`,
      `Buyer stage: ${form.buyerStage}.`,
      `Input iz dokumenta: ${shortSource}.`,
      `Vrijednost za publiku: prevedi temu u jasan problem, kontekst i korist.`,
      `CTA: ${cta}.`,
      `Rewrite mode preporuka: prilagodi i u format “${form.rewriteMode}”.`,
    ].join("\n");

    return {
      day,
      title,
      goal: form.goal,
      format,
      contentType,
      angle,
      pillar,
      cta,
      buyerStage: form.buyerStage,
      visual:
        format === "Carousel"
          ? "Serija čistih slide-ova sa 1 idejom po slide-u i jasnim CTA završetkom"
          : format === "Reel"
          ? "Talking head / voiceover sa tekstualnim overlay-ima i 3 ključne poruke"
          : format === "Document post"
          ? "PDF / dokument sa strukturiranim tačkama i premium naslovnom stranicom"
          : "Minimalistički vizual sa jednom jakom porukom i jasnom hijerarhijom teksta",
      outline,
      rewrite: `Prepiši ovu objavu u format “${form.rewriteMode}” uz isti ton i isti CTA.`,
    };
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-800">{label}</label>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function PillToggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function SidebarCard({ icon, title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AIContentPlannerApp() {
  const [form, setForm] = useState({
    topicTitle: "",
    topicNotes: "",
    audience: "",
    goal: "Pozicioniranje eksperta",
    platform: "both",
    frequency: 3,
    tone: "Stručan i autoritativan",
    contentTypes: ["Edukativni", "Autoritativni", "Konverzijski"],
    offer: "",
    instructions: "",
    buyerStage: "Warm",
    contentPillars: "Strateški marketing\nContent sistem\nKonverzija i povjerenje",
    ctaLibrary: DEFAULT_CTA_LIBRARY.join("\n"),
    brandVoiceDescription: "Jasan, stručan, nenametljiv, premium i sistemski orijentisan glas.",
    brandVoicePreferred: "sistem, logika, struktura, povjerenje, vrijednost, rast",
    brandVoiceAvoid: "viralno po svaku cijenu, hack, trik, instant, magično",
    formality: "Srednje formalno",
    rewriteMode: "LinkedIn post",
    exportFormat: "PDF",
  });

  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState([]);
  const [activePreview, setActivePreview] = useState("schedule");
  const [apiError, setApiError] = useState("");

  const schedule = useMemo(() => {
    const days = DAYS_BY_FREQUENCY[form.frequency] || DAYS_BY_FREQUENCY[3];
    const types = form.contentTypes.length ? form.contentTypes : ["Edukativni"];
    return days.map((day, i) => {
      const contentType = types[i % types.length];
      return {
        day,
        contentType,
        format: suggestFormat(form.platform, contentType, i),
      };
    });
  }, [form]);

  const prompt = useMemo(() => makePrompt({ form, extractedText, schedule }), [form, extractedText, schedule]);

  const documentStats = useMemo(() => {
    const text = extractedText || form.topicNotes;
    return {
      chars: text.length,
      words: countWords(text),
      pagesEstimate: Math.max(1, Math.ceil(countWords(text) / 450)),
    };
  }, [extractedText, form.topicNotes]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleContentType(type) {
    setForm((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter((t) => t !== type)
        : [...prev.contentTypes, type],
    }));
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setApiError("");

    const ext = file.name.toLowerCase().split(".").pop();

    if (["txt", "md", "json", "csv"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        setExtractedText(result);
        if (!form.topicTitle && file.name) {
          updateField("topicTitle", file.name.replace(/\.[^.]+$/, ""));
        }
      };
      reader.readAsText(file, "utf-8");
      return;
    }

    if (["pdf", "docx"].includes(ext)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/.netlify/functions/extract-document-text", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Greška pri ekstrakciji dokumenta.");
        }

        setExtractedText(data.text || "");
        if (!form.topicTitle && file.name) {
          updateField("topicTitle", file.name.replace(/\.[^.]+$/, ""));
        }
      } catch (error) {
        setApiError(error.message || "Ne mogu da pročitam dokument.");
      }
      return;
    }

    setApiError("Podržani formati su TXT, MD, CSV, JSON, PDF i DOCX.");
  }

  function handleGeneratePlan() {
    setApiError(
      "Prompt Mode je aktivan. Aplikacija generiše plan i draft strukturu bez direktnog AI API poziva. Za finalni copy koristi Prompt tab i ChatGPT."
    );
    const fallback = generateStructuredDraft(form, extractedText);
    setGeneratedDrafts(fallback);
    setActivePreview("drafts");
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  async function handleExport() {
    if (!generatedDrafts.length) {
      setApiError("Prvo generiši plan prije izvoza.");
      return;
    }

    const filenameBase = slugify(form.topicTitle || "content-plan");

    if (form.exportFormat === "CSV") {
      const headers = [
        "day",
        "title",
        "goal",
        "buyerStage",
        "format",
        "contentType",
        "pillar",
        "angle",
        "visual",
        "cta",
        "outline",
        "rewrite",
      ];

      const rows = generatedDrafts.map((item) =>
        headers
          .map((key) => {
            const value = String(item[key] ?? "").replace(/"/g, '""');
            return `"${value}"`;
          })
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filenameBase}.csv`);
      return;
    }

    if (form.exportFormat === "PDF") {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 42;
      let y = 48;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(form.topicTitle || "Content Plan", margin, y);
      y += 24;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Goal: ${form.goal} | Platform: ${form.platform} | Frequency: ${form.frequency}`, margin, y);
      y += 24;

      generatedDrafts.forEach((item, index) => {
        if (y > 730) {
          doc.addPage();
          y = 48;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`${index + 1}. ${item.day} — ${item.title || "Objava"}`, margin, y);
        y += 18;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const text = [
          `Format: ${item.format || ""}`,
          `Tip: ${item.contentType || ""}`,
          `Goal: ${item.goal || ""}`,
          `Buyer stage: ${item.buyerStage || ""}`,
          `Pillar: ${item.pillar || ""}`,
          `CTA: ${item.cta || ""}`,
          `Angle: ${item.angle || ""}`,
          `Visual: ${item.visual || ""}`,
          `Outline: ${item.outline || ""}`,
          `Rewrite: ${item.rewrite || ""}`,
        ].join("\n");

        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 12 + 16;
      });

      doc.save(`${filenameBase}.pdf`);
      return;
    }

    if (form.exportFormat === "DOCX") {
      const children = [
        new Paragraph({
          children: [new TextRun({ text: form.topicTitle || "Content Plan", bold: true, size: 32 })],
        }),
        new Paragraph({
          children: [new TextRun(`Goal: ${form.goal} | Platform: ${form.platform} | Frequency: ${form.frequency}`)],
        }),
        ...generatedDrafts.flatMap((item, index) => [
          new Paragraph({
            children: [new TextRun({ text: `${index + 1}. ${item.day} — ${item.title || "Objava"}`, bold: true })],
          }),
          new Paragraph(`Format: ${item.format || ""}`),
          new Paragraph(`Tip: ${item.contentType || ""}`),
          new Paragraph(`Goal: ${item.goal || ""}`),
          new Paragraph(`Buyer stage: ${item.buyerStage || ""}`),
          new Paragraph(`Pillar: ${item.pillar || ""}`),
          new Paragraph(`CTA: ${item.cta || ""}`),
          new Paragraph(`Angle: ${item.angle || ""}`),
          new Paragraph(`Visual: ${item.visual || ""}`),
          new Paragraph(`Outline: ${item.outline || ""}`),
          new Paragraph(`Rewrite: ${item.rewrite || ""}`),
          new Paragraph(" "),
        ]),
      ];

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${filenameBase}.docx`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                Wellbeing Compass · Prompt Planner
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Content planner bez API billing-a
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Unesi dokument ili temu, definiši cilj, ton i platformu, pa generiši plan,
                draft strukturu i prompt koji možeš koristiti u ChatGPT-u.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Platforma</div>
                <div className="mt-1 text-sm font-semibold capitalize">{form.platform}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Objava / sedmica</div>
                <div className="mt-1 text-sm font-semibold">{form.frequency}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Riječi u dokumentu</div>
                <div className="mt-1 text-sm font-semibold">{documentStats.words}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Buyer stage</div>
                <div className="mt-1 text-sm font-semibold">{form.buyerStage}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <SidebarCard
              icon={<Upload className="h-5 w-5" />}
              title="Dokument i tema"
              subtitle="Učitavanje ulaznog materijala i osnovnog konteksta."
            >
              <div className="space-y-5">
                <Field label="Naslov teme / projekta">
                  <input
                    value={form.topicTitle}
                    onChange={(e) => updateField("topicTitle", e.target.value)}
                    placeholder="npr. Awareness vs performance"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Upload dokumenta" hint={uploadedFileName || "TXT, MD, CSV, JSON, PDF, DOCX"}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:border-slate-400">
                    <FileText className="h-4 w-4" />
                    <span>{uploadedFileName ? `Učitano: ${uploadedFileName}` : "Izaberi dokument"}</span>
                    <input
                      type="file"
                      accept=".txt,.md,.csv,.json,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>
                </Field>

                <Field label="Tema / bilješke" hint={`${documentStats.words} riječi`}>
                  <textarea
                    value={extractedText || form.topicNotes}
                    onChange={(e) => {
                      setExtractedText("");
                      updateField("topicNotes", e.target.value);
                    }}
                    rows={10}
                    placeholder="Nalijepi sažetak dokumenta, outline, transkript, temu ili ključne tačke..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                  />
                </Field>
              </div>
            </SidebarCard>

            <SidebarCard
              icon={<Target className="h-5 w-5" />}
              title="Core settings"
              subtitle="Strategija, cilj, platforma i ritam objava."
            >
              <div className="space-y-5">
                <Field label="Platforma">
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((opt) => (
                      <PillToggle
                        key={opt.id}
                        active={form.platform === opt.id}
                        onClick={() => updateField("platform", opt.id)}
                      >
                        <span className="inline-flex items-center gap-2">
                          {opt.id === "linkedin" ? (
                            <Linkedin className="h-4 w-4" />
                          ) : opt.id === "instagram" ? (
                            <Instagram className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                          {opt.label}
                        </span>
                      </PillToggle>
                    ))}
                  </div>
                </Field>

                <Field label="Broj objava sedmično">
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <PillToggle
                        key={n}
                        active={form.frequency === n}
                        onClick={() => updateField("frequency", n)}
                      >
                        {n}
                      </PillToggle>
                    ))}
                  </div>
                </Field>

                <Field label="Cilj komunikacije">
                  <select
                    value={form.goal}
                    onChange={(e) => updateField("goal", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    {GOAL_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Buyer stage">
                  <div className="flex flex-wrap gap-2">
                    {BUYER_STAGE_OPTIONS.map((item) => (
                      <PillToggle
                        key={item}
                        active={form.buyerStage === item}
                        onClick={() => updateField("buyerStage", item)}
                      >
                        {item}
                      </PillToggle>
                    ))}
                  </div>
                </Field>

                <Field label="Ton">
                  <select
                    value={form.tone}
                    onChange={(e) => updateField("tone", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    {TONE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Ciljna publika">
                  <input
                    value={form.audience}
                    onChange={(e) => updateField("audience", e.target.value)}
                    placeholder="npr. osnivači, HR lideri, beauty klijenti..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Ponuda / CTA fokus">
                  <input
                    value={form.offer}
                    onChange={(e) => updateField("offer", e.target.value)}
                    placeholder="npr. konsultacije, audit, prijava, DM"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Vrste sadržaja">
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPE_OPTIONS.map((type) => (
                      <PillToggle
                        key={type}
                        active={form.contentTypes.includes(type)}
                        onClick={() => toggleContentType(type)}
                      >
                        {type}
                      </PillToggle>
                    ))}
                  </div>
                </Field>
              </div>
            </SidebarCard>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AI workspace</h2>
                    <p className="text-sm text-slate-500">
                      Planner, draft generator i prompt priprema bez direktnog API poziva.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "schedule", label: "Schedule" },
                    { id: "prompt", label: "Prompt" },
                    { id: "drafts", label: "Drafts" },
                  ].map((tab) => (
                    <PillToggle
                      key={tab.id}
                      active={activePreview === tab.id}
                      onClick={() => setActivePreview(tab.id)}
                    >
                      {tab.label}
                    </PillToggle>
                  ))}
                </div>
              </div>

              {apiError ? (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{apiError}</div>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Prompt Mode je aktivan. Generiši plan ovdje, a finalni copy razvij kroz Prompt tab u ChatGPT-u.
                </div>
              )}

              {activePreview === "schedule" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {schedule.map((item, idx) => (
                      <div
                        key={`${item.day}-${idx}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.day}</div>
                            <div className="mt-1 text-sm text-slate-600">{item.contentType}</div>
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {item.format}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      <Wand2 className="h-4 w-4" />
                      Generate Plan
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePreview("prompt")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
                    >
                      <Sparkles className="h-4 w-4" />
                      Open Prompt
                    </button>
                  </div>
                </div>
              )}

              {activePreview === "prompt" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-slate-700">
                      {prompt}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Kopirano" : "Kopiraj prompt"}
                    </button>
                  </div>
                </div>
              )}

              {activePreview === "drafts" && (
                <div className="space-y-4">
                  {generatedDrafts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Još nema draftova. Klikni <strong>Generate Plan</strong>.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span>
                          Način rada: <strong>Prompt + lokalni draft generator</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleExport}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-slate-300"
                        >
                          <Download className="h-4 w-4" />
                          Export {form.exportFormat}
                        </button>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        {generatedDrafts.map((item, idx) => (
                          <div
                            key={`${item.day}-${idx}`}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                  {item.day}
                                </div>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                  {item.title}
                                </h3>
                              </div>
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                                {item.format}
                              </div>
                            </div>

                            <div className="mb-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                {item.contentType}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                {item.goal}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                {item.buyerStage}
                              </span>
                            </div>

                            <div className="space-y-3 text-sm leading-6 text-slate-700">
                              <div>
                                <strong>Ugao:</strong> {item.angle}
                              </div>
                              <div>
                                <strong>Pillar:</strong> {item.pillar}
                              </div>
                              <div>
                                <strong>CTA:</strong> {item.cta}
                              </div>
                              <div>
                                <strong>Vizual:</strong> {item.visual}
                              </div>
                              <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4">
                                <strong>Outline:</strong>
                                {"\n"}
                                {item.outline}
                              </div>
                              {item.rewrite ? (
                                <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4">
                                  <strong>Rewrite:</strong>
                                  {"\n"}
                                  {item.rewrite}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <SidebarCard
              icon={<Layers3 className="h-5 w-5" />}
              title="Content pillars"
              subtitle="Tematski stubovi da plan ne bude nasumičan."
            >
              <Field label="3–5 glavnih stubova" hint="jedan po redu">
                <textarea
                  value={form.contentPillars}
                  onChange={(e) => updateField("contentPillars", e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                />
              </Field>
            </SidebarCard>

            <SidebarCard
              icon={<Library className="h-5 w-5" />}
              title="CTA library"
              subtitle="Biblioteka CTA-eva po cilju i vrsti objave."
            >
              <Field label="CTA biblioteka" hint="jedan CTA po redu">
                <textarea
                  value={form.ctaLibrary}
                  onChange={(e) => updateField("ctaLibrary", e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                />
              </Field>
            </SidebarCard>

            <SidebarCard
              icon={<Users className="h-5 w-5" />}
              title="Brand voice profil"
              subtitle="Kako aplikacija pamti stil, formalnost i granice jezika."
            >
              <div className="space-y-5">
                <Field label="Opis glasa brenda">
                  <textarea
                    value={form.brandVoiceDescription}
                    onChange={(e) => updateField("brandVoiceDescription", e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Poželjne riječi / fraze">
                  <input
                    value={form.brandVoicePreferred}
                    onChange={(e) => updateField("brandVoicePreferred", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Izbjegavati">
                  <input
                    value={form.brandVoiceAvoid}
                    onChange={(e) => updateField("brandVoiceAvoid", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </Field>

                <Field label="Formalnost">
                  <select
                    value={form.formality}
                    onChange={(e) => updateField("formality", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  >
                    <option>Neformalno</option>
                    <option>Srednje formalno</option>
                    <option>Formalno</option>
                  </select>
                </Field>
              </div>
            </SidebarCard>

            <SidebarCard
              icon={<PenTool className="h-5 w-5" />}
              title="AI rewrite mode"
              subtitle="Isti draft prevedeš u drugi format."
            >
              <Field label="Rewrite u format">
                <select
                  value={form.rewriteMode}
                  onChange={(e) => updateField("rewriteMode", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                >
                  {REWRITE_OPTIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </SidebarCard>

            <SidebarCard
              icon={<Download className="h-5 w-5" />}
              title="Export"
              subtitle="Spremi plan za tim, klijenta ili internu upotrebu."
            >
              <div className="space-y-5">
                <Field label="Format izvoza">
                  <div className="flex flex-wrap gap-2">
                    {EXPORT_OPTIONS.map((item) => (
                      <PillToggle
                        key={item}
                        active={form.exportFormat === item}
                        onClick={() => updateField("exportFormat", item)}
                      >
                        {item}
                      </PillToggle>
                    ))}
                  </div>
                </Field>

                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300"
                >
                  <Download className="h-4 w-4" />
                  Export {form.exportFormat}
                </button>
              </div>
            </SidebarCard>

            <SidebarCard
              icon={<Filter className="h-5 w-5" />}
              title="Dodatne AI instrukcije"
              subtitle="Fina podešavanja za ton, strukturu i stil."
            >
              <Field label="Instrukcije za AI">
                <textarea
                  value={form.instructions}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  rows={5}
                  placeholder="npr. koristi više ličnog ugla, izbjegni generičan ton, uključi CTA za newsletter, zadrži premium jezik..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                />
              </Field>
            </SidebarCard>
          </div>
        </div>

        <footer className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Jelena.milatovic@wellbeingcompass.me</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Wellbeing Compass doo</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Podgorica, Crna Gora</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

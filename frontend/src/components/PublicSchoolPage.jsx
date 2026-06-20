import React, { useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

function SchoolCrest({ size = 44 }) {
  return (
    <img
      src="/asset/bonde.png"
      alt="BONDE Secondary School Logo"
      width={size}
      height={size}
      className="rounded object-contain"
    />
  );
}

function buildContent(language) {
  if (language === "sw") {
    return {
      title: "Our School",
      kicker: "Bonde Secondary School",
      intro:
        "Bonde Secondary School ni taasisi ya umma inayofanya kazi chini ya Ofisi ya Waziri Mkuu, Tawala za Mikoa na Serikali za Mitaa, ikiwa na dhamira ya kukuza nidhamu, ufaulu, na maandalizi ya maisha bora ya baadaye.",
      mottoLabel: "Kauli mbiu",
      motto: "Better future starts here",
      cards: [
        {
          title: "Utambulisho",
          body: "Bonde Secondary School, P.O. Box 3, Muheza, ni shule inayohudumia jamii kwa kutoa mazingira ya kujifunza yenye mwelekeo wa matokeo na malezi bora.",
        },
        {
          title: "Mwelekeo wa Kitaaluma",
          body: "Tunasisitiza ufaulu wa kitaaluma, usimamizi wa karibu wa maendeleo ya mwanafunzi, na matumizi ya mifumo ya kisasa ya kufuatilia matokeo na taarifa muhimu za shule.",
        },
        {
          title: "Malezi na Maadili",
          body: "Shule inaamini kuwa mafanikio ya mwanafunzi yanaenda sambamba na nidhamu, uwajibikaji, heshima, na uwezo wa kufanya maamuzi bora kwa maisha ya baadaye.",
        },
        {
          title: "Mawasiliano na Wazazi",
          body: "Kupitia mfumo wa shule, wazazi na walezi wanaweza kufuatilia matokeo, taarifa rasmi, na mawasiliano muhimu kuhusu maendeleo ya wanafunzi.",
        },
      ],
      highlights: [
        { label: "Mahali", value: "Muheza" },
        { label: "Sanduku la Posta", value: "P.O. Box 3" },
        { label: "Usimamizi", value: "PMO-RALG" },
        { label: "Mtazamo", value: "Matokeo, malezi, na mustakabali bora" },
      ],
      cta: "Ingia kwenye Mfumo",
      back: "Rudi Mwanzo",
      sectionTitle: "Tunachojenga Bonde",
      sectionCopy:
        "Lengo letu ni kujenga mazingira ambayo mwanafunzi anapata elimu, mwelekeo, na msingi wa kujitengenezea maisha bora ya baadaye.",
    };
  }

  return {
    title: "Our School",
    kicker: "Bonde Secondary School",
    intro:
      "Bonde Secondary School is a public learning institution operating under the Prime Minister's Office, Regional Administration and Local Government, with a strong focus on discipline, academic performance, and preparing learners for a better future.",
    mottoLabel: "Motto",
    motto: "Better future starts here",
    cards: [
      {
        title: "School Identity",
        body: "Bonde Secondary School, P.O. Box 3, Muheza, serves the community through a results-driven learning environment built on care, structure, and academic accountability.",
      },
      {
        title: "Academic Direction",
        body: "The school emphasizes strong academic performance, close student progress tracking, and practical use of modern systems to manage results and key school information.",
      },
      {
        title: "Character Formation",
        body: "Student success is treated as more than marks alone. Discipline, responsibility, respect, and sound judgment remain central to the school culture.",
      },
      {
        title: "Family Communication",
        body: "Through the school system, parents and guardians can follow results, official notices, and important communication tied to student progress.",
      },
    ],
    highlights: [
      { label: "Location", value: "Muheza" },
      { label: "Postal Address", value: "P.O. Box 3" },
      { label: "Administration", value: "PMO-RALG" },
      { label: "Focus", value: "Results, character, and a better future" },
    ],
    cta: "Open Login",
    back: "Back Home",
    sectionTitle: "What Bonde Builds",
    sectionCopy:
      "Our aim is to provide an environment where every learner gains education, direction, and a foundation for a stronger future.",
  };
}

export function PublicSchoolPage({ onBackHome, onOpenLogin }) {
  const { language } = useI18n();
  const content = useMemo(() => buildContent(language), [language]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${content.title} | BONDE Results System`;
    }
  }, [content.title]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackHome}
            className="btn-secondary rounded-full px-4 py-2 text-brand-800"
          >
            <span aria-hidden="true">&larr;</span> {content.back}
          </button>
          <LanguageToggle />
        </div>

        {/* Hero */}
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left — identity panel */}
            <div className="bg-brand-900 p-7 text-white md:p-8">
              <div className="mb-5 flex items-center gap-3.5">
                <SchoolCrest size={56} />
                <div>
                  <div className="text-[13px] font-bold tracking-[0.08em]">BONDE OS</div>
                  <div className="text-[13px] text-white/70">Results System</div>
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">
                {content.kicker}
              </div>
              <h1 className="mt-2.5 font-display text-3xl font-bold leading-tight md:text-4xl">
                {content.title}
              </h1>
              <p className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-white/80">
                {content.intro}
              </p>

              <div className="mt-6 inline-flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3.5 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-white/70">
                  {content.mottoLabel}
                </span>
                <span className="text-lg font-bold">{content.motto}</span>
              </div>
            </div>

            {/* Right — image + highlights */}
            <div className="bg-white p-6">
              <img
                src="/asset/nembobonde.jpg"
                alt="Bonde Secondary School motto board"
                className="w-full rounded-lg border border-slate-200 object-cover shadow-card"
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {content.highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div className="mb-1 text-xs font-medium text-slate-500">{item.label}</div>
                    <div className="text-sm font-semibold leading-snug text-brand-800">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* What Bonde Builds */}
        <div className="card mt-5 p-6 md:p-7">
          <div className="mb-5">
            <h2 className="mb-2 font-display text-xl font-bold text-brand-900">
              {content.sectionTitle}
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              {content.sectionCopy}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {content.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-2 text-base font-bold text-brand-900">{card.title}</div>
                <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="text-sm leading-relaxed text-slate-500">
              {language === "sw"
                ? "Kwa taarifa zaidi kuhusu shule, tafadhali tumia mawasiliano rasmi ya Bonde Secondary School."
                : "For more information about the school, please use the official Bonde Secondary School contact channels."}
            </p>
            <button type="button" onClick={onOpenLogin} className="btn-accent">
              {content.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

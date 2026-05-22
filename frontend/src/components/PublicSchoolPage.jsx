import React, { useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { liquidGlassStyle, premiumFontStack } from "../utils/designSystem";

function SchoolCrest({ size = 44 }) {
  return (
    <img
      src="/asset/bonde.png"
      alt="BONDE Secondary School Logo"
      width={size}
      height={size}
      style={{ objectFit: "contain", borderRadius: 4 }}
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
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #edf3fa 100%)",
        fontFamily: premiumFontStack,
        color: "#14213d",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 16px 56px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <button
            onClick={onBackHome}
            style={{
              border: "1px solid rgba(37,99,235,0.18)",
              background: "#fff",
              color: "#173b74",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
            }}
          >
            {"<-"} {content.back}
          </button>
          <LanguageToggle />
        </div>

        <div
          style={{
            ...liquidGlassStyle({ radius: 30, padding: 0, tint: "blue", blur: 28 }),
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 0,
            }}
          >
            <div
              style={{
                padding: "28px 24px 26px",
                background: "linear-gradient(135deg, rgba(15,45,110,0.98), rgba(29,78,216,0.92))",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <SchoolCrest size={56} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em" }}>BONDE OS</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>Results System</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                {content.kicker}
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05, marginTop: 10 }}>{content.title}</div>
              <div style={{ marginTop: 14, maxWidth: 620, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.84)" }}>
                {content.intro}
              </div>

              <div
                style={{
                  marginTop: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 18,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                  {content.mottoLabel}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{content.motto}</div>
              </div>
            </div>

            <div style={{ background: "#f8fbff", padding: "22px 22px 20px" }}>
              <img
                src="/asset/nembobonde.jpg"
                alt="Bonde Secondary School motto board"
                style={{
                  width: "100%",
                  borderRadius: 22,
                  border: "1px solid rgba(214,224,237,0.9)",
                  boxShadow: "0 18px 42px rgba(15,23,42,0.08)",
                  objectFit: "cover",
                }}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {content.highlights.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      ...liquidGlassStyle({ radius: 18, padding: "14px 14px 12px", tint: "slate", blur: 18, shadowOpacity: 0.08 }),
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#173b74", lineHeight: 1.45 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "24px 24px 28px" }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0f2d6e", marginBottom: 8 }}>{content.sectionTitle}</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: "#475569", maxWidth: 820 }}>{content.sectionCopy}</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {content.cards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    ...liquidGlassStyle({ radius: 20, padding: "18px 18px 16px", tint: "slate", blur: 18, shadowOpacity: 0.08 }),
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2d6e", marginBottom: 8 }}>{card.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: "#475569" }}>{card.body}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                borderTop: "1px solid rgba(226,232,240,0.95)",
                paddingTop: 18,
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                {language === "sw"
                  ? "Kwa taarifa zaidi kuhusu shule, tafadhali tumia mawasiliano rasmi ya Bonde Secondary School."
                  : "For more information about the school, please use the official Bonde Secondary School contact channels."}
              </div>
              <button
                onClick={onOpenLogin}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                  color: "#14213d",
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {content.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

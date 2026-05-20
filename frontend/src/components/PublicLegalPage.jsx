import React, { useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { premiumFontStack } from "../utils/designSystem";

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

function buildTermsSections(language) {
  if (language === "sw") {
    return [
      {
        title: "Matumizi ya Tovuti",
        body:
          "Mfumo huu umetengenezwa kusaidia wanafunzi, wazazi, walimu, na uongozi wa shule kufikia matokeo, matangazo, na taarifa rasmi za kitaaluma kwa usalama.",
      },
      {
        title: "Akaunti na Ufikiaji",
        body:
          "Watumiaji wanapaswa kutumia akaunti walizopewa rasmi na shule. Kushiriki nenosiri, kujaribu kuingia bila ruhusa, au kutumia taarifa za wengine hakuruhusiwi.",
      },
      {
        title: "Matokeo na Nyaraka",
        body:
          "Matokeo, ripoti, na nyaraka zinazoonekana kwenye mfumo ni kwa matumizi ya kielimu na kiutawala. Mtumiaji anatakiwa kuhakiki taarifa zozote rasmi na shule endapo kuna tofauti.",
      },
      {
        title: "Matumizi Yanayokatazwa",
        body:
          "Hairuhusiwi kutumia mfumo huu kwa njia inayovuruga huduma, kubadilisha data bila ruhusa, kusambaza taarifa za siri, au kufanya shughuli zinazokiuka sheria au taratibu za shule.",
      },
      {
        title: "Mabadiliko ya Huduma",
        body:
          "Bonde Secondary School inaweza kusasisha vipengele vya mfumo, masharti haya, au taratibu za matumizi bila taarifa ndefu ya awali ili kuboresha usalama na utoaji wa huduma.",
      },
    ];
  }

  return [
    {
      title: "Use of the Portal",
      body:
        "This portal is provided to support students, parents, teachers, and school administrators with secure access to results, notices, and official academic information.",
    },
    {
      title: "Accounts and Access",
      body:
        "Users must access the system only through credentials officially issued or approved by the school. Sharing passwords, attempting unauthorized access, or impersonating another user is prohibited.",
    },
    {
      title: "Results and Documents",
      body:
        "Results, report cards, and academic documents displayed on the portal are intended for educational and administrative use. Any official discrepancy should be confirmed directly with the school.",
    },
    {
      title: "Prohibited Use",
      body:
        "You may not use the system to disrupt service, alter records without authorization, expose confidential data, or perform activity that violates school policy or applicable law.",
    },
    {
      title: "Service Changes",
      body:
        "Bonde Secondary School may update system features, these terms, or operational rules when necessary to improve service quality, compliance, and security.",
    },
  ];
}

function buildPrivacySections(language) {
  if (language === "sw") {
    return [
      {
        title: "Taarifa Tunazohifadhi",
        body:
          "Mfumo unaweza kuhifadhi majina ya wanafunzi, namba za usajili, taarifa za wazazi au walezi, matokeo ya mitihani, kumbukumbu za kuingia, na taarifa nyingine za kitaaluma zinazohitajika kwa huduma za shule.",
      },
      {
        title: "Matumizi ya Taarifa",
        body:
          "Taarifa hutumiwa kwa utoaji wa matokeo, usimamizi wa madarasa, uandaaji wa ripoti, mawasiliano ya shule, na usalama wa akaunti za watumiaji.",
      },
      {
        title: "Ulinzi wa Data",
        body:
          "Shule inachukua hatua za msingi za kiusalama kulinda taarifa zilizohifadhiwa kwenye mfumo. Hata hivyo, watumiaji pia wanawajibika kulinda nenosiri na vifaa wanavyotumia kuingia.",
      },
      {
        title: "Utoaji wa Taarifa",
        body:
          "Taarifa hazipaswi kushirikiwa nje ya matumizi halali ya shule isipokuwa pale ambapo sheria, ruhusa ya mhusika, au utaratibu rasmi wa shule unaruhusu hivyo.",
      },
      {
        title: "Mawasiliano",
        body:
          "Kwa maswali kuhusu faragha, usahihi wa taarifa, au marekebisho ya kumbukumbu, wasiliana na uongozi wa Bonde Secondary School kupitia mawasiliano rasmi ya shule.",
      },
    ];
  }

  return [
    {
      title: "Information We Store",
      body:
        "The portal may store student names, admission or index numbers, parent or guardian contacts, exam results, login history, and other school records needed to operate academic services.",
    },
    {
      title: "How Information Is Used",
      body:
        "Data is used to deliver results, manage classes, generate reports, support school communication, and maintain account and system security.",
    },
    {
      title: "Data Protection",
      body:
        "The school applies reasonable security measures to protect information stored in the system. Users are also responsible for protecting their passwords and the devices they use to access the portal.",
    },
    {
      title: "Information Sharing",
      body:
        "Information should not be disclosed outside legitimate school operations unless allowed by law, by the data subject, or through an official school process.",
    },
    {
      title: "Contact and Corrections",
      body:
        "For privacy questions, record corrections, or concerns about information accuracy, contact Bonde Secondary School through the official school contact channels.",
    },
  ];
}

export function PublicLegalPage({ type = "terms", onBackHome, onOpenLogin }) {
  const { language } = useI18n();
  const isPrivacy = type === "privacy";

  const pageTitle = useMemo(() => {
    if (language === "sw") return isPrivacy ? "Sera ya Faragha" : "Masharti ya Matumizi";
    return isPrivacy ? "Privacy Policy" : "Terms of Use";
  }, [isPrivacy, language]);

  const pageIntro = useMemo(() => {
    if (language === "sw") {
      return isPrivacy
        ? "Ukurasa huu unaeleza jinsi taarifa za watumiaji na za shule zinavyotumika ndani ya mfumo wa Bonde Results."
        : "Ukurasa huu unaeleza masharti ya msingi ya kutumia mfumo wa Bonde Results kwa usalama na kwa matumizi rasmi ya shule.";
    }
    return isPrivacy
      ? "This page explains how user and school data is handled within the Bonde Results system."
      : "This page outlines the core conditions for using the Bonde Results system safely and for official school purposes.";
  }, [isPrivacy, language]);

  const sections = useMemo(
    () => (isPrivacy ? buildPrivacySections(language) : buildTermsSections(language)),
    [isPrivacy, language]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${pageTitle} | BONDE Results System`;
    }
  }, [pageTitle]);

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
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "22px 16px 54px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 22,
            flexWrap: "wrap",
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
            {"<-"} {language === "sw" ? "Rudi Mwanzo" : "Back Home"}
          </button>

          <LanguageToggle />
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(214,224,237,0.9)",
            borderRadius: 28,
            boxShadow: "0 22px 60px rgba(15,23,42,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "28px 24px 22px",
              borderBottom: "1px solid rgba(226,232,240,0.95)",
              background:
                "linear-gradient(135deg, rgba(15,45,110,0.96), rgba(37,99,235,0.88))",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <SchoolCrest size={54} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em" }}>
                  BONDE OS
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
                  Results System
                </div>
              </div>
            </div>

            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{pageTitle}</div>
            <div
              style={{
                marginTop: 10,
                maxWidth: 720,
                fontSize: 14,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              {pageIntro}
            </div>
          </div>

          <div style={{ padding: "24px 24px 28px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "#f8fbff",
                  border: "1px solid rgba(226,232,240,0.9)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                  {language === "sw" ? "Mfumo" : "System"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#173b74" }}>
                  BONDE Results Portal
                </div>
              </div>
              <div
                style={{
                  borderRadius: 18,
                  background: "#f8fbff",
                  border: "1px solid rgba(226,232,240,0.9)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                  {language === "sw" ? "Inatumika Kwa" : "Used For"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#173b74" }}>
                  {language === "sw" ? "Matokeo na Taarifa Rasmi" : "Results and Official School Operations"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {sections.map((section) => (
                <div
                  key={section.title}
                  style={{
                    borderRadius: 20,
                    border: "1px solid rgba(226,232,240,0.95)",
                    background: "#fff",
                    padding: "18px 18px 16px",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2d6e", marginBottom: 8 }}>
                    {section.title}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: "#475569" }}>{section.body}</div>
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
                  ? "Kwa maelezo zaidi, wasiliana na Bonde Secondary School kupitia mawasiliano rasmi ya shule."
                  : "For further clarification, contact Bonde Secondary School through the official school contact channels."}
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
                {language === "sw" ? "Ingia kwenye Mfumo" : "Open Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

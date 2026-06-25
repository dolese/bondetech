import React, { useMemo } from "react";
import { useI18n } from "../../i18n";
import { useViewport } from "../../utils/useViewport";

const ICONS = {
  academics: ["M3 7l9-4 9 4-9 4-9-4z", "M7 9v5c0 1.5 10 1.5 10 0V9"],
  exams: ["M5 18h14", "M8 16V9", "M12 16v-4", "M16 16V6"],
  science: ["M9 3h6", "M10 3v6l-4 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-9V3"],
  languages: ["M4 5h7", "M9 3v2c0 5-3 8-6 9", "M5 9c0 3 3 5 7 6", "M13 19l4-9 4 9", "M14.5 16h5"],
  sports: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c3 3 3 15 0 18", "M12 3c-3 3-3 15 0 18"],
  clubs: ["M12 21s-7-4.5-9-9a5 5 0 0 1 9-2 5 5 0 0 1 9 2c-2 4.5-9 9-9 9z"],
  guidance: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
};

function ProgIcon({ name }) {
  const paths = ICONS[name] || ICONS.academics;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function defaultProgrammes(sw) {
  return [
    {
      icon: "academics",
      title: sw ? "Masomo ya O-Level (Kidato I–IV)" : "O-Level Academics (Form I–IV)",
      desc: sw
        ? "Mtaala kamili wa sekondari ukifuata mfumo wa Tanzania, ukiandaa wanafunzi kwa mtihani wa Taifa wa Kidato cha Nne (CSEE)."
        : "A full secondary curriculum following the Tanzanian framework, preparing learners for the national Form Four examination (CSEE).",
    },
    {
      icon: "exams",
      title: sw ? "Mitihani na Tathmini" : "Examinations & Assessment",
      desc: sw
        ? "Tathmini endelevu, mitihani ya katikati na ya mwisho wa muhula, pamoja na mitihani ya majaribio kwa vidato vya mtihani."
        : "Continuous assessment, mid-term and terminal examinations, plus mock examinations for examination classes.",
    },
    {
      icon: "science",
      title: sw ? "Sayansi na Teknolojia" : "Science & Technology",
      desc: sw
        ? "Masomo ya Baiolojia, Kemia, Fizikia na Hisabati yakiungwa mkono na vitendo vya maabara na ujuzi wa kidijitali."
        : "Biology, Chemistry, Physics and Mathematics supported by practical laboratory work and digital skills.",
    },
    {
      icon: "languages",
      title: sw ? "Lugha na Sanaa" : "Languages & Humanities",
      desc: sw
        ? "Kiswahili, Kiingereza, Historia, Jiografia na Uraia kwa ajili ya mawasiliano na uelewa wa jamii."
        : "Kiswahili, English, History, Geography and Civics for strong communication and social understanding.",
    },
    {
      icon: "sports",
      title: sw ? "Michezo na Mazoezi" : "Sports & Games",
      desc: sw
        ? "Mpira wa miguu, netiboli, riadha na michezo mingine inayojenga afya, nidhamu na ushirikiano."
        : "Football, netball, athletics and other games that build fitness, discipline and teamwork.",
    },
    {
      icon: "clubs",
      title: sw ? "Vilabu na Vikundi" : "Clubs & Societies",
      desc: sw
        ? "Vilabu vya sayansi, mazingira, mjadala na uongozi vinavyokuza vipaji na ujuzi wa maisha."
        : "Science, environment, debate and leadership clubs that nurture talent and life skills.",
    },
    {
      icon: "guidance",
      title: sw ? "Ushauri na Malezi" : "Guidance & Counselling",
      desc: sw
        ? "Msaada wa kitaaluma na kisaikolojia unaowasaidia wanafunzi kufanya maamuzi sahihi ya maisha na masomo."
        : "Academic and pastoral support helping students make sound decisions for school and life.",
    },
  ];
}

export function ProgrammesPage({ programmes }) {
  const { language } = useI18n();
  const sw = language === "sw";
  const { isMobile } = useViewport();
  const list = useMemo(
    () => (Array.isArray(programmes) && programmes.length ? programmes : defaultProgrammes(sw)),
    [programmes, sw],
  );

  return (
    <div style={{ fontFamily: "inherit" }}>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e4e8f0",
          borderRadius: 16,
          padding: isMobile ? 20 : "28px 32px",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "#b89a3e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          {sw ? "Programu za Shule" : "School Programmes"}
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 26 : 32, fontWeight: 700, color: "#1a2b4a" }}>
          {sw ? "Kujifunza Ndani na Nje ya Darasa" : "Learning In and Beyond the Classroom"}
        </div>
        <div style={{ fontSize: 14, color: "#5a6a7e", lineHeight: 1.7, marginTop: 10, maxWidth: 760 }}>
          {sw
            ? "Bonde Sekondari hutoa programu za kitaaluma na za ziada zinazomjenga mwanafunzi kikamilifu — kiakili, kimwili na kijamii."
            : "Bonde Secondary offers academic and co-curricular programmes that develop the whole learner — intellectually, physically and socially."}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {list.map((p, index) => (
          <div
            key={p.title || index}
            style={{
              background: "#ffffff",
              border: "1px solid #e4e8f0",
              borderRadius: 16,
              padding: "24px 22px",
              display: "grid",
              gap: 10,
              alignContent: "start",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#f7f8fa",
                border: "1px solid #e4e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a2b4a",
              }}
            >
              <ProgIcon name={p.icon} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2b4a", letterSpacing: "-0.01em" }}>{p.title}</div>
            <div style={{ fontSize: 13.5, color: "#5a6a7e", lineHeight: 1.7 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

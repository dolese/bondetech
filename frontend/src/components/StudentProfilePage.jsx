import React, { useEffect, useState } from "react";
import { API } from "../api";
import { computeStudent } from "../utils/grading";
import { GRADE_COLORS, DIVISION_COLORS } from "../utils/constants";
import { useViewport } from "../utils/useViewport";

/**
 * StudentProfilePage
 *
 * Displays a full academic history for a student identified by their index
 * number.  For each class/exam the student appeared in, it shows per-subject
 * scores, grades, totals, and division.
 *
 * Props:
 *   indexNo  – the student's candidate number
 *   onBack   – called when the user clicks "Back"
 */
export function StudentProfilePage({ indexNo, onBack }) {
  const { isMobile } = useViewport();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!indexNo) return;
    setLoading(true);
    setError(null);
    API.getStudentProfile(indexNo)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [indexNo]);

  const styles = {
    panel: {
      flex: 1,
      overflowY: "auto",
      padding: isMobile ? 10 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0,
    },
    backBtn: {
      padding: "6px 14px",
      borderRadius: 6,
      border: "1px solid #d0dcf8",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      color: "#003366",
      alignSelf: "flex-start",
    },
    card: {
      background: "#fff",
      border: "1px solid #d0dcf8",
      borderRadius: 10,
      padding: isMobile ? 12 : 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: "#003366",
      borderBottom: "1.5px solid #e4ecff",
      paddingBottom: 6,
      marginBottom: 4,
    },
    th: {
      padding: "6px 8px",
      background: "#003366",
      color: "#fff",
      fontWeight: 700,
      fontSize: 10,
      textAlign: "center",
      border: "1px solid #003366",
    },
    td: {
      padding: "5px 7px",
      border: "1px solid #e0e8f8",
      fontSize: 10,
      textAlign: "center",
    },
  };

  if (loading) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={{ color: "#888", fontSize: 12 }}>Loading profile…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.panel}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={{ color: "#8b2500", fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={styles.panel}>
      <button style={styles.backBtn} onClick={onBack}>← Back to Dashboard</button>

      <div style={styles.card}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 900, color: "#003366" }}>
            {profile.name || "Unknown Student"}
          </h2>
          <div style={{ fontSize: 12, color: "#666" }}>
            CNO: <strong>{profile.indexNo}</strong> · Sex: {profile.sex === "F" ? "Female" : "Male"}
          </div>
        </div>
      </div>

      {profile.entries.length === 0 ? (
        <div style={{ fontSize: 12, color: "#666" }}>No academic records found.</div>
      ) : (
        profile.entries.map((entry, ei) => {
          const examEntries = Object.entries(entry.examScores ?? {});
          return (
            <div key={`${entry.classId}-${ei}`} style={styles.card}>
              <div style={styles.cardTitle}>
                📚 {entry.className} — {entry.form} {entry.year}
              </div>

              {examEntries.length === 0 ? (
                <div style={{ fontSize: 11, color: "#888" }}>No exam scores recorded.</div>
              ) : (
                examEntries.map(([examType, scores]) => {
                  const fakeStudent = {
                    id: `${entry.classId}-${entry.form}-${examType}`,
                    name: profile.name,
                    sex: profile.sex,
                    status: entry.status,
                    scores,
                    remarks: entry.remarks,
                  };
                  const computed = computeStudent(fakeStudent, entry.subjects);

                  return (
                    <div key={examType} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6 }}>
                        Exam: {examType}
                        {computed.div && (
                          <span
                            style={{
                              marginLeft: 8,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: DIVISION_COLORS[computed.div] ?? "#999",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            Div {computed.div}
                          </span>
                        )}
                        {computed.total !== null && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: "#888" }}>
                            Total: {computed.total} · Avg: {computed.avg}
                          </span>
                        )}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", fontSize: 10, minWidth: 400 }}>
                          <thead>
                            <tr>
                              {entry.subjects.map(s => (
                                <th key={s} style={styles.th}>{s}</th>
                              ))}
                              <th style={styles.th}>Total</th>
                              <th style={styles.th}>Avg</th>
                              <th style={styles.th}>Grade</th>
                              <th style={styles.th}>Div</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {entry.subjects.map((_, i) => {
                                const g = computed.grades?.[i];
                                const display = g?.raw === "ABS" ? "ABS" : (g?.score ?? "–");
                                return (
                                  <td key={i} style={styles.td}>{display}</td>
                                );
                              })}
                              <td style={{ ...styles.td, fontWeight: 700 }}>{computed.total ?? "–"}</td>
                              <td style={styles.td}>{computed.avg ?? "–"}</td>
                              <td style={{ ...styles.td, fontWeight: 800, color: GRADE_COLORS[computed.agrd] }}>
                                {computed.agrd ?? "–"}
                              </td>
                              <td style={{ ...styles.td, fontWeight: 800, color: DIVISION_COLORS[computed.div] }}>
                                {computed.div ?? "–"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {entry.remarks && entry.remarks.trim() && (
                        <div style={{ marginTop: 4, fontSize: 10, color: "#555" }}>
                          <strong>Remarks:</strong> {entry.remarks.trim()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

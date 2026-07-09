import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { premiumFontStack } from "../utils/designSystem";
import { useViewport } from "../utils/useViewport";

// Reviews duplicate students in a class (grouped by name) and lets an admin
// remove the extra copies. The newest upload of each student is kept; older
// copies are removed. Nothing is deleted until the admin confirms.

function CopyLine({ member, kept }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "6px 10px",
        borderRadius: 8,
        background: kept ? "#eaf7f2" : "#fff5f5",
        border: `1px solid ${kept ? "#a7e0cd" : "#f5c2c2"}`,
        fontSize: 12,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.03em",
          color: kept ? "#0b6b3a" : "#b42318",
          background: kept ? "#d1f2e3" : "#fbdcdc",
          borderRadius: 5,
          padding: "2px 7px",
          flexShrink: 0,
        }}
      >
        {kept ? "KEEP" : "REMOVE"}
      </span>
      <span style={{ fontWeight: 600, color: "#334155" }}>
        {member.indexNo || "no CNO"}
      </span>
      {member.admissionNo ? (
        <span style={{ color: "#64748b" }}>· {member.admissionNo}</span>
      ) : null}
      <span style={{ color: "#94a3b8" }}>
        · {member.totalFilled} mark{member.totalFilled === 1 ? "" : "s"}
        {member.filledExams.length ? ` (${member.filledExams.join(", ")})` : ""}
      </span>
    </div>
  );
}

export function DedupeStudentsModal({ classId, className = "", onDedupe, onClose }) {
  const { isMobile } = useViewport();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await API.getStudentDuplicates(classId);
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load duplicates");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeIds = useMemo(() => {
    if (!report?.groups) return [];
    return report.groups.flatMap((group) => group.remove.map((member) => member.id));
  }, [report]);

  const handleConfirm = async () => {
    if (!removeIds.length || working) return;
    setWorking(true);
    const result = await onDedupe?.(removeIds);
    setWorking(false);
    if (result?.ok) {
      onClose?.();
    } else if (result?.error) {
      setError(result.error);
      // Reload so the view reflects whatever state the class is now in.
      load();
    }
  };

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.38)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      fontFamily: premiumFontStack,
      padding: 12,
    },
    modal: {
      background: "#ffffff",
      borderRadius: 20,
      border: "1px solid rgba(226,232,240,0.9)",
      boxShadow: "0 28px 60px rgba(15,23,42,0.24)",
      width: "100%",
      maxWidth: 640,
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    header: {
      background: "linear-gradient(135deg,#0f2d6e,#1d4ed8)",
      color: "#fff",
      padding: isMobile ? "12px 16px" : "16px 22px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    body: {
      padding: isMobile ? 14 : 20,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    footer: {
      padding: isMobile ? "12px 16px" : "14px 22px",
      borderTop: "1px solid #eef2f7",
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      background: "#fbfcfe",
    },
    cancelBtn: {
      border: "1px solid #d0d7e2",
      background: "#fff",
      color: "#334155",
      borderRadius: 10,
      padding: "9px 16px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    confirmBtn: (enabled) => ({
      border: "none",
      background: enabled ? "#b42318" : "#e4e7ec",
      color: enabled ? "#fff" : "#98a2b3",
      borderRadius: 10,
      padding: "9px 18px",
      fontSize: 13,
      fontWeight: 700,
      cursor: enabled ? "pointer" : "not-allowed",
    }),
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={styles.header}>
          <div>
            <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800 }}>Remove Duplicate Students</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{className || "Class"}</div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: 600 }}>
              Scanning for duplicates…
            </div>
          ) : error ? (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fff5f5", border: "1px solid #f5c2c2", color: "#b42318", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          ) : report && report.removableCount === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#0b6b3a", fontSize: 14, fontWeight: 700 }}>
              No duplicates found. All {report.totalStudents} students are unique.
            </div>
          ) : report ? (
            <>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                Found <strong>{report.groupCount}</strong> student{report.groupCount === 1 ? "" : "s"} with
                duplicate copies. Removing the extras will delete <strong>{report.removableCount}</strong>{" "}
                record{report.removableCount === 1 ? "" : "s"}, leaving{" "}
                <strong>{report.totalStudents - report.removableCount}</strong> students.
                The newest upload of each student is kept.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.groups.map((group) => (
                  <div
                    key={group.keep.id}
                    style={{ border: "1px solid #e6ebf2", borderRadius: 12, padding: 12, background: "#fbfcfe" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                      {group.name}
                      <span style={{ fontWeight: 500, color: "#94a3b8", marginLeft: 6 }}>
                        ({group.remove.length + 1} copies)
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <CopyLine member={group.keep} kept />
                      {group.remove.map((member) => (
                        <CopyLine key={member.id} member={member} kept={false} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={working}>
            Cancel
          </button>
          <button
            style={styles.confirmBtn(!loading && removeIds.length > 0 && !working)}
            onClick={handleConfirm}
            disabled={loading || removeIds.length === 0 || working}
          >
            {working ? "Removing…" : removeIds.length ? `Remove ${removeIds.length} duplicate${removeIds.length === 1 ? "" : "s"}` : "Nothing to remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

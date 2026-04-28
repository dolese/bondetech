import { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "../api";
import { DEFAULT_SUBJECTS, DEFAULT_SCHOOL, DEFAULT_EXAM_TYPE } from "../utils/constants";
import { withPositions } from "../utils/grading";

export const CLASS_FORMS = ["Form I", "Form II", "Form III", "Form IV"];

const normalizeStudent = (student) => {
  const legacyScores = Array.isArray(student.scores) ? student.scores : [];
  const rawExamScores = (student.examScores && typeof student.examScores === "object") ? student.examScores : {};
  const examScores =
    Object.keys(rawExamScores).length === 0 && legacyScores.length > 0
      ? { [DEFAULT_EXAM_TYPE]: legacyScores }
      : rawExamScores;
  const scores = Array.isArray(examScores[DEFAULT_EXAM_TYPE]) ? examScores[DEFAULT_EXAM_TYPE] : legacyScores;
  return {
    ...student,
    index_no: student.index_no ?? student.indexNo ?? "",
    remarks: student.remarks ?? "",
    scores,
    examScores,
  };
};

const normalizeClass = (cls) => ({
  ...cls,
  school_info: cls.school_info ?? cls.schoolInfo ?? DEFAULT_SCHOOL,
  subjects: cls.subjects ?? DEFAULT_SUBJECTS,
  students: (cls.students ?? []).map(normalizeStudent),
  archived: cls.archived ?? false,
  published: cls.published ?? false,
  publishedAt: cls.publishedAt ?? cls.published_at ?? null,
  monthly_exams: Array.isArray(cls.monthly_exams)
    ? cls.monthly_exams
    : Array.isArray(cls.monthlyExams)
    ? cls.monthlyExams
    : [],
});

const toApiStudent = (student) => ({
  indexNo: student.indexNo ?? student.index_no ?? "",
  name: student.name ?? "",
  sex: student.sex ?? "M",
  status: student.status ?? "present",
  remarks: student.remarks ?? "",
  scores: Array.isArray(student.scores)
    ? student.scores
    : (student.grades ?? []).map((grade) => grade?.score ?? ""),
  examType: student.examType,
});

export function useClasses({ loggedIn, showToast, onNavigate } = {}) {
  const [classes, setClasses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeExam, setActiveExam] = useState(DEFAULT_EXAM_TYPE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [auditLogs, setAuditLogs] = useState(null);

  const resetClassesState = useCallback(() => {
    setClasses([]);
    setActiveId(null);
    setActiveExam(DEFAULT_EXAM_TYPE);
    setLoading(true);
    setError(null);
    setExpandedYears(new Set());
    setAuditLogs(null);
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      setError(null);
      setClasses([]);
      setActiveId(null);
      setAuditLogs(null);
      return;
    }
    setLoading(true);
    setError(null);
    API.getClasses()
      .then((data) => {
        const normalized = data.map(normalizeClass);
        setClasses(normalized);
        if (normalized.length) {
          setActiveId(normalized[0].id);
        }
        const years = new Set(normalized.map((cls) => cls.year).filter(Boolean));
        years.add(String(new Date().getFullYear()));
        setExpandedYears(years);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot connect to server. Check your API configuration and try again.");
        setLoading(false);
      });
  }, [loggedIn]);

  const refreshClass = useCallback(async (id) => {
    try {
      const fresh = normalizeClass(await API.getClass(id));
      setClasses((prev) => prev.map((cls) => (cls.id === id ? fresh : cls)));
    } catch {
      // Keep UI responsive if refresh fails.
    }
  }, []);

  useEffect(() => {
    if (loggedIn && activeId) {
      refreshClass(activeId);
    }
    setAuditLogs(null);
  }, [activeId, loggedIn, refreshClass]);

  const activeClass = useMemo(
    () => classes.find((cls) => cls.id === activeId) ?? classes[0],
    [activeId, classes]
  );

  useEffect(() => {
    setActiveExam(activeClass?.school_info?.exam || DEFAULT_EXAM_TYPE);
  }, [activeClass?.id]);

  const resolveExamScores = useCallback((student, examType) => {
    const examScores = student.examScores ?? {};
    return examScores[examType] ?? [];
  }, []);

  const allComputed = useMemo(() => {
    return classes.map((cls) => {
      const examType = cls.school_info?.exam || DEFAULT_EXAM_TYPE;
      const studentsWithExamScores = (cls.students ?? []).map((student) => ({
        ...student,
        scores: resolveExamScores(student, examType),
      }));
      return {
        ...cls,
        computed: withPositions(studentsWithExamScores, cls.subjects ?? DEFAULT_SUBJECTS),
      };
    });
  }, [classes, resolveExamScores]);

  const activeComputed = useMemo(() => {
    if (!activeClass) return [];
    const studentsWithExamScores = (activeClass.students ?? []).map((student) => ({
      ...student,
      scores: resolveExamScores(student, activeExam),
    }));
    return withPositions(studentsWithExamScores, activeClass.subjects ?? DEFAULT_SUBJECTS);
  }, [activeClass, activeExam, resolveExamScores]);

  const classesByYear = useMemo(() => {
    const map = {};
    classes.forEach((cls) => {
      if (!cls.year) return;
      if (!map[cls.year]) map[cls.year] = [];
      map[cls.year].push(cls);
    });
    const currentYear = new Date().getFullYear();
    for (let year = 2026; year <= currentYear; year += 1) {
      const key = String(year);
      if (!map[key]) map[key] = [];
    }
    return Object.entries(map).sort(([a], [b]) => Number(b) - Number(a));
  }, [classes]);

  const unorganizedClasses = useMemo(
    () => classes.filter((cls) => !cls.year),
    [classes]
  );

  const toggleYear = useCallback((year) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const addClass = useCallback(async (opts = {}) => {
    try {
      const year = opts.year || DEFAULT_SCHOOL.year;
      const form = opts.form || CLASS_FORMS[0];
      if (classes.some((cls) => cls.year === year && cls.form === form)) {
        showToast?.(`${form} ${year} already exists`, "error");
        return;
      }
      const created = await API.createClass({
        name: `${form} ${year}`,
        schoolInfo: DEFAULT_SCHOOL,
        subjects: DEFAULT_SUBJECTS,
        year,
        form,
      });
      const normalized = normalizeClass({ ...created, students: [] });
      setClasses((prev) => [...prev, normalized]);
      setActiveId(created.id);
      onNavigate?.("students");
      setExpandedYears((prev) => new Set([...prev, year]));
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [classes, onNavigate, showToast]);

  const deleteClass = useCallback(async (id) => {
    try {
      await API.deleteClass(id);
      setClasses((prev) => prev.filter((cls) => cls.id !== id));
      if (activeId === id) {
        const remaining = classes.find((cls) => cls.id !== id);
        setActiveId(remaining?.id ?? null);
        onNavigate?.(remaining ? "students" : "dashboard");
      }
      showToast?.("Class deleted");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeId, classes, onNavigate, showToast]);

  const onAddStudent = useCallback(async (studentData) => {
    if (!activeClass) return;
    try {
      await API.addStudent(activeClass.id, toApiStudent({ ...studentData, examType: activeExam }));
      await refreshClass(activeClass.id);
      showToast?.("Student added");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, activeExam, refreshClass, showToast]);

  const onUpdateStudent = useCallback(async (studentData, opts = {}) => {
    if (!activeClass) return;
    try {
      await API.updateStudent(activeClass.id, studentData.id, toApiStudent({ ...studentData, examType: studentData.examType ?? activeExam }));
      await refreshClass(activeClass.id);
      if (!opts.silent) {
        showToast?.("Student updated");
      }
      return { ok: true };
    } catch (err) {
      if (!opts.silent) {
        showToast?.(err.message, "error");
      }
      return { ok: false, error: err.message };
    }
  }, [activeClass, activeExam, refreshClass, showToast]);

  const onDeleteStudent = useCallback(async (studentId) => {
    if (!activeClass) return;
    try {
      await API.deleteStudent(activeClass.id, studentId);
      await refreshClass(activeClass.id);
      showToast?.("Student deleted");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, refreshClass, showToast]);

  const onBulkImport = useCallback(async (rows) => {
    if (!activeClass) return;
    try {
      const payload = rows.map((row) => toApiStudent({ ...row, examType: activeExam }));
      const result = await API.bulkImport(activeClass.id, payload, activeExam);
      await refreshClass(activeClass.id);
      const { created = 0, updated = 0, skipped = 0 } = result ?? {};
      const parts = [];
      if (created > 0) parts.push(`${created} new`);
      if (updated > 0) parts.push(`${updated} updated`);
      if (skipped > 0) parts.push(`${skipped} unchanged`);
      showToast?.(parts.length ? `Import done: ${parts.join(", ")}` : "Nothing to import");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, activeExam, refreshClass, showToast]);

  const onUpdateSchool = useCallback(async (schoolInfo) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { schoolInfo });
      await refreshClass(activeClass.id);
      showToast?.("School info updated");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, refreshClass, showToast]);

  const onUpdateSubjects = useCallback(async (subjects) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { subjects });
      await refreshClass(activeClass.id);
      showToast?.("Subjects updated");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, refreshClass, showToast]);

  const onUpdateMonthlyExams = useCallback(async (monthlyExams) => {
    if (!activeClass) return;
    try {
      await API.updateClass(activeClass.id, { monthlyExams });
      setClasses((prev) =>
        prev.map((cls) => (cls.id === activeClass.id ? { ...cls, monthly_exams: monthlyExams } : cls))
      );
      await refreshClass(activeClass.id);
      showToast?.("Monthly exams updated");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, refreshClass, showToast]);

  const onUpdateClassMeta = useCallback(async ({ year, form, name }) => {
    if (!activeClass) return;
    try {
      const updates = {};
      if (year !== undefined) updates.year = year;
      if (form !== undefined) updates.form = form;
      if (name !== undefined) updates.name = name.trim();
      const newYear = updates.year ?? activeClass.year;
      const newForm = updates.form ?? activeClass.form;
      if (
        (updates.year !== undefined || updates.form !== undefined) &&
        classes.some((cls) => cls.id !== activeClass.id && cls.year === newYear && cls.form === newForm)
      ) {
        showToast?.(`${newForm} ${newYear} already exists`, "error");
        return;
      }
      await API.updateClass(activeClass.id, updates);
      setClasses((prev) => prev.map((cls) => (cls.id === activeClass.id ? { ...cls, ...updates } : cls)));
      await refreshClass(activeClass.id);
      if (year) {
        setExpandedYears((prev) => new Set([...prev, year]));
      }
      showToast?.("Class info updated");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, classes, refreshClass, showToast]);

  const saveExamForClass = useCallback(async (classObj, exam) => {
    if (!classObj) return;
    try {
      const updatedSchoolInfo = { ...(classObj.school_info ?? DEFAULT_SCHOOL), exam };
      await API.updateClass(classObj.id, { schoolInfo: updatedSchoolInfo });
      setClasses((prev) =>
        prev.map((cls) =>
          cls.id === classObj.id
            ? { ...cls, school_info: { ...(cls.school_info ?? {}), exam } }
            : cls
        )
      );
    } catch {
      // Exam persistence is best-effort only.
    }
  }, []);

  const onArchiveClass = useCallback(async () => {
    if (!activeClass) return;
    try {
      await API.deleteClass(activeClass.id);
      setClasses((prev) => prev.map((cls) => (cls.id === activeClass.id ? { ...cls, archived: true } : cls)));
      showToast?.("Class archived");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, showToast]);

  const onRestoreClass = useCallback(async () => {
    if (!activeClass) return;
    try {
      const updated = normalizeClass(await API.restoreClass(activeClass.id));
      setClasses((prev) => prev.map((cls) => (cls.id === activeClass.id ? { ...updated, students: cls.students } : cls)));
      showToast?.("Class restored");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, showToast]);

  const onPublishClass = useCallback(async () => {
    if (!activeClass) return;
    try {
      const result = await API.publishClass(activeClass.id);
      setClasses((prev) =>
        prev.map((cls) => (
          cls.id === activeClass.id
            ? { ...cls, published: result.published, publishedAt: result.published_at }
            : cls
        ))
      );
      showToast?.("Results published");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, showToast]);

  const onUnpublishClass = useCallback(async () => {
    if (!activeClass) return;
    try {
      await API.unpublishClass(activeClass.id);
      setClasses((prev) =>
        prev.map((cls) => (
          cls.id === activeClass.id
            ? { ...cls, published: false, publishedAt: null }
            : cls
        ))
      );
      showToast?.("Results unpublished");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, showToast]);

  const onExportBackup = useCallback(async () => {
    try {
      const data = await API.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `school-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast?.("Backup exported");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [showToast]);

  const onImportBackup = useCallback(async (parsed) => {
    try {
      if (!parsed || !Array.isArray(parsed.classes)) {
        showToast?.("Invalid backup file", "error");
        return;
      }
      const result = await API.restore(parsed);
      showToast?.(`Restore: ${result.created} created, ${result.skipped} skipped`);
      const data = await API.getClasses();
      setClasses(data.map(normalizeClass));
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [showToast]);

  const onLoadAuditLog = useCallback(async () => {
    if (!activeClass) return;
    try {
      const logs = await API.getAuditLog(activeClass.id);
      setAuditLogs(logs);
    } catch (err) {
      showToast?.(err.message, "error");
    }
  }, [activeClass, showToast]);

  const onChangeExam = useCallback((exam) => {
    setActiveExam(exam);
    saveExamForClass(activeClass, exam);
  }, [activeClass, saveExamForClass]);

  return {
    classes,
    activeId,
    setActiveId,
    activeExam,
    setActiveExam,
    activeClass,
    loading,
    error,
    expandedYears,
    auditLogs,
    allComputed,
    activeComputed,
    classesByYear,
    unorganizedClasses,
    toggleYear,
    addClass,
    deleteClass,
    saveExamForClass,
    onAddStudent,
    onUpdateStudent,
    onDeleteStudent,
    onBulkImport,
    onUpdateSchool,
    onUpdateSubjects,
    onUpdateMonthlyExams,
    onUpdateClassMeta,
    onArchiveClass,
    onRestoreClass,
    onPublishClass,
    onUnpublishClass,
    onExportBackup,
    onImportBackup,
    onLoadAuditLog,
    onChangeExam,
    resetClassesState,
  };
}

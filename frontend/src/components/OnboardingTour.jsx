import React, { useEffect, useState } from "react";
import { useViewport } from "../utils/useViewport";

const TOUR_STEPS = [
  {
    targetId: "nav-dashboard",
    title: "Welcome to Bonde Results",
    content: "This is your main dashboard. Here you can see school-wide statistics, active classes, and quickly dive into student results.",
    placement: "right"
  },
  {
    targetId: "nav-classes-group",
    title: "Manage Classes",
    content: "Expand academic years to view and select specific classes. You can add new classes or edit existing ones directly from the sidebar.",
    placement: "right"
  },
  {
    targetId: "nav-timetable",
    title: "Timetable Editor",
    content: "Set up the school's global timetable structure, assign teachers, and allocate subjects to classes. The system actively checks for conflicts.",
    placement: "right"
  },
  {
    targetId: "nav-settings",
    title: "School Settings",
    content: "Configure global subjects, exam types, performance targets, and generate backups. Only Administrators have access to this section.",
    placement: "right"
  }
];

export function OnboardingTour({ role }) {
  const { isMobile, width, height, isShort } = useViewport();
  const [currentStep, setCurrentStep] = useState(-1);
  const [targetRect, setTargetRect] = useState(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => setIsCoarsePointer(mediaQuery.matches);
    updatePointerMode();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePointerMode);
      return () => mediaQuery.removeEventListener("change", updatePointerMode);
    }
    mediaQuery.addListener(updatePointerMode);
    return () => mediaQuery.removeListener(updatePointerMode);
  }, []);

  const shouldHideTour = isMobile || isShort || (isCoarsePointer && Math.min(width, height) < 820);

  useEffect(() => {
    if (shouldHideTour && currentStep >= 0) {
      setCurrentStep(-1);
      setTargetRect(null);
    }
  }, [currentStep, shouldHideTour]);

  useEffect(() => {
    // Only run for admins on first login
    if (role !== "admin" || shouldHideTour) return;
    const hasSeenTour = localStorage.getItem("bonde_tour_seen");
    if (!hasSeenTour) {
      // Start tour after a brief delay to allow rendering
      const timer = window.setTimeout(() => setCurrentStep(0), 1000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [role, shouldHideTour]);

  useEffect(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length || shouldHideTour) return undefined;

    const step = TOUR_STEPS[currentStep];
    const el = document.getElementById(step.targetId);
    if (!el) {
      console.warn("Tour target not found:", step.targetId);
      return undefined;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    const timer = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [currentStep, shouldHideTour, width, height]);

  if (currentStep < 0 || currentStep >= TOUR_STEPS.length || !targetRect || shouldHideTour) {
    return null; // Don't show tour on mobile, or if finished/not started
  }

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep === TOUR_STEPS.length - 1) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(-1);
    localStorage.setItem("bonde_tour_seen", "true");
  };

  // Popover positioning logic
  const popoverStyle = {
    position: "fixed",
    zIndex: 10000,
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    width: Math.min(320, Math.max(260, width - 32)),
    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
    border: "1px solid #e2e8f0",
    transition: "top 0.3s ease, left 0.3s ease",
  };

  if (step.placement === "right") {
    popoverStyle.top = Math.min(
      Math.max(20, targetRect.top + targetRect.height / 2 - 100),
      height - 220
    );
    popoverStyle.left = Math.min(
      targetRect.left + targetRect.width + 16,
      width - popoverStyle.width - 16
    );
  } else if (step.placement === "bottom") {
    popoverStyle.top = Math.min(targetRect.top + targetRect.height + 16, height - 220);
    popoverStyle.left = Math.min(
      Math.max(16, targetRect.left + targetRect.width / 2 - popoverStyle.width / 2),
      width - popoverStyle.width - 16
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.5)",
          mixBlendMode: "hard-light",
          pointerEvents: "none" // Allow clicks through overlay
        }}
      />
      {/* Highlight ring around the target */}
      <div
        style={{
          position: "fixed",
          zIndex: 9999,
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          borderRadius: 12,
          boxShadow: "0 0 0 4px #3b82f6, 0 0 0 9999px rgba(0,0,0,0.6)",
          transition: "all 0.3s ease",
          pointerEvents: "none",
        }}
      />
      
      <div style={popoverStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.5, marginBottom: 20 }}>
          {step.content}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                color: "#64748b",
                cursor: "pointer",
                padding: "8px 12px"
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)"
              }}
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

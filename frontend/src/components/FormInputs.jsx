import React, { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  onBlur,
  error,
  disabled = false,
  width = "100%",
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    labelRequired: {
      color: "#dc2626",
      marginLeft: 4,
    },
    field: {
      display: "flex",
      alignItems: "center",
      border: error ? "1.5px solid #dc2626" : focused ? "1px solid #2563eb" : "1px solid rgba(214,226,245,0.92)",
      borderRadius: 10,
      padding: "0 10px",
      width,
      background: disabled ? "#f0f4ff" : "#fff",
      boxShadow: focused
        ? error
          ? "0 0 0 3px rgba(220,38,38,0.12)"
          : "0 0 0 3px rgba(37,99,235,0.12)"
        : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    input: {
      border: "none",
      outline: "none",
      boxShadow: "none",
      appearance: "none",
      WebkitAppearance: "none",
      borderRadius: 0,
      padding: "6px 0",
      fontSize: 12,
      width: "100%",
      background: "transparent",
      color: disabled ? "#999" : "#000",
      cursor: disabled ? "not-allowed" : "auto",
    },
    errorMsg: {
      fontSize: 10,
      color: "#dc2626",
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <div style={styles.field}>
        <input
          type={type}
          value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          disabled={disabled}
          style={styles.input}
        />
      </div>
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NUMBER INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  error,
  disabled = false,
  width = "80px",
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    labelRequired: {
      color: "#dc2626",
      marginLeft: 4,
    },
    field: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: error ? "1.5px solid #dc2626" : focused ? "1px solid #2563eb" : "1px solid rgba(214,226,245,0.92)",
      borderRadius: 10,
      padding: "0 10px",
      width,
      background: disabled ? "#f0f4ff" : "#fff",
      boxShadow: focused
        ? error
          ? "0 0 0 3px rgba(220,38,38,0.12)"
          : "0 0 0 3px rgba(37,99,235,0.12)"
        : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    input: {
      border: "none",
      outline: "none",
      boxShadow: "none",
      appearance: "none",
      WebkitAppearance: "none",
      borderRadius: 0,
      padding: "6px 0",
      fontSize: 12,
      width: "100%",
      textAlign: "center",
      background: "transparent",
      color: disabled ? "#999" : "#000",
      cursor: disabled ? "not-allowed" : "auto",
    },
    errorMsg: {
      fontSize: 10,
      color: "#dc2626",
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <div style={styles.field}>
        <input
          type="number"
          value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          min={min}
          max={max}
          disabled={disabled}
          style={styles.input}
        />
      </div>
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECT INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export function SelectInput({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
  width = "100%",
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    labelRequired: {
      color: "#dc2626",
      marginLeft: 4,
    },
    field: {
      display: "flex",
      alignItems: "center",
      border: error ? "1.5px solid #dc2626" : focused ? "1px solid #2563eb" : "1px solid rgba(214,226,245,0.92)",
      borderRadius: 10,
      padding: "0 10px",
      width,
      background: "#fff",
      boxShadow: focused
        ? error
          ? "0 0 0 3px rgba(220,38,38,0.12)"
          : "0 0 0 3px rgba(37,99,235,0.12)"
        : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    select: {
      border: "none",
      outline: "none",
      boxShadow: "none",
      appearance: "none",
      WebkitAppearance: "none",
      borderRadius: 0,
      padding: "6px 0",
      fontSize: 12,
      width: "100%",
      background: "transparent",
      color: "#000",
      cursor: disabled ? "not-allowed" : "auto",
    },
    errorMsg: {
      fontSize: 10,
      color: "#dc2626",
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <div style={styles.field}>
        <select
          value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          style={styles.select}
        >
          <option value="">-- Select {label} --</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTAREA INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  required = false,
}) {
  const [focused, setFocused] = useState(false);
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    labelRequired: {
      color: "#dc2626",
      marginLeft: 4,
    },
    field: {
      display: "flex",
      alignItems: "stretch",
      border: error ? "1.5px solid #dc2626" : focused ? "1px solid #2563eb" : "1px solid rgba(214,226,245,0.92)",
      borderRadius: 10,
      padding: "8px 10px",
      background: "#fff",
      boxShadow: focused
        ? error
          ? "0 0 0 3px rgba(220,38,38,0.12)"
          : "0 0 0 3px rgba(37,99,235,0.12)"
        : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
    },
    textarea: {
      border: "none",
      outline: "none",
      boxShadow: "none",
      appearance: "none",
      WebkitAppearance: "none",
      borderRadius: 0,
      padding: 0,
      fontSize: 12,
      fontFamily: "inherit",
      resize: "vertical",
      background: "transparent",
      color: "#000",
      width: "100%",
    },
    errorMsg: {
      fontSize: 10,
      color: "#dc2626",
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <div style={styles.field}>
        <textarea
          value={value ?? ""}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={rows}
          style={styles.textarea}
        />
      </div>
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

import React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  width = "200px",
  required = false,
}) {
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#555",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    labelRequired: {
      color: "#cc2222",
      marginLeft: 4,
    },
    input: {
      border: error ? "2px solid #cc2222" : "1.5px solid #ccd6f0",
      borderRadius: 5,
      padding: "6px 10px",
      fontSize: 12,
      outline: "none",
      width,
      background: disabled ? "#f0f4ff" : "#fff",
      color: disabled ? "#999" : "#000",
      cursor: disabled ? "not-allowed" : "auto",
      transition: "border-color 0.2s",
    },
    errorMsg: {
      fontSize: 10,
      color: "#cc2222",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={styles.input}
      />
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
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#555",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    labelRequired: {
      color: "#cc2222",
      marginLeft: 4,
    },
    input: {
      border: error ? "2px solid #cc2222" : "1.5px solid #ccd6f0",
      borderRadius: 5,
      padding: "6px 10px",
      fontSize: 12,
      outline: "none",
      width,
      textAlign: "center",
      background: disabled ? "#f0f4ff" : "#fff",
      color: disabled ? "#999" : "#000",
      cursor: disabled ? "not-allowed" : "auto",
      transition: "border-color 0.2s",
    },
    errorMsg: {
      fontSize: 10,
      color: "#cc2222",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <input
        type="number"
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        style={styles.input}
      />
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
  width = "150px",
  required = false,
}) {
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#555",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    labelRequired: {
      color: "#cc2222",
      marginLeft: 4,
    },
    select: {
      border: error ? "2px solid #cc2222" : "1.5px solid #ccd6f0",
      borderRadius: 5,
      padding: "6px 10px",
      fontSize: 12,
      outline: "none",
      width,
      background: "#fff",
      color: "#000",
      cursor: disabled ? "not-allowed" : "auto",
      transition: "border-color 0.2s",
    },
    errorMsg: {
      fontSize: 10,
      color: "#cc2222",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <select
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
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
  const styles = {
    wrapper: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: "#555",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    labelRequired: {
      color: "#cc2222",
      marginLeft: 4,
    },
    textarea: {
      border: error ? "2px solid #cc2222" : "1.5px solid #ccd6f0",
      borderRadius: 5,
      padding: "8px 10px",
      fontSize: 12,
      outline: "none",
      fontFamily: "inherit",
      resize: "vertical",
      background: "#fff",
      color: "#000",
      transition: "border-color 0.2s",
    },
    errorMsg: {
      fontSize: 10,
      color: "#cc2222",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.labelRequired}>*</span>}
      </label>
      <textarea
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={styles.textarea}
      />
      {error && <div style={styles.errorMsg}>{error}</div>}
    </div>
  );
}

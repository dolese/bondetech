export function DeleteClassDialog({ className, styles, onCancel, onConfirm }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#8b2500", marginBottom: 8 }}>Delete Class?</div>
        <div style={{ fontSize: 13, color: "#444", marginBottom: 20 }}>
          Permanently delete <b>{className}</b> and all its student data?
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={styles.btnGray} onClick={onCancel}>Cancel</button>
          <button style={styles.btnRed} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

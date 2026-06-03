import jsPDF from "jspdf";

export function exportContactsCsv(contacts) {
  const headers = ["Name", "Email", "Company", "Role", "Area", "Proximity", "Tags"];
  const rows = contacts.map((contact) => [
    contact.name,
    contact.email,
    contact.company,
    contact.role,
    contact.area,
    contact.proximity,
    contact.tags?.join("|")
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reconnect-ai-contacts.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function exportContactPdf(contact, intelligence) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reconnect AI - Relationship Brief", 16, 18);
  doc.setFontSize(13);
  doc.text(contact.name, 16, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${contact.role || "Role"} at ${contact.company || "Company"}`, 16, 42);
  doc.text(`Score: ${intelligence?.relationshipScore || contact.proximity}/100`, 16, 54);
  doc.text("Recommended action:", 16, 68);
  doc.text(doc.splitTextToSize(intelligence?.nextAction || "Generate intelligence first.", 170), 16, 76);
  doc.text("Summary:", 16, 98);
  doc.text(doc.splitTextToSize(intelligence?.summary || "No summary available.", 170), 16, 106);
  doc.save(`${contact.name.replaceAll(" ", "-").toLowerCase()}-brief.pdf`);
}

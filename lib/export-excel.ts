import * as XLSX from "xlsx";

export function downloadExcel(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // Auto-fit column widths based on content
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    ),
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

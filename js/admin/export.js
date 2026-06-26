/* ============================================================================
   Utilidades de exportación de informes: tabla HTML, descarga CSV e impresión
   a PDF en una ventana aparte. Sin dependencias externas.
   ============================================================================ */
import { esc } from "./helpers.js";

// Tabla HTML simple desde columnas + filas (celdas en texto plano, se escapan aquí).
export function buildTable(columns, rows, className = "") {
  const head = `<thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows.map((r) => `<tr>${r.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table${className ? ` class="${className}"` : ""}>${head}${body}</table>`;
}

// Descarga un CSV. Separador ";" (Excel en español) y BOM UTF-8 para los acentos.
export function downloadCSV(filename, columns, rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const sep = ";";
  const lines = [columns.map(cell).join(sep), ...rows.map((r) => r.map(cell).join(sep))];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Abre una ventana con el informe listo para imprimir / "Guardar como PDF".
// Devuelve false si el navegador bloqueó la ventana emergente.
export function printReport(title, meta, columns, rows) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    *{box-sizing:border-box;} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px;}
    h1{font-size:18px;margin:0 0 4px;} .meta{color:#555;font-size:12px;margin:0 0 18px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th,td{border:1px solid #ccc;padding:6px 9px;text-align:left;}
    th{background:#f3f4f6;text-transform:uppercase;font-size:10px;letter-spacing:.04em;}
    tr:nth-child(even) td{background:#fafafa;}
  </style></head><body>
    <h1>${esc(title)}</h1>
    <p class="meta">${esc(meta)}</p>
    ${buildTable(columns, rows)}
    <script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script>
  </body></html>`;
  w.document.open();
  w.document.write(doc);
  w.document.close();
  return true;
}

// "Lista de precios actuales" → "lista-de-precios-actuales"
export function slugify(text) {
  return String(text || "informe")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

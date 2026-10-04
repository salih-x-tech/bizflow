import "server-only";
import Decimal from "decimal.js";
import type { getInvoice } from "@/services/invoice/get-invoice.service";

type PrintableInvoice = Awaited<ReturnType<typeof getInvoice>>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatAmount(value: number): string {
  const [whole, fraction = ""] =
    new Decimal(value.toString()).toFixed().split(".");

  const groupedWhole = whole.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  return `${groupedWhole}.${fraction.padEnd(2, "0")}`;
}

function formatDate(value: Date): string {
  return `${value.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function renderContact(
  contact: PrintableInvoice["businessSnapshot"],
): string {
  return `
    <p class="contact-name">${escapeHtml(contact.name)}</p>
    ${contact.email
      ? `<p>${escapeHtml(contact.email)}</p>`
      : ""}
    ${contact.phone
      ? `<p>${escapeHtml(contact.phone)}</p>`
      : ""}
    ${contact.address
      ? `<p class="address">${escapeHtml(contact.address)}</p>`
      : ""}
  `;
}

export function renderInvoiceHtml(
  invoice: PrintableInvoice,
): string {
  const currency = escapeHtml(invoice.currency);
  const isVoided = invoice.status === "Voided";

  const rows = invoice.itemsSnapshot.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.productNameSnapshot)}</td>
      <td class="number">${escapeHtml(item.quantity.toString())}</td>
      <td class="number">${escapeHtml(formatAmount(item.unitPriceAtOrder))}</td>
      <td class="number">${escapeHtml(formatAmount(item.lineTotal))}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      color: #172033;
      background: #f1f5f9;
      font: 14px/1.5 Arial, sans-serif;
    }
    .invoice {
      max-width: 900px;
      margin: 0 auto;
      padding: 36px;
      background: white;
      border: 1px solid #dbe2ea;
      border-radius: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 2px solid #172033;
    }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 {
      margin: 0 0 10px;
      font-size: 12px;
      color: #526176;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    p { margin: 4px 0; overflow-wrap: anywhere; }
    .reference { max-width: 480px; }
    .status {
      display: inline-block;
      padding: 6px 12px;
      font-weight: bold;
      border: 1px solid #166534;
      color: #166534;
      border-radius: 6px;
    }
    .status.voided { color: #991b1b; border-color: #991b1b; }
    .notice {
      margin-top: 20px;
      padding: 12px;
      border: 1px solid #991b1b;
      color: #991b1b;
      font-weight: bold;
    }
    .contacts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin: 28px 0;
    }
    .contact-name { font-weight: bold; font-size: 16px; }
    .address { white-space: pre-wrap; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 12px 10px;
      border-bottom: 1px solid #dbe2ea;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th { background: #f1f5f9; font-size: 12px; }
    .number { text-align: right; }
    .totals {
      width: min(100%, 340px);
      margin: 24px 0 0 auto;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 10px 0;
    }
    .grand-total {
      border-top: 2px solid #172033;
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      margin-top: 32px;
      color: #526176;
      font-size: 12px;
      border-top: 1px solid #dbe2ea;
      padding-top: 16px;
    }
    .print-hint {
      max-width: 900px;
      margin: 0 auto 16px;
      color: #526176;
    }
    @media (max-width: 600px) {
      .invoice { padding: 20px; }
      .header { flex-direction: column; }
      .contacts { grid-template-columns: 1fr; gap: 20px; }
    }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { padding: 0; background: white; color: black; }
      .invoice {
        max-width: none;
        padding: 0;
        border: 0;
        border-radius: 0;
      }
      .print-hint { display: none; }
      .table-wrap { overflow: visible; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      .totals, .contacts, .header { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <p class="print-hint">Use your browser's Print command (Ctrl+P) to print this invoice.</p>

  <main class="invoice">
    <header class="header">
      <div class="reference">
        <h1>Invoice</h1>
        <p><strong>${escapeHtml(invoice.invoiceNumber)}</strong></p>
        <p>Issued: ${escapeHtml(formatDate(invoice.issuedAt))}</p>
        <p>Order: ${escapeHtml(invoice.orderId)}</p>
        <p>Currency: ${currency}</p>
        ${invoice.voidedAt
          ? `<p>Voided: ${escapeHtml(formatDate(invoice.voidedAt))}</p>`
          : ""}
      </div>
      <span class="status${isVoided ? " voided" : ""}">
        ${isVoided ? "VOIDED" : "ISSUED"}
      </span>
    </header>

    ${isVoided
      ? `<div class="notice">VOIDED — This invoice was cancelled and is retained for historical reference.</div>`
      : ""}

    <section class="contacts">
      <div>
        <h2>From</h2>
        ${renderContact(invoice.businessSnapshot)}
      </div>
      <div>
        <h2>Bill to</h2>
        ${renderContact(invoice.customerSnapshot)}
      </div>
    </section>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Product</th>
            <th scope="col" class="number">Quantity</th>
            <th scope="col" class="number">Unit price (${currency})</th>
            <th scope="col" class="number">Amount (${currency})</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <section class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${currency} ${escapeHtml(formatAmount(invoice.subtotal))}</span>
      </div>
      <div class="total-row grand-total">
        <span>Total</span>
        <span>${currency} ${escapeHtml(formatAmount(invoice.totalAmount))}</span>
      </div>
    </section>

    <footer class="footer">
      Saved invoice details are shown as recorded at issuance.
      All dates are displayed in UTC.
    </footer>
  </main>
</body>
</html>`;
}
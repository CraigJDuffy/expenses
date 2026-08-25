const ALLOWED_ORIGIN = "https://craigjduffy.github.io";

const MAX_EXPENSES = 50;
const MAX_FIELD_LENGTH = 200;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // per file
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // per submission

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sanitizeLine(value) {
  return value.replace(/[\r\n]+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {

    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...corsHeaders(request),
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: corsHeaders(request)
      });
    }

    let form;
    try {
      form = await request.formData();
    } catch (err) {
      return new Response("Invalid form data", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    const name = sanitizeLine((form.get("name") || "").toString().trim()).slice(0, MAX_FIELD_LENGTH);
    const email = (form.get("email") || "").toString().trim().slice(0, MAX_FIELD_LENGTH);
    const membership = sanitizeLine((form.get("membership") || "").toString().trim()).slice(0, MAX_FIELD_LENGTH);
    const accountNumber = (form.get("account_number") || "").toString().trim();
    const sortCode = (form.get("sort_code") || "").toString().trim();

    if (!name) {
      return new Response("Name is required", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) {
      return new Response("A valid email address is required", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    if (!/^\d{6,8}$/.test(accountNumber)) {
      return new Response("Account number must be 6-8 digits", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    if (!/^\d{2}-?\d{2}-?\d{2}$/.test(sortCode)) {
      return new Response("Sort code must be in the form 00-00-00", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    if ((form.get("declaration") || "").toString() !== "confirmed") {
      return new Response("You must confirm the information provided is true and accurate", {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    // --- Collect expenses into structured rows ---
    const expenses = {};

    for (const [key, value] of form.entries()) {
      if (key.startsWith("expense_") && !(value instanceof File)) {
        const [, index, field] = key.split("_"); // e.g. expense_1_amount
        if (!expenses[index]) expenses[index] = {};
        expenses[index][field] = sanitizeLine(value.toString()).slice(0, MAX_FIELD_LENGTH);
      }
    }

    const expenseIndexes = Object.keys(expenses);
    if (expenseIndexes.length === 0) {
      return new Response("At least one expense is required", {
        status: 400,
        headers: corsHeaders(request)
      });
    }
    if (expenseIndexes.length > MAX_EXPENSES) {
      return new Response(`Too many expenses (max ${MAX_EXPENSES})`, {
        status: 400,
        headers: corsHeaders(request)
      });
    }

    // Build HTML table rows + running total
    let expensesTableRows = "";
    let totalAmount = 0;

    for (const index of expenseIndexes) {
      const row = expenses[index];
      const amount = parseFloat(row.amount || "0") || 0;
      totalAmount += amount;

      expensesTableRows += `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.details)}</td>
          <td>£${amount.toFixed(2)}</td>
        </tr>
      `;
    }

    // Plain‑text fallback
    let expensesText = "";
    for (const index of expenseIndexes) {
      const row = expenses[index];
      const amount = parseFloat(row.amount || "0") || 0;
      expensesText += `Date: ${row.date}, Details: ${row.details}, Amount: £${amount.toFixed(2)}\n`;
    }

    expensesText += `\nTotal: £${totalAmount.toFixed(2)}\n`;

    // --- Collect attachments ---
    const attachments = [];
    let totalAttachmentBytes = 0;
    for (const [key, value] of form.entries()) {
      if (value instanceof File && value.size > 0) {
        if (value.type !== "application/pdf" && !value.type.startsWith("image/")) {
          return new Response(`Attachment "${value.name}" must be an image or PDF`, {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        if (value.size > MAX_ATTACHMENT_BYTES) {
          return new Response(`Attachment "${value.name}" exceeds the size limit`, {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        totalAttachmentBytes += value.size;
        if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          return new Response("Attachments exceed the total size limit", {
            status: 400,
            headers: corsHeaders(request)
          });
        }
        const buffer = await value.arrayBuffer();
        attachments.push({
          filename: value.name,
          content: arrayBufferToBase64(buffer)
        });
      }
    }

    // --- Build email payload ---
    const emailPayload = {
      from: "Expenses Form <onboarding@resend.dev>",
      to: ["9084082@ea.edin.sch.uk"],
      reply_to: [email],

      subject: `Expenses from ${name}`,

      text: `Name: ${name}
Email: ${email}
Membership: ${membership || "Not provided"}

Expenses:
${expensesText}

Bank Details:
Account Number: ${accountNumber}
Sort Code: ${sortCode}

Declaration: ${name} confirmed the information above is true and accurate.
`,

      html: `
        <h2>Expenses Submission</h2>

        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Membership:</strong> ${escapeHtml(membership) || "Not provided"}</p>

        <h3>Expenses</h3>

        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Details</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expensesTableRows}
          </tbody>
        </table>

        <h3>Total</h3>
        <p><strong>£${totalAmount.toFixed(2)}</strong></p>

        <h3>Bank Details</h3>
        <p><strong>Account Number:</strong> ${accountNumber}</p>
        <p><strong>Sort Code:</strong> ${sortCode}</p>

        <p style="color:#555;font-size:13px;">${escapeHtml(name)} confirmed the information above is true and accurate.</p>
      `,

      attachments
    };

    // --- Send email via Resend ---
    let response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });
    } catch (err) {
      console.log("Resend request failed:", err);
      return new Response("Email failed to send", {
        status: 502,
        headers: corsHeaders(request)
      });
    }

    const resendText = await response.text();
    console.log("Resend response:", resendText);

    if (!response.ok) {
      return new Response("Email failed to send", {
        status: 500,
        headers: corsHeaders(request)
      });
    }

    return new Response("Expenses submitted successfully", {
      headers: corsHeaders(request)
    });
  }
};

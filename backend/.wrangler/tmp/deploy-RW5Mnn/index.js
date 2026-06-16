var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
var index_default = {
  async fetch(request, env) {
    console.log("Worker started");
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }
    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
    const form = await request.formData();
    const name = form.get("name");
    const membership = form.get("membership");
    const accountNumber = form.get("account_number");
    const sortCode = form.get("sort_code");
    console.log("Name:", name);
    console.log("Membership:", membership);
    console.log("Account Number:", accountNumber);
    console.log("Sort Code:", sortCode);
    const expenses = {};
    for (const [key, value] of form.entries()) {
      if (key.startsWith("expense_")) {
        const [, index, field] = key.split("_");
        if (!expenses[index]) expenses[index] = {};
        expenses[index][field] = value;
      }
    }
    let expensesTableRows = "";
    let totalAmount = 0;
    for (const index in expenses) {
      const row = expenses[index];
      const amount = parseFloat(row.amount || "0") || 0;
      totalAmount += amount;
      expensesTableRows += `
        <tr>
          <td>${row.date || ""}</td>
          <td>${row.details || ""}</td>
          <td>\xA3${amount.toFixed(2)}</td>
        </tr>
      `;
    }
    let expensesText = "";
    for (const index in expenses) {
      const row = expenses[index];
      const amount = parseFloat(row.amount || "0") || 0;
      expensesText += `Date: ${row.date}, Details: ${row.details}, Amount: \xA3${amount.toFixed(2)}
`;
    }
    expensesText += `
Total: \xA3${totalAmount.toFixed(2)}
`;
    const attachments = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof File && value.size > 0) {
        const buffer = await value.arrayBuffer();
        attachments.push({
          filename: value.name,
          content: arrayBufferToBase64(buffer)
        });
      }
    }
    const emailPayload = {
      from: "Expenses Form <onboarding@resend.dev>",
      to: ["9084082@ea.edin.sch.uk"],
      subject: `Expenses from ${name}`,
      text: `Name: ${name}
Membership: ${membership}

Expenses:
${expensesText}

Bank Details:
Account Number: ${accountNumber}
Sort Code: ${sortCode}
`,
      html: `
        <h2>Expenses Submission</h2>

        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Membership:</strong> ${membership}</p>

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
        <p><strong>\xA3${totalAmount.toFixed(2)}</strong></p>

        <h3>Bank Details</h3>
        <p><strong>Account Number:</strong> ${accountNumber}</p>
        <p><strong>Sort Code:</strong> ${sortCode}</p>
      `,
      attachments
    };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });
    const resendText = await response.text();
    console.log("Resend response:", resendText);
    if (!response.ok) {
      return new Response("Email failed to send", {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    return new Response("Expenses submitted successfully", {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

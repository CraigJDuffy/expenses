export default {
  async fetch(request) {

    // --- CORS preflight ---
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
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    const form = await request.formData();

    const name = form.get("name");
    const membership = form.get("membership");

    // --- Collect expenses ---
    let expensesText = "";
    for (const [key, value] of form.entries()) {
      if (key.startsWith("expense_")) {
        expensesText += `${key}: ${value}\n`;
      }
    }

    // --- Collect attachments safely ---
    const attachments = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof File && value.size > 0) {
        attachments.push({
          content: await value.arrayBuffer(),
          filename: value.name,
          type: value.type
        });
      }
    }

    // --- Build email payload ---
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: "craigduffyonline@gmail.com" }],
          reply_to: { email: "craigduffyonline@gmail.com" }
        }
      ],
      from: { email: "no-reply@notify.mailchannels.net" },
      subject: `Expenses from ${name}`,
      content: [
        {
          type: "text/plain",
          value: `Name: ${name}
Membership: ${membership}

Expenses:
${expensesText}`
        }
      ],
      attachments: attachments.map(a => ({
        content: btoa(String.fromCharCode(...new Uint8Array(a.content))),
        filename: a.filename,
        type: a.type
      }))
    };

    // --- Send email ---
const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Log-Level": "DEBUG"
  },
  body: JSON.stringify(emailPayload)
});
    if (!response.ok) {
      return new Response("Email failed to send", {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    return new Response("Expenses submitted successfully", {
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });

  }
};

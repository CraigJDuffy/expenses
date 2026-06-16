export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const form = await request.formData();

    const name = form.get("name");
    const membership = form.get("membership");

    // Collect expenses
    let expensesText = "";
    for (const [key, value] of form.entries()) {
      if (key.startsWith("expense_")) {
        expensesText += `${key}: ${value}\n`;
      }
    }

    // Collect attachments
    const attachments = [];
    for (const [key, value] of form.entries()) {
      if (value instanceof File) {
        attachments.push({
          content: await value.arrayBuffer(),
          filename: value.name,
          type: value.type
        });
      }
    }

    const emailPayload = {
      personalizations: [
        {
          to: [{ email: "craigjduffy@icloud.com" }]
        }
      ],
      from: { email: "edinburghla@eis.org.uk" },
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

    const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      return new Response("Email failed to send", { status: 500 });
    }

    return new Response("Expenses submitted successfully");
  }
};

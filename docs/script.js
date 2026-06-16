let expenseCount = 0;

document.getElementById("addExpense").addEventListener("click", () => {
  expenseCount++;

  const div = document.createElement("div");
  div.className = "expense-item";

  div.innerHTML = `
    <input type="date" name="expense_date_${expenseCount}" required>
    <input type="text" name="expense_desc_${expenseCount}" placeholder="Description" required>
    <input type="number" step="0.01" name="expense_amount_${expenseCount}" placeholder="Amount" required>
    <input type="file" name="receipt_${expenseCount}" accept="image/*,application/pdf">
  `;

  document.getElementById("expenses").appendChild(div);
});

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch("https://expenses-backend.cjduffyexpenses.workers.dev/", {
      method: "POST",
      body: formData
    });

    const text = await response.text();

    if (response.ok) {
      alert("Expenses submitted successfully");
    } else {
      alert("Error submitting expenses: " + text);
    }

  } catch (err) {
    alert("Network error submitting expenses");
    console.error(err);
  }
});

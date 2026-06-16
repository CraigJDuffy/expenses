let expenseCount = 0;

function addExpense() {
  expenseCount++;
  const container = document.getElementById("expenses");

  const div = document.createElement("div");
  div.className = "expense-item";
  div.innerHTML = `
    <input type="date" name="expense_date_${expenseCount}" required>
    <input type="text" name="expense_desc_${expenseCount}" placeholder="Description" required>
    <input type="number" step="0.01" name="expense_amount_${expenseCount}" placeholder="Amount" required>
    <input type="file" name="receipt_${expenseCount}" accept="image/*,application/pdf">
  `;
  container.appendChild(div);
}

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const response = await fetch("YOUR_WORKER_URL_HERE", {
    method: "POST",
    body: formData
  });

  alert(await response.text());
});

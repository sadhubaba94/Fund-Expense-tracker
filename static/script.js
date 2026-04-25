const apiUrl = "/transactions";

const state = {
  transactions: [],
  filterType: "",
  filterStartDate: "",
  filterEndDate: "",
};

const tableBody = document.getElementById("transactionTableBody");
const form = document.getElementById("transactionForm");
const formTitle = document.getElementById("formTitle");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEdit");
const themeToggle = document.getElementById("themeToggle");

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function paintChart(income, expense) {
  const canvas = document.getElementById("financeChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  ctx.font = "14px sans-serif";

  const values = [income, expense];
  const labels = ["Income", "Expense"];
  const colors = ["#13a865", "#d83333"];
  const max = Math.max(...values, 1);

  const barWidth = 120;
  const gap = 90;
  const baseX = (w - (barWidth * 2 + gap)) / 2;

  values.forEach((val, idx) => {
    const barHeight = (val / max) * (h - 80);
    const x = baseX + idx * (barWidth + gap);
    const y = h - 40 - barHeight;

    ctx.fillStyle = colors[idx];
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
    ctx.fillText(labels[idx], x + 28, h - 12);
    ctx.fillText(formatCurrency(val), x + 8, y - 8);
  });
}

function resetForm() {
  form.reset();
  document.getElementById("transactionId").value = "";
  document.getElementById("date").value = new Date().toISOString().split("T")[0];
  formTitle.textContent = "Add Transaction";
  saveButton.textContent = "Save Transaction";
  cancelEditButton.classList.add("hidden");
}

function getPayload() {
  return {
    type: document.getElementById("type").value,
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value.trim(),
    date: document.getElementById("date").value,
    notes: document.getElementById("notes").value.trim(),
  };
}

function validateForm(payload) {
  if (!payload.type || !payload.amount || !payload.category || !payload.date) {
    alert("Please fill all required fields.");
    return false;
  }

  if (Number(payload.amount) < 0) {
    alert("Amount cannot be negative.");
    return false;
  }

  return true;
}

async function fetchTransactions() {
  const params = new URLSearchParams();
  if (state.filterType) params.append("type", state.filterType);
  if (state.filterStartDate) params.append("start_date", state.filterStartDate);
  if (state.filterEndDate) params.append("end_date", state.filterEndDate);

  const response = await fetch(`${apiUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  state.transactions = await response.json();
  render();
}

async function createTransaction(payload) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add transaction");
  }
}

async function updateTransaction(id, payload) {
  const response = await fetch(`${apiUrl}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update transaction");
  }
}

async function deleteTransaction(id) {
  const response = await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete transaction");
  }
}

function renderSummary() {
  const totals = state.transactions.reduce(
    (acc, tx) => {
      if (tx.type === "income") {
        acc.income += Number(tx.amount);
      } else {
        acc.expense += Number(tx.amount);
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;

  document.getElementById("balance").textContent = formatCurrency(balance);
  document.getElementById("income").textContent = formatCurrency(totals.income);
  document.getElementById("expense").textContent = formatCurrency(totals.expense);

  paintChart(totals.income, totals.expense);
}

function renderTable() {
  if (!state.transactions.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty">No transactions found.</td></tr>';
    return;
  }

  tableBody.innerHTML = state.transactions
    .map(
      (tx) => `
      <tr>
        <td>${tx.date}</td>
        <td>
          <div>${tx.category}</div>
          <small>${tx.notes || "-"}</small>
        </td>
        <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
        <td class="amount-${tx.type}">${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
        <td>
          <button class="action-btn" data-edit-id="${tx.id}">Edit</button>
          <button class="action-btn delete" data-delete-id="${tx.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function render() {
  renderSummary();
  renderTable();
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = getPayload();
  if (!validateForm(payload)) return;

  const transactionId = document.getElementById("transactionId").value;

  try {
    if (transactionId) {
      await updateTransaction(transactionId, payload);
    } else {
      await createTransaction(payload);
    }

    resetForm();
    await fetchTransactions();
  } catch (error) {
    alert(error.message);
  }
}

function startEdit(transaction) {
  document.getElementById("transactionId").value = transaction.id;
  document.getElementById("type").value = transaction.type;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("category").value = transaction.category;
  document.getElementById("date").value = transaction.date;
  document.getElementById("notes").value = transaction.notes || "";

  formTitle.textContent = "Edit Transaction";
  saveButton.textContent = "Update Transaction";
  cancelEditButton.classList.remove("hidden");
}

async function handleTableActions(event) {
  const editId = event.target.dataset.editId;
  const deleteId = event.target.dataset.deleteId;

  if (editId) {
    const tx = state.transactions.find((item) => String(item.id) === String(editId));
    if (tx) startEdit(tx);
  }

  if (deleteId) {
    if (!confirm("Delete this transaction?")) return;

    try {
      await deleteTransaction(deleteId);
      await fetchTransactions();
    } catch (error) {
      alert(error.message);
    }
  }
}

function bindFilters() {
  document.getElementById("filterType").addEventListener("change", async (event) => {
    state.filterType = event.target.value;
    await fetchTransactions();
  });

  document.getElementById("filterStartDate").addEventListener("change", async (event) => {
    state.filterStartDate = event.target.value;
    await fetchTransactions();
  });

  document.getElementById("filterEndDate").addEventListener("change", async (event) => {
    state.filterEndDate = event.target.value;
    await fetchTransactions();
  });

  document.getElementById("clearFilters").addEventListener("click", async () => {
    state.filterType = "";
    state.filterStartDate = "";
    state.filterEndDate = "";

    document.getElementById("filterType").value = "";
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";

    await fetchTransactions();
  });
}

function bindThemeToggle() {
  const savedTheme = localStorage.getItem("expense_tracker_theme") || "light";
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️ Light Mode";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");

    localStorage.setItem("expense_tracker_theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";

    renderSummary();
  });
}

function bindEvents() {
  form.addEventListener("submit", handleSubmit);
  tableBody.addEventListener("click", handleTableActions);
  cancelEditButton.addEventListener("click", resetForm);

  bindFilters();
  bindThemeToggle();
}

async function init() {
  bindEvents();
  resetForm();

  try {
    await fetchTransactions();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty">${error.message}</td></tr>`;
  }
}

init();

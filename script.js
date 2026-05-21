// Data inventory
let inventory = [];
let currentSearch = "";
let currentKategori = "";
let editingId = null;
let darkMode = localStorage.getItem("darkMode") === "true";
let chartInstance = null;

// Load data dari localStorage
function loadData() {
  const stored = localStorage.getItem("stockflow_inventory");
  inventory = stored ? JSON.parse(stored) : [];
  renderTable();
  updateStats();
  updateChart();
}

// Simpan ke localStorage
function saveToLocal() {
  localStorage.setItem("stockflow_inventory", JSON.stringify(inventory));
}

// Notifikasi
function showNotif(message, isError = false) {
  const notif = document.createElement("div");
  notif.className = `toast-notif ${isError ? "error" : ""}`;
  notif.innerHTML = `<i class="fas ${isError ? "fa-exclamation-triangle" : "fa-check-circle"}"></i> ${message}`;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 300);
  }, 2800);
}

// Update statistik
function updateStats() {
  document.getElementById("totalBarangCount").innerText = inventory.length;
  document.getElementById("totalStokCount").innerText = inventory.reduce(
    (sum, item) => sum + item.jumlah,
    0,
  );
  document.getElementById("lowStockCount").innerText = inventory.filter(
    (item) => item.jumlah < 5 && item.jumlah > 0,
  ).length;
}

// Update chart - SEKARANG 3 KATEGORI: ATK, Elektronik, Janitor
function updateChart() {
  const categories = ["ATK", "Elektronik", "Janitor"];
  const stokPerKategori = categories.map((cat) =>
    inventory
      .filter((item) => item.kategori === cat)
      .reduce((sum, item) => sum + item.jumlah, 0),
  );
  const ctx = document.getElementById("categoryChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: categories,
      datasets: [
        {
          label: "Total Stok",
          data: stokPerKategori,
          backgroundColor: ["#667eea", "#764ba2", "#f093fb"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: "top" } },
    },
  });
}

// Render tabel
function renderTable() {
  let filtered = inventory.filter((item) => {
    const matchSearch =
      !currentSearch ||
      item.namaOrang.toLowerCase().includes(currentSearch.toLowerCase()) ||
      item.namaBarang.toLowerCase().includes(currentSearch.toLowerCase());
    const matchKategori = !currentKategori || item.kategori === currentKategori;
    return matchSearch && matchKategori;
  });

  const tbody = document.getElementById("tableBody");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">🔍 Tidak ada barang ditemukan</td></tr>`;
    return;
  }

  let html = "";
  filtered.forEach((item, idx) => {
    const lowStockClass = item.jumlah < 5 && item.jumlah > 0 ? "low-stock" : "";
    const warning =
      item.jumlah < 5 && item.jumlah > 0
        ? '<span class="warning-badge">⚠️ Menipis</span>'
        : "";
    html += `<tr class="${lowStockClass}">
                <td>${idx + 1}</td>
                <td>${item.gambar ? `<img src="${item.gambar}">` : '<i class="fas fa-image" style="font-size:24px; opacity:0.4;"></i>'}</td>
                <td><strong>${escapeHtml(item.namaOrang)}</strong></td>
                <td>${escapeHtml(item.namaBarang)}</td>
                <td><span style="background:#e9ecef; padding:4px 10px; border-radius:12px; font-size:0.7rem;">${item.kategori}</span></td>
                <td style="font-size:0.7rem;">${item.waktu}</td>
                <td><strong style="color:#667eea;">${item.jumlah}</strong> ${warning}<button class="ambil-btn" data-id="${item.id}"><i class="fas fa-minus-circle"></i> Ambil 1</button></td>
                <td><button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-pen"></i></button><button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>
            </tr>`;
  });
  tbody.innerHTML = html;

  // Event listeners
  document
    .querySelectorAll(".delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        hapusBarang(parseInt(btn.dataset.id)),
      ),
    );
  document
    .querySelectorAll(".ambil-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        kurangiStok(parseInt(btn.dataset.id)),
      ),
    );
  document
    .querySelectorAll(".edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openEditModal(parseInt(btn.dataset.id)),
      ),
    );
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

// Tambah barang
function tambahBarang(namaOrang, namaBarang, jumlah, kategori, gambarBase64) {
  if (!namaOrang.trim() || !namaBarang.trim() || jumlah <= 0) {
    showNotif("Isi semua data!", true);
    return false;
  }
  const newItem = {
    id: Date.now() + Math.random() * 1000,
    namaOrang: namaOrang.trim(),
    namaBarang: namaBarang.trim(),
    jumlah: parseInt(jumlah),
    kategori: kategori,
    waktu: new Date().toLocaleString("id-ID"),
    gambar: gambarBase64 || null,
  };
  inventory.push(newItem);
  saveToLocal();
  renderTable();
  updateStats();
  updateChart();
  showNotif(`✅ ${newItem.namaBarang} berhasil ditambahkan`);
  return true;
}

// Kurangi stok
function kurangiStok(id) {
  let index = inventory.findIndex((i) => i.id === id);
  if (index === -1) return showNotif("Item tidak ditemukan!", true);
  if (inventory[index].jumlah <= 0) return showNotif("⚠️ Stok habis!", true);
  inventory[index].jumlah -= 1;
  showNotif(
    `🎯 Ambil 1 ${inventory[index].namaBarang}, sisa: ${inventory[index].jumlah}`,
  );
  saveToLocal();
  renderTable();
  updateStats();
  updateChart();
}

// Hapus barang
function hapusBarang(id) {
  inventory = inventory.filter((i) => i.id !== id);
  saveToLocal();
  renderTable();
  updateStats();
  updateChart();
  showNotif("🗑️ Barang berhasil dihapus");
}

// Edit modal
function openEditModal(id) {
  const item = inventory.find((i) => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById("editNamaOrang").value = item.namaOrang;
  document.getElementById("editNamaBarang").value = item.namaBarang;
  document.getElementById("editJumlah").value = item.jumlah;
  document.getElementById("editKategori").value = item.kategori;
  document.getElementById("editModal").style.display = "flex";
}

function saveEdit() {
  const index = inventory.findIndex((i) => i.id === editingId);
  if (index === -1) {
    closeModal();
    return;
  }
  inventory[index].namaOrang = document.getElementById("editNamaOrang").value;
  inventory[index].namaBarang = document.getElementById("editNamaBarang").value;
  inventory[index].jumlah = parseInt(
    document.getElementById("editJumlah").value,
  );
  inventory[index].kategori = document.getElementById("editKategori").value;
  if (inventory[index].jumlah < 0) inventory[index].jumlah = 0;
  saveToLocal();
  renderTable();
  updateStats();
  updateChart();
  showNotif("✏️ Barang berhasil diupdate!");
  closeModal();
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  editingId = null;
}

// Export CSV
document.getElementById("exportBtn").addEventListener("click", () => {
  if (inventory.length === 0) {
    showNotif("Tidak ada data!", true);
    return;
  }
  let csv = "No,Nama Orang,Nama Barang,Kategori,Jumlah,Waktu\n";
  inventory.forEach((item, idx) => {
    csv += `${idx + 1},${item.namaOrang},${item.namaBarang},${item.kategori},${item.jumlah},${item.waktu}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `inventory_${new Date().toISOString().slice(0, 19)}.csv`;
  link.click();
  showNotif("📊 Data berhasil di-export ke CSV!");
});

// Theme Toggle
function applyTheme() {
  if (darkMode) {
    document.body.classList.add("dark");
    document.getElementById("themeToggle").innerHTML =
      '<i class="fas fa-sun"></i> Light';
  } else {
    document.body.classList.remove("dark");
    document.getElementById("themeToggle").innerHTML =
      '<i class="fas fa-moon"></i> Dark';
  }
  updateChart();
}

document.getElementById("themeToggle").addEventListener("click", () => {
  darkMode = !darkMode;
  localStorage.setItem("darkMode", darkMode);
  applyTheme();
});

// Tambah barang event
document.getElementById("btnTambah").addEventListener("click", () => {
  let namaOrang = document.getElementById("namaOrang").value;
  let namaBarang = document.getElementById("namaBarang").value;
  let jumlah = document.getElementById("jumlahBarang").value;
  let kategori = document.getElementById("kategoriBarang").value;
  let fileInput = document.getElementById("gambarUpload").files[0];

  if (!namaOrang || !namaBarang || jumlah < 1) {
    showNotif("Lengkapi data!", true);
    return;
  }

  if (fileInput) {
    const reader = new FileReader();
    reader.onload = (e) => {
      tambahBarang(namaOrang, namaBarang, jumlah, kategori, e.target.result);
      clearForm();
    };
    reader.readAsDataURL(fileInput);
  } else {
    tambahBarang(namaOrang, namaBarang, jumlah, kategori, null);
    clearForm();
  }
});

// Ambil barang via form (cuma butuh nama barang)
document.getElementById("btnAmbilForm").addEventListener("click", () => {
  let namaBarang = document.getElementById("namaBarang").value;
  if (!namaBarang) {
    showNotif("Masukkan nama barang!", true);
    return;
  }
  let targetItem = inventory.find(
    (item) =>
      item.namaBarang.toLowerCase() === namaBarang.toLowerCase() &&
      item.jumlah > 0,
  );
  if (!targetItem) {
    showNotif(`Stok '${namaBarang}' habis/tidak ada!`, true);
    return;
  }
  let index = inventory.findIndex((i) => i.id === targetItem.id);
  inventory[index].jumlah -= 1;
  showNotif(
    `🎉 Ambil 1 ${targetItem.namaBarang}, sisa: ${inventory[index].jumlah}`,
  );
  saveToLocal();
  renderTable();
  updateStats();
  updateChart();
});

// Preview gambar
document
  .getElementById("gambarUpload")
  .addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        let preview = document.getElementById("previewImg");
        preview.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });

function clearForm() {
  document.getElementById("namaOrang").value = "";
  document.getElementById("namaBarang").value = "";
  document.getElementById("jumlahBarang").value = "1";
  document.getElementById("gambarUpload").value = "";
  document.getElementById("previewImg").style.display = "none";
}

// Search & Filter
let debounceTimer;
document.getElementById("searchInput").addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentSearch = e.target.value;
    renderTable();
  }, 300);
});

document.getElementById("kategoriFilter").addEventListener("change", (e) => {
  currentKategori = e.target.value;
  renderTable();
});

// Modal buttons
document.getElementById("saveEditBtn").addEventListener("click", saveEdit);
document.getElementById("cancelEditBtn").addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("editModal")) closeModal();
});

// Init
applyTheme();
loadData();

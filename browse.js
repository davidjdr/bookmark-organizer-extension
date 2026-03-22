// --- State ---
let bookmarks = [];

// --- DOM ---
const folderSelect = document.getElementById("b-folder-select");
const loadBtn = document.getElementById("load-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const browseResults = document.getElementById("browse-results");
const resultsList = document.getElementById("results-list");
const resultsCount = document.getElementById("results-count");
const selectAll = document.getElementById("select-all");
const browseStatus = document.getElementById("browse-status");
const sortRadios = document.querySelectorAll('input[name="sortDir"]');

// --- Helpers ---

function collectFolders(nodes, list = [], depth = 0) {
  for (const node of nodes) {
    if (node.children) {
      list.push({ id: node.id, title: node.title || "(root)", depth });
      collectFolders(node.children, list, depth + 1);
    }
  }
  return list;
}

function formatDate(timestamp) {
  if (!timestamp) return "Sin fecha";
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function truncateUrl(url, max) {
  if (!url) return "";
  max = max || 70;
  return url.length > max ? url.substring(0, max) + "\u2026" : url;
}

function getSortDir() {
  const checked = document.querySelector('input[name="sortDir"]:checked');
  return checked ? checked.value : "desc";
}

// --- Init ---

async function init() {
  const tree = await chrome.bookmarks.getTree();
  const folders = collectFolders(tree);

  folderSelect.innerHTML =
    '<option value="">-- Selecciona una carpeta --</option>';
  for (const f of folders) {
    const indent = "\u00A0\u00A0".repeat(f.depth);
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = `${indent}${f.title}`;
    folderSelect.appendChild(opt);
  }

  folderSelect.addEventListener("change", () => {
    loadBtn.disabled = folderSelect.value === "";
    browseResults.classList.add("hidden");
    browseStatus.classList.add("hidden");
    bookmarks = [];
  });

  loadBtn.addEventListener("click", loadBookmarks);
  deleteSelectedBtn.addEventListener("click", deleteSelected);
  selectAll.addEventListener("change", toggleSelectAll);

  sortRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (bookmarks.length > 0) sortAndRender();
    });
  });
}

// --- Load & Render ---

async function loadBookmarks() {
  const folderId = folderSelect.value;
  if (!folderId) return;

  const children = await chrome.bookmarks.getChildren(folderId);
  bookmarks = children
    .filter((n) => n.url)
    .map((bm) => ({ ...bm, selected: false }));

  if (bookmarks.length === 0) {
    browseResults.classList.add("hidden");
    showMsg("No hay marcadores en esta carpeta.", "info");
    return;
  }

  browseStatus.classList.add("hidden");
  sortAndRender();
}

function sortAndRender() {
  const dir = getSortDir();
  bookmarks.sort((a, b) => {
    const da = a.dateAdded || 0;
    const db = b.dateAdded || 0;
    return dir === "desc" ? db - da : da - db;
  });

  renderResults();
}

function renderResults() {
  resultsList.innerHTML = "";
  selectAll.checked = false;

  for (let i = 0; i < bookmarks.length; i++) {
    const bm = bookmarks[i];
    const row = document.createElement("div");
    row.className = "result-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = bm.selected;
    cb.addEventListener("change", () => {
      bookmarks[i].selected = cb.checked;
      updateDeleteBtn();
    });

    const info = document.createElement("div");
    info.className = "result-info";

    const titleRow = document.createElement("div");
    titleRow.className = "result-title-row";

    const title = document.createElement("span");
    title.className = "result-title";
    title.textContent = bm.title || bm.url;

    const date = document.createElement("span");
    date.className = "result-date";
    date.textContent = formatDate(bm.dateAdded);

    titleRow.appendChild(title);
    titleRow.appendChild(date);

    const urlLink = document.createElement("a");
    urlLink.className = "result-url";
    urlLink.href = bm.url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener";
    urlLink.textContent = truncateUrl(bm.url);
    urlLink.title = bm.url;

    info.appendChild(titleRow);
    info.appendChild(urlLink);

    row.appendChild(cb);
    row.appendChild(info);
    resultsList.appendChild(row);
  }

  resultsCount.textContent = `${bookmarks.length} marcadores`;
  browseResults.classList.remove("hidden");
  updateDeleteBtn();
}

// --- Selection & Delete ---

function toggleSelectAll() {
  const checked = selectAll.checked;
  bookmarks.forEach((bm) => (bm.selected = checked));
  resultsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = checked;
  });
  updateDeleteBtn();
}

function updateDeleteBtn() {
  const count = bookmarks.filter((bm) => bm.selected).length;
  deleteSelectedBtn.disabled = count === 0;
  deleteSelectedBtn.textContent =
    count > 0 ? `Eliminar seleccionados (${count})` : "Eliminar seleccionados";
}

async function deleteSelected() {
  const toDelete = bookmarks.filter((bm) => bm.selected);
  if (toDelete.length === 0) return;

  deleteSelectedBtn.disabled = true;

  let deleted = 0;
  for (const bm of toDelete) {
    try {
      await chrome.bookmarks.remove(bm.id);
      deleted++;
    } catch (e) {
      // already gone
    }
  }

  bookmarks = bookmarks.filter((bm) => !bm.selected);

  if (bookmarks.length > 0) {
    renderResults();
  } else {
    browseResults.classList.add("hidden");
  }

  showMsg(`${deleted} marcador(es) eliminado(s).`, "success");
}

// --- Utils ---

function showMsg(msg, type) {
  browseStatus.textContent = msg;
  browseStatus.className = `status-${type}`;
  browseStatus.classList.remove("hidden");
}

init();

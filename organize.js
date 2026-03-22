// --- Read mode from URL ---
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "sort";

// --- State ---
let categories = [];
let categoryOrder = [];
let currentGroups = {};
let currentFolders = [];
let currentSortedBookmarks = []; // for date-based sorting

// --- DOM ---
const pageTitle = document.getElementById("page-title");
const pageDesc = document.getElementById("page-desc");
const folderSelect = document.getElementById("o-folder-select");
const previewBtn = document.getElementById("preview-btn");
const applyBtn = document.getElementById("apply-btn");
const previewSection = document.getElementById("preview-section");
const categoryList = document.getElementById("category-list");
const totalCount = document.getElementById("total-count");
const statusDiv = document.getElementById("organize-status");
const sortCriteriaSection = document.getElementById("sort-criteria-section");
const sortCriteriaRadios = document.querySelectorAll('input[name="sortCriteria"]');

// --- Configure page based on mode ---

if (mode === "group") {
  pageTitle.textContent = "Agrupar en subcarpetas";
  pageDesc.textContent = "Crea subcarpetas por tipo y mueve los marcadores dentro de ellas.";
} else {
  pageTitle.textContent = "Ordenar en sitio";
  pageDesc.textContent = "Reordena los marcadores dentro de la misma carpeta.";
  sortCriteriaSection.classList.remove("hidden");
}

function getSortCriteria() {
  const checked = document.querySelector('input[name="sortCriteria"]:checked');
  return checked ? checked.value : "category";
}

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

function groupBookmarks(bookmarks) {
  const groups = {};
  for (const bm of bookmarks) {
    const catId = categorize(bm.url, categories);
    if (!groups[catId]) groups[catId] = [];
    groups[catId].push(bm);
  }
  return groups;
}

function getSortedCategoryIds(groups) {
  const presentIds = Object.keys(groups);
  return categoryOrder.filter((id) => presentIds.includes(id));
}

// --- Init ---

async function init() {
  categories = await loadCategories();
  categoryOrder = await loadCategoryOrder(categories);

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
    previewBtn.disabled = folderSelect.value === "";
    applyBtn.disabled = true;
    previewSection.classList.add("hidden");
    statusDiv.classList.add("hidden");
    currentGroups = {};
  });

  previewBtn.addEventListener("click", showPreview);
  applyBtn.addEventListener("click", apply);
}

// --- Preview ---

async function showPreview() {
  const folderId = folderSelect.value;
  if (!folderId) return;

  categories = await loadCategories();
  categoryOrder = await loadCategoryOrder(categories);
  const sortWithin = await loadSortWithinGroups();

  const children = await chrome.bookmarks.getChildren(folderId);
  currentFolders = children.filter((n) => n.children !== undefined && !n.url);
  const bookmarks = children.filter((n) => n.url);

  const criteria = getSortCriteria();
  categoryList.innerHTML = "";

  // Render folders first
  if (currentFolders.length > 0) {
    const div = document.createElement("div");
    div.className = "category";
    const header = document.createElement("div");
    header.className = "category-header category-header-folders";
    header.textContent = `Carpetas (${currentFolders.length}) \u2014 se mantienen al inicio`;
    div.appendChild(header);
    const ul = document.createElement("ul");
    for (const f of currentFolders) {
      const li = document.createElement("li");
      li.textContent = `\uD83D\uDCC1 ${f.title}`;
      ul.appendChild(li);
    }
    div.appendChild(ul);
    categoryList.appendChild(div);
  }

  if (criteria === "category" || mode === "group") {
    // --- Category-based ---
    currentGroups = groupBookmarks(bookmarks);
    currentSortedBookmarks = [];

    for (const catId of Object.keys(currentGroups)) {
      if (sortWithin === "alpha") {
        currentGroups[catId].sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
      }
    }

    const sortedIds = getSortedCategoryIds(currentGroups);

    for (const catId of sortedIds) {
      const items = currentGroups[catId];
      const catName = getCategoryName(catId, categories);
      const div = document.createElement("div");
      div.className = "category";
      const header = document.createElement("div");
      header.className = "category-header";
      const suffix = mode === "group" ? " \u2192 subcarpeta" : "";
      header.textContent = `${catName} (${items.length})${suffix}`;
      div.appendChild(header);
      const ul = document.createElement("ul");
      for (const bm of items) {
        const li = document.createElement("li");
        li.title = bm.url;
        li.textContent = bm.title || bm.url;
        ul.appendChild(li);
      }
      div.appendChild(ul);
      categoryList.appendChild(div);
    }
  } else {
    // --- Date-based ---
    currentGroups = {};
    const asc = criteria === "date-asc";
    currentSortedBookmarks = [...bookmarks].sort((a, b) => {
      const da = a.dateAdded || 0;
      const db = b.dateAdded || 0;
      return asc ? da - db : db - da;
    });

    const div = document.createElement("div");
    div.className = "category";
    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = asc ? "Mas antiguos primero" : "Mas recientes primero";
    div.appendChild(header);
    const ul = document.createElement("ul");
    for (const bm of currentSortedBookmarks) {
      const li = document.createElement("li");
      li.title = bm.url;
      const date = bm.dateAdded ? formatDate(bm.dateAdded) : "";
      li.textContent = `${date}  ${bm.title || bm.url}`;
      ul.appendChild(li);
    }
    div.appendChild(ul);
    categoryList.appendChild(div);
  }

  totalCount.textContent = `${bookmarks.length} marcadores, ${currentFolders.length} carpetas`;
  previewSection.classList.remove("hidden");
  applyBtn.disabled = false;
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// --- Apply ---

async function apply() {
  const folderId = folderSelect.value;
  if (!folderId || Object.keys(currentGroups).length === 0) return;

  applyBtn.disabled = true;
  previewBtn.disabled = true;
  showMsg("Organizando...", "info");

  try {
    // Move folders to top first
    for (const folder of currentFolders) {
      await chrome.bookmarks.move(folder.id, { parentId: folderId });
    }

    const criteria = getSortCriteria();

    if (mode === "group") {
      const sortedIds = getSortedCategoryIds(currentGroups);
      for (const catId of sortedIds) {
        const bookmarks = currentGroups[catId];
        const catName = getCategoryName(catId, categories);
        const subfolder = await chrome.bookmarks.create({ parentId: folderId, title: catName });
        for (const bm of bookmarks) {
          await chrome.bookmarks.move(bm.id, { parentId: subfolder.id });
        }
      }
      const catCount = Object.keys(currentGroups).length;
      const bmCount = Object.values(currentGroups).flat().length;
      showMsg(`Listo: ${bmCount} marcadores organizados en ${catCount} subcarpetas.`, "success");
    } else if (criteria === "category") {
      const sortedIds = getSortedCategoryIds(currentGroups);
      for (const catId of sortedIds) {
        for (const bm of currentGroups[catId]) {
          await chrome.bookmarks.move(bm.id, { parentId: folderId });
        }
      }
      const bmCount = Object.values(currentGroups).flat().length;
      showMsg(`Listo: ${bmCount} marcadores ordenados por tipo.`, "success");
    } else {
      for (const bm of currentSortedBookmarks) {
        await chrome.bookmarks.move(bm.id, { parentId: folderId });
      }
      showMsg(`Listo: ${currentSortedBookmarks.length} marcadores ordenados por fecha.`, "success");
    }

    currentGroups = {};
    currentSortedBookmarks = [];
    applyBtn.disabled = true;
  } catch (err) {
    showMsg(`Error: ${err.message}`, "error");
    applyBtn.disabled = false;
  }

  previewBtn.disabled = false;
}

// --- Utils ---

function showMsg(msg, type) {
  statusDiv.textContent = msg;
  statusDiv.className = `status-${type}`;
  statusDiv.classList.remove("hidden");
}

init();

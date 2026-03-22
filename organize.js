// --- Read mode from URL ---
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "sort";

// --- State ---
let categories = [];
let categoryOrder = [];
let currentGroups = {};
let currentFolders = [];

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

// --- Configure page based on mode ---

if (mode === "group") {
  pageTitle.textContent = "Agrupar en subcarpetas";
  pageDesc.textContent = "Crea subcarpetas por tipo y mueve los marcadores dentro de ellas.";
} else {
  pageTitle.textContent = "Ordenar en sitio";
  pageDesc.textContent = "Reordena los marcadores dentro de la misma carpeta, agrupandolos por tipo.";
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

  currentGroups = groupBookmarks(bookmarks);

  for (const catId of Object.keys(currentGroups)) {
    if (sortWithin === "alpha") {
      currentGroups[catId].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );
    }
  }

  const sortedIds = getSortedCategoryIds(currentGroups);
  categoryList.innerHTML = "";

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

  totalCount.textContent = `${bookmarks.length} marcadores, ${currentFolders.length} carpetas`;
  previewSection.classList.remove("hidden");
  applyBtn.disabled = false;
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

    const sortedIds = getSortedCategoryIds(currentGroups);

    if (mode === "group") {
      for (const catId of sortedIds) {
        const bookmarks = currentGroups[catId];
        const catName = getCategoryName(catId, categories);
        const subfolder = await chrome.bookmarks.create({ parentId: folderId, title: catName });
        for (const bm of bookmarks) {
          await chrome.bookmarks.move(bm.id, { parentId: subfolder.id });
        }
      }
    } else {
      for (const catId of sortedIds) {
        for (const bm of currentGroups[catId]) {
          await chrome.bookmarks.move(bm.id, { parentId: folderId });
        }
      }
    }

    const catCount = Object.keys(currentGroups).length;
    const bmCount = Object.values(currentGroups).flat().length;
    const modeText = mode === "group" ? `en ${catCount} subcarpetas` : `por ${catCount} tipos`;
    showMsg(`Listo: ${bmCount} marcadores organizados ${modeText}.`, "success");
    currentGroups = {};
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

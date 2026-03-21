// --- State ---
let currentMode = "sort";
let currentGroups = {};
let currentFolders = [];
let categoryOrder = [];
let categories = [];

// --- DOM ---
const folderSelect = document.getElementById("folder-select");
const previewBtn = document.getElementById("preview-btn");
const organizeBtn = document.getElementById("organize-btn");
const previewSection = document.getElementById("preview");
const categoryList = document.getElementById("category-list");
const totalCount = document.getElementById("total-count");
const statusDiv = document.getElementById("status");
const settingsBtn = document.getElementById("settings-btn");
const modeBtns = document.querySelectorAll(".mode-btn");

// --- Bookmark helpers ---

async function getBookmarkTree() {
  return chrome.bookmarks.getTree();
}

function collectFolders(nodes, list = [], depth = 0) {
  for (const node of nodes) {
    if (node.children) {
      list.push({ id: node.id, title: node.title || "(root)", depth });
      collectFolders(node.children, list, depth + 1);
    }
  }
  return list;
}

// --- Init ---

async function init() {
  categories = await loadCategories();
  categoryOrder = await loadCategoryOrder(categories);

  const tree = await getBookmarkTree();
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

  folderSelect.addEventListener("change", resetPreview);
  previewBtn.addEventListener("click", showPreview);
  organizeBtn.addEventListener("click", organize);
  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "settings.html" });
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      resetPreview();
    });
  });
}

function resetPreview() {
  const hasSelection = folderSelect.value !== "";
  previewBtn.disabled = !hasSelection;
  organizeBtn.disabled = true;
  previewSection.classList.add("hidden");
  statusDiv.classList.add("hidden");
}

// --- Group bookmarks by category respecting order ---

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

  // Sort within each group
  for (const catId of Object.keys(currentGroups)) {
    if (sortWithin === "alpha") {
      currentGroups[catId].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );
    }
  }

  const sortedIds = getSortedCategoryIds(currentGroups);

  categoryList.innerHTML = "";

  // Show folders first (original order)
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
    const modeLabel =
      currentMode === "group" ? " \u2192 subcarpeta" : "";
    header.textContent = `${catName} (${items.length})${modeLabel}`;
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
  organizeBtn.disabled = false;
}

// --- Organize ---

async function organize() {
  const folderId = folderSelect.value;
  if (!folderId || Object.keys(currentGroups).length === 0) return;

  organizeBtn.disabled = true;
  previewBtn.disabled = true;
  showStatus("Organizando...", "info");

  try {
    if (currentMode === "group") {
      await organizeIntoSubfolders(folderId);
    } else {
      await sortInPlace(folderId);
    }

    const catCount = Object.keys(currentGroups).length;
    const bmCount = Object.values(currentGroups).flat().length;
    const modeText =
      currentMode === "group"
        ? `en ${catCount} subcarpetas`
        : `por ${catCount} tipos`;
    showStatus(`Listo: ${bmCount} marcadores organizados ${modeText}.`, "success");
    currentGroups = {};
    organizeBtn.disabled = true;
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
    organizeBtn.disabled = false;
  }

  previewBtn.disabled = false;
}

async function organizeIntoSubfolders(folderId) {
  // 1. Move existing folders to the top first (original order)
  for (const folder of currentFolders) {
    await chrome.bookmarks.move(folder.id, { parentId: folderId });
  }

  // 2. Create type subfolders and move bookmarks
  const sortedIds = getSortedCategoryIds(currentGroups);
  for (const catId of sortedIds) {
    const bookmarks = currentGroups[catId];
    const catName = getCategoryName(catId, categories);

    const subfolder = await chrome.bookmarks.create({
      parentId: folderId,
      title: catName,
    });

    for (const bm of bookmarks) {
      await chrome.bookmarks.move(bm.id, { parentId: subfolder.id });
    }
  }
}

async function sortInPlace(folderId) {
  // 1. Folders first, in their original order
  for (const folder of currentFolders) {
    await chrome.bookmarks.move(folder.id, { parentId: folderId });
  }

  // 2. Then bookmarks grouped by type in configured order
  const sortedIds = getSortedCategoryIds(currentGroups);
  for (const catId of sortedIds) {
    for (const bm of currentGroups[catId]) {
      await chrome.bookmarks.move(bm.id, { parentId: folderId });
    }
  }
}

// --- Util ---

function showStatus(msg, type) {
  statusDiv.textContent = msg;
  statusDiv.className = `status-${type}`;
  statusDiv.classList.remove("hidden");
}

init();

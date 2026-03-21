const listEl = document.getElementById("category-order-list");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const statusDiv = document.getElementById("status");
const sortRadios = document.querySelectorAll('input[name="sortWithin"]');

const formTitle = document.getElementById("form-title");
const catNameInput = document.getElementById("cat-name");
const catIdInput = document.getElementById("cat-id");
const catPatternsInput = document.getElementById("cat-patterns");
const addCatBtn = document.getElementById("add-cat-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

let categories = [];
let displayOrder = []; // only controls display order, NOT matching priority
let draggedItem = null;
let editingId = null; // null = adding, string = editing existing

// --- Render category list ---

function renderList(order) {
  listEl.innerHTML = "";
  for (const id of order) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) continue;
    const li = document.createElement("li");
    li.className = "sortable-item";
    li.draggable = true;
    li.dataset.id = cat.id;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "\u2630";

    const label = document.createElement("span");
    label.className = "item-label";
    label.textContent = cat.name;

    const badge = document.createElement("span");
    badge.className = "item-badge";
    badge.textContent = `${cat.patterns.length} patrones`;

    const editBtn = document.createElement("button");
    editBtn.className = "item-action";
    editBtn.textContent = "\u270E";
    editBtn.title = "Editar";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startEdit(cat);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "item-action item-action-danger";
    delBtn.textContent = "\u2715";
    delBtn.title = "Eliminar";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCategory(cat.id);
    });

    li.appendChild(handle);
    li.appendChild(label);
    li.appendChild(badge);
    li.appendChild(editBtn);
    li.appendChild(delBtn);

    li.addEventListener("dragstart", onDragStart);
    li.addEventListener("dragover", onDragOver);
    li.addEventListener("dragend", onDragEnd);
    li.addEventListener("drop", onDrop);

    listEl.appendChild(li);
  }

  // "Otros" row (not editable, always last conceptually)
  const otherLi = document.createElement("li");
  otherLi.className = "sortable-item sortable-item-fixed";
  otherLi.dataset.id = DEFAULT_CATEGORY_ID;

  const otherHandle = document.createElement("span");
  otherHandle.className = "drag-handle";
  otherHandle.textContent = "\u2014";

  const otherLabel = document.createElement("span");
  otherLabel.className = "item-label";
  otherLabel.textContent = "Otros (no clasificados)";

  otherLi.appendChild(otherHandle);
  otherLi.appendChild(otherLabel);
  listEl.appendChild(otherLi);
}

// --- Drag and drop ---

function onDragStart(e) {
  if (e.currentTarget.classList.contains("sortable-item-fixed")) {
    e.preventDefault();
    return;
  }
  draggedItem = e.currentTarget;
  draggedItem.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = e.currentTarget;
  if (target === draggedItem || target.classList.contains("sortable-item-fixed")) return;

  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  if (e.clientY < midY) {
    listEl.insertBefore(draggedItem, target);
  } else {
    listEl.insertBefore(draggedItem, target.nextSibling);
  }
}

function onDrop(e) {
  e.preventDefault();
}

function onDragEnd() {
  if (draggedItem) {
    draggedItem.classList.remove("dragging");
    draggedItem = null;
  }
  syncDisplayOrderFromList();
}

function syncDisplayOrderFromList() {
  const ids = Array.from(listEl.querySelectorAll(".sortable-item:not(.sortable-item-fixed)"))
    .map((li) => li.dataset.id);
  displayOrder = [...ids, DEFAULT_CATEGORY_ID];
}

// --- Add / Edit / Delete ---

function startEdit(cat) {
  editingId = cat.id;
  formTitle.textContent = `Editar: ${cat.name}`;
  catNameInput.value = cat.name;
  catIdInput.value = cat.id;
  catIdInput.disabled = true;
  catPatternsInput.value = cat.patterns.join("\n");
  addCatBtn.textContent = "Actualizar";
  cancelEditBtn.classList.remove("hidden");
  catNameInput.focus();
}

function cancelEdit() {
  editingId = null;
  formTitle.textContent = "Agregar categoria";
  catNameInput.value = "";
  catIdInput.value = "";
  catIdInput.disabled = false;
  catPatternsInput.value = "";
  addCatBtn.textContent = "Agregar";
  cancelEditBtn.classList.add("hidden");
}

function addOrUpdateCategory() {
  const name = catNameInput.value.trim();
  const id = catIdInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const patternsRaw = catPatternsInput.value.trim();

  if (!name || !id || !patternsRaw) {
    showStatus("Completa todos los campos.", "error");
    return;
  }

  const patterns = patternsRaw
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (editingId) {
    const idx = categories.findIndex((c) => c.id === editingId);
    if (idx >= 0) {
      categories[idx] = { id: editingId, name, patterns };
    }
  } else {
    if (categories.some((c) => c.id === id) || id === DEFAULT_CATEGORY_ID) {
      showStatus("Ya existe una categoria con ese ID.", "error");
      return;
    }
    categories.push({ id, name, patterns });
    // Add new category before "Otros" in display order
    const otherIdx = displayOrder.indexOf(DEFAULT_CATEGORY_ID);
    if (otherIdx >= 0) {
      displayOrder.splice(otherIdx, 0, id);
    } else {
      displayOrder.push(id);
    }
  }

  renderList(displayOrder);
  cancelEdit();
  showStatus(editingId ? "Categoria actualizada." : "Categoria agregada.", "success");
}

function deleteCategory(id) {
  categories = categories.filter((c) => c.id !== id);
  displayOrder = displayOrder.filter((did) => did !== id);
  renderList(displayOrder);
  if (editingId === id) cancelEdit();
  showStatus("Categoria eliminada.", "success");
}

// --- Save / Reset ---

async function saveAll() {
  syncDisplayOrderFromList();

  // Save categories (matching priority order stays as-is)
  await saveCategories(categories);

  // Save display order separately
  await saveCategoryOrder(displayOrder);

  const sortWithin = document.querySelector('input[name="sortWithin"]:checked').value;
  await saveSortWithinGroups(sortWithin);

  showStatus("Configuracion guardada.", "success");
}

async function resetAll() {
  await resetCategories();
  categories = [...DEFAULT_CATEGORIES];
  displayOrder = getDefaultOrder(categories);
  renderList(displayOrder);

  await saveCategoryOrder(displayOrder);

  document.querySelector('input[name="sortWithin"][value="alpha"]').checked = true;
  await saveSortWithinGroups("alpha");

  cancelEdit();
  showStatus("Configuracion restablecida a defaults.", "success");
}

// --- Init ---

async function init() {
  categories = await loadCategories();
  displayOrder = await loadCategoryOrder(categories);
  renderList(displayOrder);

  const sortWithin = await loadSortWithinGroups();
  for (const radio of sortRadios) {
    radio.checked = radio.value === sortWithin;
  }

  addCatBtn.addEventListener("click", addOrUpdateCategory);
  cancelEditBtn.addEventListener("click", cancelEdit);
  saveBtn.addEventListener("click", saveAll);
  resetBtn.addEventListener("click", resetAll);
}

function showStatus(msg, type) {
  statusDiv.textContent = msg;
  statusDiv.className = `status-${type}`;
  statusDiv.classList.remove("hidden");
  setTimeout(() => statusDiv.classList.add("hidden"), 3000);
}

init();

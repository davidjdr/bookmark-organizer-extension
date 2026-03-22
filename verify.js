// --- State ---
let scanResults = [];
let scanning = false;

// --- DOM ---
const folderSelect = document.getElementById("v-folder-select");
const check404 = document.getElementById("check-404");
const checkRedirect = document.getElementById("check-redirect");
const scanBtn = document.getElementById("scan-btn");
const stopBtn = document.getElementById("stop-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const scanProgress = document.getElementById("scan-progress");
const progressFill = document.getElementById("progress-fill");
const progressCurrent = document.getElementById("progress-current");
const progressTotal = document.getElementById("progress-total");
const progressFound = document.getElementById("progress-found");
const scanResultsDiv = document.getElementById("scan-results");
const resultsList = document.getElementById("results-list");
const resultsCount = document.getElementById("results-count");
const selectAll = document.getElementById("select-all");
const verifyStatus = document.getElementById("verify-status");

// --- Bookmark helpers ---

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
    scanBtn.disabled = folderSelect.value === "";
    scanResultsDiv.classList.add("hidden");
    scanProgress.classList.add("hidden");
    verifyStatus.classList.add("hidden");
    deleteSelectedBtn.disabled = true;
    scanResults = [];
  });

  scanBtn.addEventListener("click", startScan);
  stopBtn.addEventListener("click", stopScan);
  deleteSelectedBtn.addEventListener("click", deleteSelected);
  selectAll.addEventListener("change", toggleSelectAll);
}

// --- URL checker ---

async function checkUrl(url) {
  try {
    return await doFetch(url, "HEAD");
  } catch {
    try {
      return await doFetch(url, "GET");
    } catch (err) {
      return {
        url,
        status: 0,
        ok: false,
        redirected: false,
        redirectTo: "",
        error: err.name === "AbortError" ? "Timeout" : err.message,
      };
    }
  }
}

async function doFetch(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(url, {
    method,
    redirect: "manual",
    signal: controller.signal,
  });

  clearTimeout(timeout);

  const status = response.status;
  const redirected = status >= 300 && status < 400;
  const location = response.headers.get("location") || "";

  if (method === "HEAD" && status === 405) {
    throw new Error("HEAD not allowed");
  }

  return {
    url,
    status,
    ok: status >= 200 && status < 300,
    redirected,
    redirectTo: redirected ? location : "",
    error: null,
  };
}

// --- Scan ---

async function startScan() {
  const folderId = folderSelect.value;
  if (!folderId) return;

  const want404 = check404.checked;
  const wantRedirect = checkRedirect.checked;

  if (!want404 && !wantRedirect) {
    showMsg("Selecciona al menos un tipo de busqueda.", "error");
    return;
  }

  scanning = true;
  scanBtn.classList.add("hidden");
  stopBtn.classList.remove("hidden");
  deleteSelectedBtn.disabled = true;
  scanResultsDiv.classList.add("hidden");
  verifyStatus.classList.add("hidden");
  scanProgress.classList.remove("hidden");
  folderSelect.disabled = true;

  const children = await chrome.bookmarks.getChildren(folderId);
  const bookmarks = children.filter((n) => n.url);

  progressTotal.textContent = bookmarks.length;
  progressCurrent.textContent = "0";
  progressFill.style.width = "0%";
  progressFound.textContent = "";

  scanResults = [];
  const concurrency = 5;
  let idx = 0;
  let completed = 0;

  async function worker() {
    while (idx < bookmarks.length && scanning) {
      const i = idx++;
      const bm = bookmarks[i];

      const result = await checkUrl(bm.url);

      completed++;
      progressCurrent.textContent = completed;
      progressFill.style.width = `${(completed / bookmarks.length) * 100}%`;

      if (!result) continue;

      const is404 = !result.ok && !result.redirected && result.status !== 0 && result.status !== 403;
      const isError = result.status === 0 && result.error;
      const isRedirect = result.redirected;

      if ((want404 && (is404 || isError)) || (wantRedirect && isRedirect)) {
        scanResults.push({
          bookmark: bm,
          status: result.status,
          redirected: result.redirected,
          redirectTo: result.redirectTo,
          error: result.error,
          is404: is404 || isError,
          selected: false,
        });
        progressFound.textContent = `\u2014 ${scanResults.length} encontrados`;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  scanning = false;
  scanBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
  folderSelect.disabled = false;

  if (scanResults.length === 0) {
    scanProgress.classList.add("hidden");
    showMsg("No se encontraron problemas.", "success");
  } else {
    renderResults();
  }
}

function stopScan() {
  scanning = false;
  scanBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
  folderSelect.disabled = false;

  if (scanResults.length > 0) {
    renderResults();
  } else {
    scanProgress.classList.add("hidden");
    showMsg("Escaneo detenido. No se encontraron problemas.", "info");
  }
}

// --- Results ---

function renderResults() {
  resultsList.innerHTML = "";
  selectAll.checked = false;

  for (let i = 0; i < scanResults.length; i++) {
    const r = scanResults[i];
    const row = document.createElement("div");
    row.className = "result-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = r.selected;
    cb.addEventListener("change", () => {
      scanResults[i].selected = cb.checked;
      updateDeleteBtn();
    });

    const info = document.createElement("div");
    info.className = "result-info";

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = r.bookmark.title || r.bookmark.url;

    const meta = document.createElement("div");
    meta.className = "result-meta";

    if (r.is404) {
      const badge = document.createElement("span");
      badge.className = "badge badge-error";
      badge.textContent = r.error ? `Error: ${r.error}` : `${r.status}`;
      meta.appendChild(badge);
    }

    if (r.redirected) {
      const badge = document.createElement("span");
      badge.className = "badge badge-warn";
      badge.textContent = `${r.status}`;
      meta.appendChild(badge);

      if (r.redirectTo) {
        const dest = document.createElement("a");
        dest.className = "result-redirect-url";
        dest.href = r.redirectTo;
        dest.target = "_blank";
        dest.rel = "noopener";
        dest.textContent = `\u2192 ${truncateUrl(r.redirectTo, 60)}`;
        dest.title = r.redirectTo;
        meta.appendChild(dest);
      }
    }

    const urlLink = document.createElement("a");
    urlLink.className = "result-url";
    urlLink.href = r.bookmark.url;
    urlLink.target = "_blank";
    urlLink.rel = "noopener";
    urlLink.textContent = truncateUrl(r.bookmark.url, 70);
    urlLink.title = r.bookmark.url;

    info.appendChild(title);
    info.appendChild(urlLink);
    info.appendChild(meta);

    row.appendChild(cb);
    row.appendChild(info);
    resultsList.appendChild(row);
  }

  const errCount = scanResults.filter((r) => r.is404).length;
  const redirCount = scanResults.filter((r) => r.redirected).length;
  const parts = [];
  if (errCount > 0) parts.push(`${errCount} rotos`);
  if (redirCount > 0) parts.push(`${redirCount} redirecciones`);
  resultsCount.textContent = parts.join(", ");

  scanResultsDiv.classList.remove("hidden");
  updateDeleteBtn();
}

function truncateUrl(url, max) {
  if (!url) return "";
  max = max || 60;
  return url.length > max ? url.substring(0, max) + "\u2026" : url;
}

function toggleSelectAll() {
  const checked = selectAll.checked;
  scanResults.forEach((r) => (r.selected = checked));
  resultsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = checked;
  });
  updateDeleteBtn();
}

function updateDeleteBtn() {
  const count = scanResults.filter((r) => r.selected).length;
  deleteSelectedBtn.disabled = count === 0;
  deleteSelectedBtn.textContent =
    count > 0 ? `Eliminar seleccionados (${count})` : "Eliminar seleccionados";
}

async function deleteSelected() {
  const toDelete = scanResults.filter((r) => r.selected);
  if (toDelete.length === 0) return;

  deleteSelectedBtn.disabled = true;
  scanBtn.disabled = true;

  let deleted = 0;
  for (const r of toDelete) {
    try {
      await chrome.bookmarks.remove(r.bookmark.id);
      deleted++;
    } catch (e) {
      // bookmark may already be gone
    }
  }

  scanResults = scanResults.filter((r) => !r.selected);

  if (scanResults.length > 0) {
    renderResults();
  } else {
    scanResultsDiv.classList.add("hidden");
  }

  showMsg(`${deleted} marcador(es) eliminado(s).`, "success");
  scanBtn.disabled = false;
}

// --- Utils ---

function showMsg(msg, type) {
  verifyStatus.textContent = msg;
  verifyStatus.className = `status-${type}`;
  verifyStatus.classList.remove("hidden");
}

init();

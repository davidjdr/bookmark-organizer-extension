document.getElementById("settings-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: "settings.html" });
});

document.querySelectorAll(".launcher-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    chrome.tabs.create({ url: btn.dataset.page });
  });
});

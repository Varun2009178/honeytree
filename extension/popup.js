const tavilyKeyInput = document.getElementById("tavily-key");
const openrouterKeyInput = document.getElementById("openrouter-key");
const enabledToggle = document.getElementById("scout-enabled");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Load saved settings on popup open
chrome.storage.local.get(
  ["tavilyApiKey", "openrouterApiKey", "scoutEnabled"],
  (data) => {
    if (data.tavilyApiKey) tavilyKeyInput.value = data.tavilyApiKey;
    if (data.openrouterApiKey) openrouterKeyInput.value = data.openrouterApiKey;
    enabledToggle.checked = data.scoutEnabled !== false; // default true
  }
);

saveBtn.addEventListener("click", () => {
  const tavilyApiKey = tavilyKeyInput.value.trim();
  const openrouterApiKey = openrouterKeyInput.value.trim();
  const scoutEnabled = enabledToggle.checked;

  chrome.storage.local.set(
    { tavilyApiKey, openrouterApiKey, scoutEnabled },
    () => {
      statusMsg.textContent = "Saved";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 2000);
    }
  );
});

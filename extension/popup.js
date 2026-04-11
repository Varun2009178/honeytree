const tavilyKeyInput = document.getElementById("tavily-key");
const openrouterKeyInput = document.getElementById("openrouter-key");
const enabledToggle = document.getElementById("honeydew-enabled");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Load saved settings on popup open
chrome.storage.local.get(
  ["tavilyApiKey", "openrouterApiKey", "honeydewEnabled"],
  (data) => {
    if (data.tavilyApiKey) tavilyKeyInput.value = data.tavilyApiKey;
    if (data.openrouterApiKey) openrouterKeyInput.value = data.openrouterApiKey;
    enabledToggle.checked = data.honeydewEnabled !== false; // default true
  }
);

saveBtn.addEventListener("click", () => {
  const tavilyApiKey = tavilyKeyInput.value.trim();
  const openrouterApiKey = openrouterKeyInput.value.trim();
  const honeydewEnabled = enabledToggle.checked;

  chrome.storage.local.set(
    { tavilyApiKey, openrouterApiKey, honeydewEnabled },
    () => {
      statusMsg.textContent = "Saved";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 2000);
    }
  );
});

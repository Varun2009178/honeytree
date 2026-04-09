const tavilyKeyInput = document.getElementById("tavily-key");
const anthropicKeyInput = document.getElementById("anthropic-key");
const enabledToggle = document.getElementById("scout-enabled");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Load saved settings on popup open
chrome.storage.local.get(
  ["tavilyApiKey", "anthropicApiKey", "scoutEnabled"],
  (data) => {
    if (data.tavilyApiKey) tavilyKeyInput.value = data.tavilyApiKey;
    if (data.anthropicApiKey) anthropicKeyInput.value = data.anthropicApiKey;
    enabledToggle.checked = data.scoutEnabled !== false; // default true
  }
);

saveBtn.addEventListener("click", () => {
  const tavilyApiKey = tavilyKeyInput.value.trim();
  const anthropicApiKey = anthropicKeyInput.value.trim();
  const scoutEnabled = enabledToggle.checked;

  chrome.storage.local.set(
    { tavilyApiKey, anthropicApiKey, scoutEnabled },
    () => {
      statusMsg.textContent = "Saved";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 2000);
    }
  );
});

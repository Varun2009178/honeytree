// Honeydew background service worker — lightweight, only handles settings and routing
// All heavy research work is done in the content script to avoid SW termination

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "open-settings") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  }
  return false;
});

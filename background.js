// filepath: c:\Users\erikp\egnaprojekt\antibrainrot\background.js
chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0 || details.frameType !== 'outermost_frame') {
      return;
    }

    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    const { unlockedInSession = [] } = await chrome.storage.session.get('unlockedInSession');

    const currentUrl = new URL(details.url);
    const currentHostname = currentUrl.hostname.toLowerCase();

    // Check if already unlocked in this session
    if (unlockedInSession.includes(currentHostname)) {
      return;
    }

    const blockedSiteEntry = blockedSites.find(site => 
      currentHostname.includes(site.url.toLowerCase()) // site.url should be a hostname
    );

    if (blockedSiteEntry) {
      const passwordPromptPageUrl = chrome.runtime.getURL('password_prompt.html');
      if (details.url.startsWith(passwordPromptPageUrl)) {
        return;
      }

      const targetUrl = encodeURIComponent(details.url);
      const siteToUnlock = encodeURIComponent(currentHostname); // Pass the specific hostname
      chrome.tabs.update(details.tabId, {
        url: `${passwordPromptPageUrl}?targetUrl=${targetUrl}&siteToUnlock=${siteToUnlock}`
      });
    }
  },
  { url: [{ schemes: ['http', 'https'] }] }
);

// ...existing code...
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkPassword") {
    const { password, siteUrl } = request; // siteUrl is currentHostname (e.g., www.example.com)
    chrome.storage.sync.get({ blockedSites: [] }, async (data) => {
      // Correctly find the siteEntry:
      // The siteUrl (e.g., www.example.com or example.com) should include the stored site.url (e.g., example.com)
      // And the stored site.url should also include the siteUrl if they are to be considered a match for password checking.
      // More robustly, find the entry that was used to trigger the block.
      // The siteUrl passed is the specific hostname that was blocked.
      // We need to find which rule in blockedSites caused this specific hostname to be blocked.
      const siteEntry = data.blockedSites.find(s => siteUrl.toLowerCase().includes(s.url.toLowerCase()));

      if (siteEntry && siteEntry.password === password) {
        // Add siteUrl (which is the specific currentHostname that was unlocked) to session unlocked list
        const { unlockedInSession = [] } = await chrome.storage.session.get('unlockedInSession');
        if (!unlockedInSession.includes(siteUrl)) { // siteUrl is currentHostname
          unlockedInSession.push(siteUrl);
          await chrome.storage.session.set({ unlockedInSession });
        }
        sendResponse({ authenticated: true });
      } else {
        sendResponse({ authenticated: false });
      }
    });
    return true; // Indicates asynchronous response
  }
});
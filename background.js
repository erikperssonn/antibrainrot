// In-memory store for sites unlocked in the current session
let unlockedHostnamesInSession = new Set();

// Function to load unlocked sites from session storage into the in-memory Set
async function loadUnlockedSitesFromSession() {
  try {
    const data = await chrome.storage.session.get({ unlockedInSession: [] });
    unlockedHostnamesInSession = new Set(data.unlockedInSession);
    console.log('Loaded unlocked sites from session storage:', Array.from(unlockedHostnamesInSession));
  } catch (error) {
    console.error("Error loading unlocked sites from session storage:", error);
    unlockedHostnamesInSession = new Set(); // Ensure it's initialized on error
  }
}

// Function to save the in-memory Set to session storage
async function saveUnlockedSitesToSession() {
  try {
    await chrome.storage.session.set({ unlockedInSession: Array.from(unlockedHostnamesInSession) });
    console.log('Saved unlocked sites to session storage:', Array.from(unlockedHostnamesInSession));
  } catch (error) {
    console.error("Error saving unlocked sites to session storage:", error);
  }
}

// Load unlocked sites when the service worker starts
(async () => {
  await loadUnlockedSitesFromSession();
})();

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0 || details.frameType !== 'outermost_frame') {
      return;
    }

    const currentUrl = new URL(details.url);
    const currentHostname = currentUrl.hostname.toLowerCase();

    // Check if already unlocked in this session (using the in-memory Set)
    if (unlockedHostnamesInSession.has(currentHostname)) {
      console.log(`Site ${currentHostname} is already unlocked (in-memory check).`);
      return;
    }

    // If not in memory, as a fallback (e.g. SW restarted and initial load is pending, or an edge case)
    // check session storage directly. This is the part that might have been slow for reloads.
    // The in-memory check above should ideally prevent hitting this for already unlocked sites.
    const sessionData = await chrome.storage.session.get({ unlockedInSession: [] });
    if (new Set(sessionData.unlockedInSession).has(currentHostname)) {
        console.log(`Site ${currentHostname} is already unlocked (session storage check).`);
        // Sync to in-memory if found here but not in memory (e.g., after SW restart)
        if (!unlockedHostnamesInSession.has(currentHostname)) {
            unlockedHostnamesInSession.add(currentHostname);
        }
        return;
    }

    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    const blockedSiteEntry = blockedSites.find(site => 
      currentHostname.includes(site.url.toLowerCase())
    );

    if (blockedSiteEntry) {
      console.log(`Site ${currentHostname} is blocked. Redirecting to prompt.`);
      const passwordPromptPageUrl = chrome.runtime.getURL('password_prompt.html');
      if (details.url.startsWith(passwordPromptPageUrl)) {
        return; // Avoid redirect loop
      }

      const targetUrl = encodeURIComponent(details.url);
      const siteToUnlock = encodeURIComponent(currentHostname);
      chrome.tabs.update(details.tabId, {
        url: `${passwordPromptPageUrl}?targetUrl=${targetUrl}&siteToUnlock=${siteToUnlock}`
      });
    }
  },
  { url: [{ schemes: ['http', 'https'] }] }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkPassword") {
    const { password, siteUrl } = request; // siteUrl is currentHostname
    chrome.storage.sync.get({ blockedSites: [] }, async (dataSync) => {
      const siteEntry = dataSync.blockedSites.find(s => siteUrl.toLowerCase().includes(s.url.toLowerCase()));

      if (siteEntry && siteEntry.password === password) {
        console.log(`Password correct for ${siteUrl}. Unlocking.`);
        // Add to in-memory Set first for immediate effect
        if (!unlockedHostnamesInSession.has(siteUrl)) {
            unlockedHostnamesInSession.add(siteUrl);
            console.log(`Added ${siteUrl} to in-memory unlocked set.`);
        }
        // Then, update chrome.storage.session asynchronously
        await saveUnlockedSitesToSession(); 
        sendResponse({ authenticated: true });
      } else {
        console.log(`Password incorrect for ${siteUrl}.`);
        sendResponse({ authenticated: false });
      }
    });
    return true; // Indicates asynchronous response
  }
});
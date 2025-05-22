// filepath: c:\Users\erikp\egnaprojekt\antibrainrot\password_prompt.js
document.addEventListener('DOMContentLoaded', () => {
  const passwordEntry = document.getElementById('passwordEntry');
  const submitPasswordButton = document.getElementById('submitPasswordButton');
  const errorMessage = document.getElementById('errorMessage');

  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = decodeURIComponent(urlParams.get('targetUrl'));
  const siteToUnlock = decodeURIComponent(urlParams.get('siteToUnlock')); // Get the site to unlock

  if (!targetUrl || !siteToUnlock) {
    errorMessage.textContent = 'Error: Missing target URL or site identifier.';
    if (submitPasswordButton) submitPasswordButton.disabled = true;
    if (passwordEntry) passwordEntry.disabled = true;
    return;
  }

  if (submitPasswordButton) {
    submitPasswordButton.addEventListener('click', checkAndRedirect);
  }
  if (passwordEntry) {
    passwordEntry.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        checkAndRedirect();
      }
    });
    passwordEntry.focus(); // Focus the password field on load
  }

  function checkAndRedirect() {
    const enteredPassword = passwordEntry.value;
    if (!enteredPassword) {
      errorMessage.textContent = 'Please enter a password.';
      return;
    }

    // Send siteToUnlock along with the password
    chrome.runtime.sendMessage({ action: "checkPassword", password: enteredPassword, siteUrl: siteToUnlock }, (response) => {
      if (chrome.runtime.lastError) {
        errorMessage.textContent = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      if (response && response.authenticated) {
        window.location.href = targetUrl;
      } else {
        errorMessage.textContent = 'Incorrect password. Please try again.';
        passwordEntry.value = ''; 
        passwordEntry.focus();
      }
    });
  }
});
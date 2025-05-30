document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const sitePasswordInput = document.getElementById('sitePasswordInput');
  const addSiteButton = document.getElementById('addSiteButton');
  const blockedSitesList = document.getElementById('blockedSitesList');

  // Remove Site Math Challenge Modal Elements
  const mathChallengeModal = document.getElementById('mathChallengeModal');
  const closeMathChallengeButton = document.getElementById('closeMathChallengeButton');
  const mathProblemsContainer = document.getElementById('mathProblemsContainer');
  const submitMathAnswersButton = document.getElementById('submitMathAnswersButton');
  const mathChallengeSiteUrlElement = document.getElementById('mathChallengeSiteUrl');
  const mathChallengeErrorElement = document.getElementById('mathChallengeError');
  const removeChallengeProblemCountElement = document.getElementById('removeChallengeProblemCount');


  // Show Password Math Challenge Modal Elements
  const showPasswordMathChallengeModal = document.getElementById('showPasswordMathChallengeModal');
  const closeShowPasswordMathChallengeButton = document.getElementById('closeShowPasswordMathChallengeButton');
  const showPasswordMathProblemsContainer = document.getElementById('showPasswordMathProblemsContainer');
  const submitShowPasswordMathAnswersButton = document.getElementById('submitShowPasswordMathAnswersButton');
  const showPasswordChallengeSiteUrlElement = document.getElementById('showPasswordChallengeSiteUrl');
  const showPasswordMathChallengeErrorElement = document.getElementById('showPasswordMathChallengeError');

  let currentChallengeIndex = -1; // Used for remove challenge
  let currentShowPasswordSiteData = null; // Used for show password challenge { siteObj, passwordDisplay, toggleButton, toggleHint }
  let mathProblems = []; // Shared for both challenges, reset each time

  const REMOVE_CHALLENGE_PROBLEM_COUNT = 6; // As per your existing code for remove
  const SHOW_PASSWORD_CHALLENGE_PROBLEM_COUNT = 3;

  if(removeChallengeProblemCountElement) {
    removeChallengeProblemCountElement.textContent = REMOVE_CHALLENGE_PROBLEM_COUNT;
  }

  loadBlockedSites();

  addSiteButton.addEventListener('click', () => {
    const url = urlInput.value.trim().toLowerCase();
    const password = sitePasswordInput.value;

    if (url && password) {
      chrome.storage.sync.get({ blockedSites: [] }, (data) => {
        const blockedSites = data.blockedSites;
        let hostname;
        try {
          hostname = new URL("http://" + url.replace(/^https?:\/\//, '')).hostname;
        } catch (e) {
          alert('Invalid URL format. Please enter a valid domain (e.g., example.com).');
          return;
        }
        
        if (!blockedSites.some(s => s.url === hostname)) {
          blockedSites.push({ url: hostname, password: password });
          chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
            alert(`Site ${hostname} added to blocklist.`);
            urlInput.value = '';
            sitePasswordInput.value = '';
            renderBlockedSites(blockedSites);
          });
        } else {
          alert(`Site ${hostname} is already in the blocklist.`);
        }
      });
    } else if (!url) {
      alert('Please enter a URL (e.g., example.com).');
    } else {
      alert('Please enter a password for the site.');
    }
  });

  function loadBlockedSites() {
    chrome.storage.sync.get({ blockedSites: [] }, (data) => {
      renderBlockedSites(data.blockedSites || []);
    });
  }

  function renderBlockedSites(sites) {
    blockedSitesList.innerHTML = '';
    sites.forEach((siteObj, index) => {
      const listItem = document.createElement('li');
      
      const siteInfoContainer = document.createElement('div');
      siteInfoContainer.classList.add('site-info-container');

      const urlText = document.createElement('span');
      urlText.textContent = siteObj.url;
      urlText.classList.add('site-url-display');
      siteInfoContainer.appendChild(urlText);

      const passwordArea = document.createElement('div');
      passwordArea.classList.add('password-area');

      const passwordDisplay = document.createElement('span');
      passwordDisplay.textContent = 'Password: ••••••••';
      passwordDisplay.classList.add('password-text-display');
      passwordArea.appendChild(passwordDisplay);

      const toggleHint = document.createElement('span');
      toggleHint.classList.add('toggle-hint');
      toggleHint.style.display = 'none';
      toggleHint.textContent = 'Click button to hide';
      passwordArea.appendChild(toggleHint);
      
      siteInfoContainer.appendChild(passwordArea);
      listItem.appendChild(siteInfoContainer);

      const controlsDiv = document.createElement('div');
      controlsDiv.classList.add('site-controls');

      const togglePasswordButton = document.createElement('button');
      togglePasswordButton.textContent = 'Show Password';
      togglePasswordButton.classList.add('show-hide-password');
      // We use a data attribute on the button to track visibility state post-challenge
      togglePasswordButton.dataset.passwordShown = 'false'; 

      togglePasswordButton.addEventListener('click', () => {
        if (togglePasswordButton.dataset.passwordShown === 'true') {
          // Password is visible, so hide it
          passwordDisplay.textContent = 'Password: ••••••••';
          togglePasswordButton.textContent = 'Show Password';
          toggleHint.style.display = 'none';
          togglePasswordButton.dataset.passwordShown = 'false';
        } else {
          // Password is not visible, initiate challenge
          initiateShowPasswordMathChallenge(siteObj, passwordDisplay, togglePasswordButton, toggleHint);
        }
      });
      controlsDiv.appendChild(togglePasswordButton);
      
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        initiateRemoveMathChallenge(index, siteObj.url);
      });
      controlsDiv.appendChild(removeButton);
      
      listItem.appendChild(controlsDiv);
      blockedSitesList.appendChild(listItem);
    });
  }

  function generateMathProblem() {
    const num1 = Math.floor(Math.random() * 80) + 10;
    const num2 = Math.floor(Math.random() * 80) + 10;
    const num3 = Math.floor(Math.random() * 80) + 1;
    const question = `${num1} + ${num2} + ${num3} = ?`;
    const answer = num1 + num2 + num3;
    return { question, answer };
  }

  // --- Remove Site Math Challenge Functions ---
  function initiateRemoveMathChallenge(index, siteUrl) {
    currentChallengeIndex = index;
    mathProblems = [];
    mathProblemsContainer.innerHTML = ''; 
    mathChallengeErrorElement.textContent = '';
    mathChallengeSiteUrlElement.textContent = siteUrl;

    for (let i = 0; i < REMOVE_CHALLENGE_PROBLEM_COUNT; i++) {
      const problem = generateMathProblem();
      mathProblems.push(problem);
      const problemDiv = document.createElement('div');
      problemDiv.classList.add('problem');
      const label = document.createElement('label');
      label.textContent = problem.question.replace(' = ?', ' =');
      problemDiv.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.dataset.problemIndex = i;
      problemDiv.appendChild(input);
      mathProblemsContainer.appendChild(problemDiv);
    }
    mathChallengeModal.style.display = 'block';
    const firstInput = mathProblemsContainer.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function verifyRemoveMathAnswers() {
    let allCorrect = true;
    for (let i = 0; i < mathProblems.length; i++) {
      const inputElement = mathProblemsContainer.querySelector(`input[data-problem-index="${i}"]`);
      const userAnswer = parseInt(inputElement.value, 10);
      if (isNaN(userAnswer) || userAnswer !== mathProblems[i].answer) {
        allCorrect = false;
        inputElement.style.border = '1px solid red';
      } else {
        inputElement.style.border = '1px solid #ccc';
      }
    }
    if (allCorrect) {
      mathChallengeErrorElement.textContent = '';
      mathChallengeModal.style.display = 'none';
      removeSiteAfterChallenge(currentChallengeIndex);
    } else {
      mathChallengeErrorElement.textContent = 'One or more answers are incorrect. Please try again.';
    }
  }
  
  function removeSiteAfterChallenge(indexToRemove) {
    chrome.storage.sync.get({ blockedSites: [] }, (data) => {
      const blockedSites = data.blockedSites;
      if (indexToRemove >= 0 && indexToRemove < blockedSites.length) {
        const removedSite = blockedSites.splice(indexToRemove, 1);
        chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
          alert(`Site ${removedSite[0].url} removed successfully!`);
          renderBlockedSites(blockedSites);
          currentChallengeIndex = -1; 
        });
      } else {
         alert('Error: Could not find site to remove.');
         currentChallengeIndex = -1;
      }
    });
  }

  // --- Show Password Math Challenge Functions ---
  function initiateShowPasswordMathChallenge(siteObj, passwordDisplayElement, toggleButtonElement, toggleHintElement) {
    currentShowPasswordSiteData = { 
      siteObj: siteObj, 
      passwordDisplay: passwordDisplayElement, 
      toggleButton: toggleButtonElement,
      toggleHint: toggleHintElement
    };
    mathProblems = [];
    showPasswordMathProblemsContainer.innerHTML = ''; 
    showPasswordMathChallengeErrorElement.textContent = '';
    showPasswordChallengeSiteUrlElement.textContent = siteObj.url;

    for (let i = 0; i < SHOW_PASSWORD_CHALLENGE_PROBLEM_COUNT; i++) {
      const problem = generateMathProblem();
      mathProblems.push(problem);
      const problemDiv = document.createElement('div');
      problemDiv.classList.add('problem');
      const label = document.createElement('label');
      label.textContent = problem.question.replace(' = ?', ' =');
      problemDiv.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.dataset.problemIndex = i; // Use same dataset for consistency
      problemDiv.appendChild(input);
      showPasswordMathProblemsContainer.appendChild(problemDiv);
    }
    showPasswordMathChallengeModal.style.display = 'block';
    const firstInput = showPasswordMathProblemsContainer.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function verifyShowPasswordMathAnswers() {
    let allCorrect = true;
    for (let i = 0; i < mathProblems.length; i++) { // mathProblems is now for show password
      const inputElement = showPasswordMathProblemsContainer.querySelector(`input[data-problem-index="${i}"]`);
      const userAnswer = parseInt(inputElement.value, 10);
      if (isNaN(userAnswer) || userAnswer !== mathProblems[i].answer) {
        allCorrect = false;
        inputElement.style.border = '1px solid red';
      } else {
        inputElement.style.border = '1px solid #ccc';
      }
    }

    if (allCorrect) {
      showPasswordMathChallengeErrorElement.textContent = '';
      showPasswordMathChallengeModal.style.display = 'none';
      
      // Reveal the password
      if (currentShowPasswordSiteData) {
        currentShowPasswordSiteData.passwordDisplay.textContent = `Password: ${currentShowPasswordSiteData.siteObj.password}`;
        currentShowPasswordSiteData.toggleButton.textContent = 'Hide Password';
        currentShowPasswordSiteData.toggleHint.style.display = 'inline';
        currentShowPasswordSiteData.toggleButton.dataset.passwordShown = 'true';
        currentShowPasswordSiteData = null; // Reset
      }
    } else {
      showPasswordMathChallengeErrorElement.textContent = 'One or more answers are incorrect. Please try again.';
    }
  }

  // --- Event Listeners for Modals ---
  if (closeMathChallengeButton) {
    closeMathChallengeButton.addEventListener('click', () => {
      mathChallengeModal.style.display = 'none';
    });
  }
  if (submitMathAnswersButton) {
    submitMathAnswersButton.addEventListener('click', verifyRemoveMathAnswers);
  }

  if (closeShowPasswordMathChallengeButton) {
    closeShowPasswordMathChallengeButton.addEventListener('click', () => {
      showPasswordMathChallengeModal.style.display = 'none';
      currentShowPasswordSiteData = null; // Reset if closed manually
    });
  }
  if (submitShowPasswordMathAnswersButton) {
    submitShowPasswordMathAnswersButton.addEventListener('click', verifyShowPasswordMathAnswers);
  }

  window.addEventListener('click', (event) => {
    if (event.target === mathChallengeModal) {
      mathChallengeModal.style.display = 'none';
    }
    if (event.target === showPasswordMathChallengeModal) {
      showPasswordMathChallengeModal.style.display = 'none';
      currentShowPasswordSiteData = null; // Reset if closed manually
    }
  });
});
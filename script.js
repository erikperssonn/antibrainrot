document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  const sitePasswordInput = document.getElementById('sitePasswordInput');
  const addSiteButton = document.getElementById('addSiteButton');
  const blockedSitesList = document.getElementById('blockedSitesList');

  // Math Challenge Modal Elements
  const mathChallengeModal = document.getElementById('mathChallengeModal');
  const closeMathChallengeButton = document.getElementById('closeMathChallengeButton');
  const mathProblemsContainer = document.getElementById('mathProblemsContainer');
  const submitMathAnswersButton = document.getElementById('submitMathAnswersButton');
  const mathChallengeSiteUrlElement = document.getElementById('mathChallengeSiteUrl');
  const mathChallengeErrorElement = document.getElementById('mathChallengeError');

  let currentChallengeIndex = -1;
  let mathProblems = [];

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
      siteInfoContainer.appendChild(urlText);

      const passwordDisplay = document.createElement('span');
      passwordDisplay.textContent = 'Password: ••••••••';
      passwordDisplay.style.fontSize = '0.9em';
      passwordDisplay.style.color = '#666';
      siteInfoContainer.appendChild(passwordDisplay);
      
      listItem.appendChild(siteInfoContainer);

      const controlsDiv = document.createElement('div');
      controlsDiv.classList.add('site-controls');

      const togglePasswordButton = document.createElement('button');
      togglePasswordButton.textContent = 'Show';
      togglePasswordButton.classList.add('show-hide-password');
      let passwordVisible = false;
      togglePasswordButton.addEventListener('click', () => {
        passwordVisible = !passwordVisible;
        if (passwordVisible) {
          passwordDisplay.textContent = `Password: ${siteObj.password}`;
          togglePasswordButton.textContent = 'Hide';
        } else {
          passwordDisplay.textContent = 'Password: ••••••••';
          togglePasswordButton.textContent = 'Show';
        }
      });
      controlsDiv.appendChild(togglePasswordButton);
      
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        initiateMathChallenge(index, siteObj.url);
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

  function initiateMathChallenge(index, siteUrl) {
    currentChallengeIndex = index;
    mathProblems = [];
    mathProblemsContainer.innerHTML = ''; 
    mathChallengeErrorElement.textContent = '';
    mathChallengeSiteUrlElement.textContent = siteUrl;

    for (let i = 0; i < 7; i++) {
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

  function verifyMathAnswers() {
    let allCorrect = true;
    for (let i = 0; i < mathProblems.length; i++) {
      const inputElement = mathProblemsContainer.querySelector(`input[data-problem-index="${i}"]`);
      const userAnswer = parseInt(inputElement.value, 10);
      if (isNaN(userAnswer) || userAnswer !== mathProblems[i].answer) {
        allCorrect = false;
        inputElement.style.border = '1px solid red'; // Highlight incorrect
      } else {
        inputElement.style.border = '1px solid #ccc'; // Reset border
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

  if (closeMathChallengeButton) {
    closeMathChallengeButton.addEventListener('click', () => {
      mathChallengeModal.style.display = 'none';
    });
  }

  if (submitMathAnswersButton) {
    submitMathAnswersButton.addEventListener('click', verifyMathAnswers);
  }

  window.addEventListener('click', (event) => {
    if (event.target === mathChallengeModal) {
      mathChallengeModal.style.display = 'none';
    }
  });
});
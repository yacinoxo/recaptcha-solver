document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveButton = document.getElementById('saveApiKey');
  const solveButton = document.getElementById('solveButton');
  const apiKeyError = document.getElementById('apiKeyError');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const verifyButton = await document.querySelector('#recaptcha-verify-button');


    // Load saved API key
    chrome.storage.sync.get(['assemblyApiKey'], (result) => {
        apiKeyInput.value = result.assemblyApiKey || '';
        if (apiKeyInput.value) {
            solveButton.disabled = false;
        }
    });

    // Save API Key
    saveButton.addEventListener('click', () => {
        if (!apiKeyInput.validity.valid) {
            apiKeyError.classList.add('show');
            return;
    }

    chrome.storage.sync.set(
        { assemblyApiKey: apiKeyInput.value },
        () => {
            successMessage.style.display = 'block';
            successMessage.textContent = 'ID saved successfully!';
            solveButton.disabled = false;
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 1500);
        }
      );
    });

    // Solve CAPTCHA
    solveButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'solveCaptcha', apiKey: apiKeyInput.value }, 
                (response) => {
                    if (chrome.runtime.lastError) return;
                    if (response?.success) showSuccess(response.transcript);
                    if (response?.error) showError(response.error);
                });
        });
    });

    
    function showError(message) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = `Error: ${message}`;
        setTimeout(() => {
        errorMessage.style.display = 'none';
        }, 2000); // Disappear after 2 seconds
    }
    
    function showSuccess(message) {
        successMessage.style.display = 'block';
        successMessage.textContent = message;
        setTimeout(() => {
        successMessage.style.display = 'none';
        }, 2000); // Disappear after 2 seconds
    }

})
function createNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  
  // Styling
  Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      whiteSpace: 'nowrap',
      width: 'auto',
      minWidth: 'max-content',
      left: '50%',
      transform: 'translateX(-50%) translateY(-20px)',
      padding: '15px 25px',
      borderRadius: '5px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      opacity: '0',
      transition: 'all 0.5s ease',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: type === 'success' ? '#4CAF50' : '#f44336',
      borderLeft: `5px solid ${type === 'success' ? '#388E3C' : '#d32f2f'}`
  });

  // Create icon
  const icon = document.createElement('span');
  icon.textContent = type === 'success' ? '✓' : '✕';
  icon.style.marginRight = '10px';  // Add this line
  
  // Create text
  const text = document.createElement('span');
  text.textContent = message;

  // Build notification
  notification.appendChild(icon);
  notification.appendChild(text);
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  // Auto-remove after duration
  setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => notification.remove(), 2500);
  }, 1500);
}


// Listen for messages from the popup in all frames
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'solveCaptcha' && isRecaptchaFrame()) {
    try {
      console.log('Step 1: Triggering audio CAPTCHA button.');
      const audioButton = document.querySelector('button[class*="rc-button-default"]');
      if (!audioButton) {
        throw new Error('CAPTCHA play button not found');
      }
      audioButton.click();

      // Wait for audio to load
      console.log('Waiting for audio CAPTCHA to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract audio URL
      console.log('Step 2: Extracting audio CAPTCHA URL...');
      const audioSource = document.getElementById('audio-source');
      const audioUrl = audioSource.src;
      if (!audioSource) {
        throw new Error('Audio source not found');
      }

      // Transcribe audio using Yassin API with provided API key
      console.log('Step 3: Converting audio to text...');
      const transcript = await transcribeAudio(audioUrl, request.apiKey); // Use request.apiKey


      if(transcript.success === true){
        createNotification("CAPTCHA solved", 'success')
      } else {
        createNotification(transcript.message, 'error')
        return
      }
  


      // Fill CAPTCHA text field
      console.log('Step 4: Filling CAPTCHA text field...');
      const captchaInput = document.querySelector('#audio-response');
      if (!captchaInput) {
        throw new Error('CAPTCHA input field not found');
      }
      captchaInput.value = transcript.message;

      // Submit CAPTCHA
      console.log('Step 5: Submitting CAPTCHA...');
      const verifyButton = document.querySelector('#recaptcha-verify-button');
      if (verifyButton) {
        verifyButton.click();
        console.log('CAPTCHA submitted.');
      } else {
        console.warn('Verify button not found.');
      }
    } catch (error) {
      console.error('Error solving CAPTCHA:', error);
    }
  } else {
    // If not in reCAPTCHA frame, forward message to parent frame
    chrome.runtime.sendMessage(request, sendResponse);
  }
  return true;
});

// Check if current frame contains the reCAPTCHA audio button
function isRecaptchaFrame() {
  return !!document.querySelector('button[class*="rc-button-default"]');
}
async function transcribeAudio(audioUrl, apiKey) {
  try {
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    if (!response.ok) {
      return { success : false, message: `Transcription failed: ${response.status}` }
    }


    const { id: transcriptId } = await response.json();
    // Poll until completion
    while (true) {
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        method: 'GET',
        headers: { 'Authorization': apiKey },
      });

      if (!statusResponse.ok) {
        return { success: false, message: `Transcription status check failed: ${statusResponse.status}` }, { 
          status: statusResponse.status,
        };
      }

      const statusData = await statusResponse.json();
      if (statusData.status === 'completed') {
        return { success: true, message: statusData.text };
      } else if (statusData.status === 'failed') {
        return { succes: false, message: 'Transcription failed' }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}
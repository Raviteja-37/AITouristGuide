// --- Constants ---

const VOICES = {
  English: { Male: 'Matthew', Female: 'Alicia' },
  Hindi: { Male: 'Aman', Female: 'Namrita' },
  Tamil: { Male: 'Murali', Female: 'Iniya' },
  Telugu: { Male: 'Zion', Female: 'Josie' },
};

const LOCALES = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
};

// --- State ---

const state = {
  place: '',
  image: '',
  length: 'Summary',
  voice: 'Male',
};

// --- DOM Elements ---

const cardsContainer = document.querySelector('.cards');

const experiencePanel = document.getElementById('experience');

const previewTitle = document.getElementById('previewTitle');

const audioSection = document.getElementById('audioSection');

const audioPlayer = document.getElementById('audioPlayer');

const transcriptText = document.getElementById('scriptText');

const generateButton = document.getElementById('generateBtn');

const languageSelect = document.getElementById('selectLanguage');

const closeButton = document.getElementById('closeExperience');

const searchPreviewCard = document.getElementById('searchPreviewCard');

const searchPreviewImage = document.getElementById('searchPreviewImage');

const searchPreviewTitle = document.getElementById('searchPreviewTitle');

const transcriptToggle = document.getElementById('transcriptToggle');

const transcriptContent = document.getElementById('transcriptContent');

const transcriptArrow = document.getElementById('transcriptArrow');

// --- Backend API URL ---

const GENERATE_AUDIO_GUIDE_API_URL =
  'http://127.0.0.1:5000/generate-audio-guide';

// ============================================================
// FUNCTIONS
// ============================================================

// --- Convert Base64 Audio → Blob ---

function base64ToAudioBlob(base64Audio) {
  try {
    const binaryString = atob(base64Audio);

    const byteArray = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }

    return new Blob([byteArray], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('Failed to convert Base64 audio:', error);

    return null;
  }
}

// --- Select Destination ---

function selectDestination(place, image, clickedCard = null) {
  state.place = place;
  state.image = image;

  // Update UI content
  previewTitle.textContent = place;

  cardsContainer.classList.add('faded');

  // Reset previous active states
  document.querySelectorAll('.place-card').forEach((card) => {
    card.classList.remove('active');
  });

  searchPreviewCard.classList.add('hidden');

  // Handle normal card / search result
  if (clickedCard) {
    clickedCard.classList.add('active');
  } else {
    searchPreviewImage.src = image;

    searchPreviewTitle.textContent = place;

    searchPreviewCard.classList.remove('hidden');

    searchPreviewCard.classList.add('active');
  }

  // ----------------------------------------------------------
  // Reset Audio Panel
  // ----------------------------------------------------------

  audioSection.classList.add('hidden');

  // Stop previous audio
  audioPlayer.pause();

  // Remove previous audio source
  audioPlayer.removeAttribute('src');

  // Reload audio player
  audioPlayer.load();

  // Clear transcript
  transcriptText.textContent = '';

  // Reset button
  generateButton.textContent = 'Generate Audio Guide';

  generateButton.disabled = false;

  // Reset audio state
  generateButton.dataset.audioReady = 'false';

  // Show experience panel
  experiencePanel.classList.remove('hidden');

  setTimeout(() => {
    experiencePanel.classList.add('visible');
  }, 10);
}

// --- Deselect Destination ---

function deselectDestination() {
  experiencePanel.classList.remove('visible');

  setTimeout(() => {
    experiencePanel.classList.add('hidden');

    cardsContainer.classList.remove('faded');

    searchPreviewCard.classList.add('hidden');

    document.querySelectorAll('.place-card').forEach((card) => {
      card.classList.remove('active');
    });
  }, 300);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// --- Close Button ---

closeButton.addEventListener('click', deselectDestination);

// --- Destination Card Clicks ---

document
  .querySelectorAll('.place-card:not(.search-preview-card)')
  .forEach((card) => {
    card.addEventListener('click', () => {
      selectDestination(card.dataset.place, card.dataset.image, card);
    });
  });

// --- Answer Length Toggle ---

const lengthButtons = document.querySelectorAll('[data-group="length"] button');

lengthButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    lengthButtons.forEach((b) => {
      b.classList.remove('active');
    });

    btn.classList.add('active');

    state.length = btn.dataset.value;
  });
});

// --- Voice Gender Toggle ---

const voiceButtons = document.querySelectorAll('[data-group="voice"] button');

voiceButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    voiceButtons.forEach((b) => {
      b.classList.remove('active');
    });

    btn.classList.add('active');

    state.voice = btn.dataset.value;
  });
});

// ============================================================
// GENERATE AUDIO GUIDE
// ============================================================

generateButton.addEventListener('click', async () => {
  // --------------------------------------------------------
  // If audio is already generated,
  // clicking the button should PLAY it.
  // --------------------------------------------------------

  if (audioPlayer.src && generateButton.dataset.audioReady === 'true') {
    try {
      await audioPlayer.play();

      generateButton.textContent = '🔊 Playing...';
    } catch (error) {
      console.error('Audio playback failed:', error);

      alert('Could not play the audio. Please use the audio player controls.');
    }

    return;
  }

  // --------------------------------------------------------
  // Start generating
  // --------------------------------------------------------

  generateButton.disabled = true;

  generateButton.textContent = '⏳ Generating Audio...';

  try {
    const selectedLanguage = languageSelect.value;

    const selectedVoice = state.voice;

    // ------------------------------------------------------
    // Validate language
    // ------------------------------------------------------

    if (!VOICES[selectedLanguage]) {
      throw new Error(`Unsupported language: ${selectedLanguage}`);
    }

    // ------------------------------------------------------
    // Send request to Flask
    // ------------------------------------------------------

    const response = await fetch(GENERATE_AUDIO_GUIDE_API_URL, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        place: state.place,

        answerType: state.length,

        language: selectedLanguage,

        voiceId: VOICES[selectedLanguage][selectedVoice],

        locale: LOCALES[selectedLanguage],
      }),
    });

    // ------------------------------------------------------
    // Check response
    // ------------------------------------------------------

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    // ------------------------------------------------------
    // Read backend JSON
    // ------------------------------------------------------

    const data = await response.json();

    console.log('Backend response:', data);

    // ------------------------------------------------------
    // Display Transcript
    // ------------------------------------------------------

    if (data.description) {
      transcriptText.textContent = data.description;
    } else {
      transcriptText.textContent = 'No description was generated.';
    }

    audioSection.classList.remove('hidden');

    // ======================================================
    // AUDIO
    // ======================================================

    if (data.audioBase64) {
      console.log('Audio Base64 length:', data.audioBase64.length);

      // ----------------------------------------------------
      // Convert Base64 → Blob
      // ----------------------------------------------------

      const audioBlob = base64ToAudioBlob(data.audioBase64);

      if (!audioBlob) {
        throw new Error('Could not create audio blob.');
      }

      // ----------------------------------------------------
      // Create browser audio URL
      // ----------------------------------------------------

      const audioURL = URL.createObjectURL(audioBlob);

      // Stop old audio
      audioPlayer.pause();

      // Set new audio source
      audioPlayer.src = audioURL;

      // Load audio
      audioPlayer.load();

      // Show audio player
      audioPlayer.classList.remove('hidden');

      // Mark audio as ready
      generateButton.dataset.audioReady = 'true';

      generateButton.disabled = false;

      // ----------------------------------------------------
      // Try autoplay
      // ----------------------------------------------------

      try {
        await audioPlayer.play();

        generateButton.textContent = '🔊 Playing...';
      } catch (playError) {
        console.warn('Autoplay was blocked by browser:', playError);

        generateButton.textContent = '▶ Listen to Audio';
      }
    } else {
      // ----------------------------------------------------
      // No audio returned
      // ----------------------------------------------------

      console.error('No audioBase64 received from backend.');

      audioPlayer.classList.add('hidden');

      generateButton.textContent = 'Audio Not Available';

      generateButton.dataset.audioReady = 'false';

      generateButton.disabled = false;
    }
  } catch (error) {
    // ------------------------------------------------------
    // Error handling
    // ------------------------------------------------------

    console.error('Generation error:', error);

    alert(
      'Generation failed. Please check the browser console and Flask terminal.',
    );

    generateButton.textContent = 'Generate Audio Guide';

    generateButton.dataset.audioReady = 'false';

    generateButton.disabled = false;
  }
});

// ============================================================
// AUDIO PLAYER EVENTS
// ============================================================

// Audio starts playing
audioPlayer.addEventListener('play', () => {
  if (generateButton.dataset.audioReady === 'true') {
    generateButton.textContent = '🔊 Playing...';
  }
});

// Audio paused
audioPlayer.addEventListener('pause', () => {
  if (generateButton.dataset.audioReady === 'true') {
    generateButton.textContent = '▶ Listen to Audio';
  }
});

// Audio finished
audioPlayer.addEventListener('ended', () => {
  generateButton.textContent = '▶ Listen to Audio';

  generateButton.disabled = false;
});

// Audio error
audioPlayer.addEventListener('error', () => {
  console.error('HTML Audio Error:', audioPlayer.error);
});

// ============================================================
// TRANSCRIPT TOGGLE
// ============================================================

transcriptToggle.addEventListener('click', () => {
  transcriptContent.classList.toggle('hidden');

  transcriptArrow.classList.toggle('rotate-180');
});

// ============================================================
// INITIAL STATE
// ============================================================

generateButton.dataset.audioReady = 'false';

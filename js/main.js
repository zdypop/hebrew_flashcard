// --- DOM Elements ---
const startChapterSelect = document.getElementById('start-chapter');
const endChapterSelect = document.getElementById('end-chapter');
const flashcardView = document.getElementById('flashcard-view');
const quizView = document.getElementById('quiz-view');
const flashcard = document.getElementById('flashcard');
const frontContent = document.getElementById('card-front-content');
const backContent = document.getElementById('card-back-content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressDiv = document.getElementById('progress');
const shuffleBtn = document.getElementById('shuffle-btn');
const modeFlashcardBtn = document.getElementById('mode-flashcard');
const modeQuizBtn = document.getElementById('mode-quiz');
const modeReviewBtn = document.getElementById('mode-review');
const quizWord = document.getElementById('quiz-word');
const speakBtnFlashcard = document.getElementById('speak-btn-flashcard');
const speakBtnQuiz = document.getElementById('speak-btn-quiz');
const showAnswerBtn = document.getElementById('show-answer-btn');
const quizAnswerDisplay = document.getElementById('quiz-answer-display');
const ratingButtons = document.getElementById('rating-buttons');
const autoplayBtn = document.getElementById('autoplay-btn');
const autoplaySpeedSelect = document.getElementById('autoplay-speed');
const backgroundPlayBtn = document.getElementById('background-play-btn');


// --- State Variables ---
let currentDeck = [];
let currentIndex = 0;
let isShuffled = false;
let currentMode = 'flashcard'; // 'flashcard', 'quiz', or 'review'
let synthVoices = []; // To store available speech synthesis voices
let isAutoplaying = false;
let autoplayTimer = null;
let wakeLock = null; // For keeping screen awake during autoplay


// --- Functions ---
function populateChapterSelectors() {
    const chapters = Object.keys(flashcardData);
    chapters.forEach(chapterNum => {
        const option1 = document.createElement('option');
        option1.value = chapterNum;
        option1.textContent = `第 ${chapterNum} 章`;
        startChapterSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = chapterNum;
        option2.textContent = `第 ${chapterNum} 章`;
        endChapterSelect.appendChild(option2);
    });
    startChapterSelect.value = '3';
    endChapterSelect.value = '3';
}

function buildDeck() {
    const start = parseInt(startChapterSelect.value);
    const end = parseInt(endChapterSelect.value);
    let fullDeck = [];

    for (let i = start; i <= end; i++) {
        if (flashcardData[i]) {
            const chapterWords = flashcardData[i].map(card => ({...card, id: `${i}-${card.he}`}));
            fullDeck = fullDeck.concat(chapterWords);
        }
    }

    if (currentMode === 'review') {
        const today = new Date().toISOString().split('T')[0];
        currentDeck = fullDeck.filter(card => {
            const cardData = learningData[card.id];
            return cardData && cardData.dueDate <= today;
        });
        // In review mode, always shuffle
        isShuffled = true;
    } else {
        currentDeck = fullDeck;
    }
    
    if (isShuffled) {
        shuffleDeck();
    }

    currentIndex = 0;
    updateView();
}


function shuffleDeck() {
    for (let i = currentDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentDeck[i], currentDeck[j]] = [currentDeck[j], currentDeck[i]];
    }
}

function updateCard() {
    if (currentDeck.length === 0) {
        const message = currentMode === 'review' ? '今日无复习内容' : '请选择章节';
        frontContent.textContent = message;
        backContent.innerHTML = '没有单词';
        progressDiv.textContent = '0 / 0';
        stopAutoplay(); // Stop autoplay if deck is empty
        return;
    }
    const card = currentDeck[currentIndex];
    
    frontContent.textContent = card.he;
    
    let backHTML = `<div class="transliteration">${card.tl}</div>`;
    backHTML += `<div class="meaning">${card.zh} / ${card.en}</div>`;
    backContent.innerHTML = backHTML;

    flashcard.classList.remove('is-flipped');
    updateProgress();
}

function updateQuiz() {
    if (currentDeck.length === 0) {
        const message = currentMode === 'review' ? '今日无复习内容' : '请选择章节';
        quizWord.textContent = message;
        quizAnswerDisplay.classList.add('hidden');
        ratingButtons.classList.add('hidden');
        showAnswerBtn.classList.add('hidden');
        progressDiv.textContent = '0 / 0';
        stopAutoplay(); // Stop autoplay if deck is empty
        return;
    }
    const card = currentDeck[currentIndex];
    quizWord.textContent = card.he;
    
    // Reset quiz view
    quizAnswerDisplay.classList.add('hidden');
    ratingButtons.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');

    let answerHTML = `<div class="transliteration">${card.tl}</div>`;
    answerHTML += `<div class="meaning">${card.zh} / ${card.en}</div>`;
    quizAnswerDisplay.innerHTML = answerHTML;

    updateProgress();
}


function updateProgress() {
    const total = currentDeck.length;
    if (total > 0) {
        progressDiv.textContent = `${currentIndex + 1} / ${total}`;
    } else {
        progressDiv.textContent = '0 / 0';
    }
}

function showNext() {
    if (isAutoplaying) return; // Prevent manual navigation during autoplay
    if (currentDeck.length === 0) return;
    currentIndex = (currentIndex + 1) % currentDeck.length;
    updateView();
}

function showPrev() {
    if (isAutoplaying) return; // Prevent manual navigation during autoplay
    if (currentDeck.length === 0) return;
    currentIndex = (currentIndex - 1 + currentDeck.length) % currentDeck.length;
    updateView();
}

function flipCard() {
    if (isAutoplaying) return; // Prevent manual flipping during autoplay
    flashcard.classList.toggle('is-flipped');
}

function switchMode(newMode) {
    stopAutoplay();
    currentMode = newMode;
    
    // Update button active states
    [modeFlashcardBtn, modeQuizBtn, modeReviewBtn].forEach(btn => btn.classList.remove('active'));
    if (newMode === 'flashcard') modeFlashcardBtn.classList.add('active');
    else if (newMode === 'quiz') modeQuizBtn.classList.add('active');
    else if (newMode === 'review') modeReviewBtn.classList.add('active');

    // Show/hide views
    const isFlashcard = newMode === 'flashcard';
    flashcardView.classList.toggle('hidden', !isFlashcard);
    quizView.classList.toggle('hidden', isFlashcard);
    
    // In review mode, we use the quiz interface
    if (newMode === 'review') {
        flashcardView.classList.add('hidden');
        quizView.classList.remove('hidden');
    }

    // Re-build the deck for the new mode
    buildDeck();
}


function updateView() {
    // Review mode uses the quiz view
    if (currentMode === 'flashcard') {
        updateCard();
    } else {
        updateQuiz();
    }
}


// --- Event Listeners ---
startChapterSelect.addEventListener('change', () => {
    stopAutoplay();
    if (parseInt(startChapterSelect.value) > parseInt(endChapterSelect.value)) {
        endChapterSelect.value = startChapterSelect.value;
    }
    buildDeck();
});

endChapterSelect.addEventListener('change', () => {
    stopAutoplay();
    if (parseInt(startChapterSelect.value) > parseInt(endChapterSelect.value)) {
        startChapterSelect.value = endChapterSelect.value;
    }
    buildDeck();
});

shuffleBtn.addEventListener('click', () => {
    stopAutoplay();
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('active', isShuffled);
    shuffleBtn.textContent = isShuffled ? '顺序播放' : '随机播放';
    buildDeck();
});

prevBtn.addEventListener('click', showPrev);
nextBtn.addEventListener('click', showNext);
flashcard.parentElement.addEventListener('click', flipCard);


modeFlashcardBtn.addEventListener('click', () => switchMode('flashcard'));
modeQuizBtn.addEventListener('click', () => switchMode('quiz'));
modeReviewBtn.addEventListener('click', () => switchMode('review'));


speakBtnFlashcard.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the card from flipping when clicking the button
    if (currentDeck.length > 0) {
        speak(currentDeck[currentIndex].he, 'he-IL');
    }
});

speakBtnQuiz.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentDeck.length > 0) {
        speak(currentDeck[currentIndex].he, 'he-IL');
    }
});

showAnswerBtn.addEventListener('click', () => {
    quizAnswerDisplay.classList.remove('hidden');
    ratingButtons.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
});

ratingButtons.addEventListener('click', (e) => {
    if (e.target.classList.contains('rate-btn')) {
        const quality = parseInt(e.target.dataset.quality);
        const card = currentDeck[currentIndex];
        
        // Get current learning data or initialize it
        let cardData = learningData[card.id] || {
            repetition: 0,
            easeFactor: 2.5,
            interval: 0,
            dueDate: new Date().toISOString().split('T')[0]
        };

        // Update data using SM-2
        learningData[card.id] = sm2(cardData, quality);
        saveLearningData();
        
        // If in review mode, remove the card from the current deck
        if (currentMode === 'review') {
            currentDeck.splice(currentIndex, 1);
            if (currentIndex >= currentDeck.length) {
                currentIndex = 0; // Reset if it was the last card
            }
            updateView();
        } else {
            showNext();
        }
    }
});


document.addEventListener('keydown', (e) => {
    // Allow typing in the input field without triggering shortcuts
    if (document.activeElement.tagName === 'INPUT') {
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            showPrev();
            break;
        case 'ArrowRight':
            showNext();
            break;
        case ' ': // Space bar
             if (currentMode === 'flashcard' && !isAutoplaying) {
                flipCard();
                e.preventDefault(); // Prevent page scrolling
            }
            break;
    }
});

// --- Autoplay Feature ---
function toggleAutoplay() {
    if (isAutoplaying) {
        stopAutoplay();
    } else {
        startAutoplay();
    }
}

async function startAutoplay() {
    if (currentDeck.length === 0) return;
    isAutoplaying = true;
    autoplayBtn.textContent = '停止播放';
    autoplayBtn.classList.add('playing');
    
    // Show background play button
    backgroundPlayBtn.style.display = 'inline-block';
    
    // Disable nav buttons during autoplay
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    
    // Request wake lock to keep screen awake
    await requestWakeLock();
    
    autoplayNextStep();
}

function stopAutoplay() {
    isAutoplaying = false;
    clearTimeout(autoplayTimer);
    autoplayBtn.textContent = '自动播放';
    autoplayBtn.classList.remove('playing');
    
    // Hide background play button
    backgroundPlayBtn.style.display = 'none';
    
    prevBtn.disabled = false;
    nextBtn.disabled = false;
    
    // Release wake lock
    releaseWakeLock();
}

// Wake Lock API functions
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock released:', wakeLock.released);
            });
            console.log('Screen Wake Lock acquired:', wakeLock.released);
        } catch (err) {
            console.error('Failed to acquire wake lock:', err);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// Background play functionality
function toggleBackgroundPlay() {
    if (isAutoplaying) {
        // Enable background audio notifications for better mobile support
        enableBackgroundAudio();
        
        // Hide the app interface but keep audio playing
        document.body.style.opacity = '0.1';
        document.body.style.pointerEvents = 'none';
        
        // Show a small indicator
        showBackgroundIndicator();
        
        // Update button text
        backgroundPlayBtn.textContent = '显示界面';
        backgroundPlayBtn.style.pointerEvents = 'auto';
        backgroundPlayBtn.style.opacity = '1';
    } else {
        // Restore normal interface
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';
        hideBackgroundIndicator();
        backgroundPlayBtn.textContent = '后台播放';
    }
}

function enableBackgroundAudio() {
    // Create audio context to maintain audio during background
    if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!window.audioCtx) {
            window.audioCtx = new AudioContext();
            // Create a silent audio buffer to keep audio active
            const buffer = window.audioCtx.createBuffer(1, 1, 22050);
            const source = window.audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(window.audioCtx.destination);
            source.start();
        }
    }
}

function showBackgroundIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'background-indicator';
    indicator.innerHTML = `
        <div style="position: fixed; top: 20px; left: 20px; z-index: 9999; 
                    background: rgba(0,0,0,0.8); color: white; padding: 10px 15px; 
                    border-radius: 20px; font-size: 14px; opacity: 1; pointer-events: auto;">
            🎵 后台播放中... <button onclick="toggleBackgroundPlay()" style="margin-left: 10px; 
                                 padding: 5px 10px; border: none; border-radius: 10px; 
                                 background: #3498db; color: white; cursor: pointer;">显示界面</button>
        </div>
    `;
    document.body.appendChild(indicator);
}

function hideBackgroundIndicator() {
    const indicator = document.getElementById('background-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function autoplayNextStep() {
    if (!isAutoplaying) return;

    const speed = parseInt(autoplaySpeedSelect.value);
    const halfSpeed = speed / 2;
    
    // 1. 先更新视图以显示正确的希伯来语单词
    flashcard.classList.remove('is-flipped');
    updateView(); 
    
    const card = currentDeck[currentIndex];
    
    // 2. 延迟 0.5 秒后朗读希伯来语
    setTimeout(() => {
        if (isAutoplaying) speak(card.he, 'he-IL');
    }, 500);


    // 3. 等待，然后翻转卡片
    autoplayTimer = setTimeout(() => {
        if (!isAutoplaying) return;
        flashcard.classList.add('is-flipped');

        // 4. 翻转后延迟 0.5 秒朗读英文
        setTimeout(() => {
            if (isAutoplaying) speak(card.en, 'en-US');
        }, 500);

        // 5. 再等待，然后移动到下一个单词
        autoplayTimer = setTimeout(() => {
            if (!isAutoplaying) return;
            currentIndex = (currentIndex + 1) % currentDeck.length;
            autoplayNextStep();
        }, halfSpeed);
    }, halfSpeed);
}


autoplayBtn.addEventListener('click', toggleAutoplay);
backgroundPlayBtn.addEventListener('click', toggleBackgroundPlay);
autoplaySpeedSelect.addEventListener('change', () => {
    if (isAutoplaying) {
        stopAutoplay();
        startAutoplay();
    }
});


// --- Speech Synthesis ---

/**
 * Populates the synthVoices array with available voices.
 * This is the callback for the 'voiceschanged' event.
 */
function populateVoiceList() {
    if(typeof speechSynthesis === 'undefined') {
      return;
    }
    synthVoices = speechSynthesis.getVoices();
}

/**
 * Uses the browser's SpeechSynthesis API to speak the given text in a specific language.
 * @param {string} text The text to speak.
 * @param {string} lang The BCP 47 language code (e.g., 'he-IL', 'en-US').
 */
function speak(text, lang) {
    if (typeof speechSynthesis === 'undefined') {
        alert('抱歉，您的浏览器不支持语音合成功能。');
        return;
    }
    
    // Stop any previous speech to avoid overlaps
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Set different rates for clarity
    if (lang === 'he-IL') {
        utterance.rate = 0.8; 
    } else {
        utterance.rate = 1.0;
    }
    
    // Find a matching voice, accounting for legacy codes like 'iw' for Hebrew
    const baseLang = lang.split('-')[0];
    let voice = synthVoices.find(v => v.lang.startsWith(lang.split('-')[0]));
    
    // If Hebrew (he) voice not found, try legacy Hebrew (iw) code
    if (!voice && baseLang === 'he') {
        voice = synthVoices.find(v => v.lang.startsWith('iw'));
    }
    
    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// --- SM-2 Spaced Repetition ---
let learningData = {}; // To store SM-2 data for each word

/**
 * Calculates the next review date for a flashcard using the SM-2 algorithm.
 * @param {object} cardData - The learning data for a specific card.
 * @param {number} quality - The user's rating of how well they knew the word (0-5).
 * @returns {object} The updated learning data for the card.
 */
function sm2(cardData, quality) {
    if (quality < 0 || quality > 5) {
        throw new Error("Quality must be between 0 and 5.");
    }

    let { repetition, easeFactor, interval } = cardData;

    if (quality < 3) {
        // If the answer was incorrect, reset repetition and interval
        repetition = 0;
        interval = 1;
    } else {
        // If the answer was correct
        repetition += 1;
        if (repetition === 1) {
            interval = 1;
        } else if (repetition === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
    }

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
        easeFactor = 1.3;
    }

    // Set the next review date
    const now = new Date();
    // Use a clean date to avoid time zone issues
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setDate(today.getDate() + interval);

    return { ...cardData, repetition, easeFactor, interval, dueDate: today.toISOString().split('T')[0] };
}


/**
 * Loads the learning data from localStorage.
 */
function loadLearningData() {
    const data = localStorage.getItem('hebrewFlashcardData');
    if (data) {
        learningData = JSON.parse(data);
    } else {
        learningData = {}; // Start with an empty object if no data is saved
    }
}

/**
 * Saves the learning data to localStorage.
 */
function saveLearningData() {
    localStorage.setItem('hebrewFlashcardData', JSON.stringify(learningData));
}


// --- Initial Load ---
populateVoiceList();
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

// PWA Install functionality
let deferredPrompt;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA install prompt triggered');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    showInstallButton();
});

// Show install button
function showInstallButton() {
    // Create install button if it doesn't exist
    if (!document.getElementById('install-btn')) {
        const installBtn = document.createElement('button');
        installBtn.id = 'install-btn';
        installBtn.textContent = '📱 安装应用';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 25px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        installBtn.addEventListener('click', installPWA);
        installBtn.addEventListener('mouseover', () => {
            installBtn.style.background = '#229954';
            installBtn.style.transform = 'scale(1.05)';
        });
        installBtn.addEventListener('mouseout', () => {
            installBtn.style.background = '#27ae60';
            installBtn.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(installBtn);
        
        // Hide the button after 10 seconds
        setTimeout(() => {
            if (installBtn && installBtn.parentNode) {
                installBtn.style.opacity = '0.6';
            }
        }, 10000);
    }
}

// Install PWA
async function installPWA() {
    const installBtn = document.getElementById('install-btn');
    
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // Clear the deferredPrompt variable
        deferredPrompt = null;
        // Hide the install button
        if (installBtn) {
            installBtn.remove();
        }
    } else {
        // Fallback: show manual installation instructions
        showInstallInstructions();
    }
}

// Show manual install instructions
function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
        instructions = `
            <h3>📱 在iPhone/iPad上安装：</h3>
            <ol>
                <li>点击Safari底部的分享按钮 📤</li>
                <li>向下滑动找到"添加到主屏幕"</li>
                <li>点击"添加到主屏幕"</li>
                <li>确认应用名称，点击"添加"</li>
            </ol>
        `;
    } else if (isAndroid) {
        instructions = `
            <h3>📱 在Android设备上安装：</h3>
            <ol>
                <li>点击Chrome浏览器菜单（三个点）</li>
                <li>选择"添加到主屏幕"或"安装应用"</li>
                <li>确认安装</li>
            </ol>
        `;
    } else {
        instructions = `
            <h3>💻 在桌面浏览器安装：</h3>
            <ol>
                <li>在地址栏右侧查找安装图标</li>
                <li>或在浏览器菜单中选择"安装应用"</li>
                <li>确认安装</li>
            </ol>
        `;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.7); z-index: 9999; 
                    display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 15px; 
                        max-width: 400px; margin: 20px; max-height: 80vh; overflow-y: auto;">
                <h2>📲 安装希伯来文闪卡</h2>
                ${instructions}
                <p style="color: #666; font-size: 14px; margin-top: 15px;">
                    安装后可以像普通应用一样使用，支持离线访问和后台播放功能。
                </p>
                <button onclick="this.closest('div').parentNode.remove()" 
                        style="background: #3498db; color: white; border: none; 
                               padding: 10px 20px; border-radius: 8px; cursor: pointer; 
                               margin-top: 15px;">
                    知道了
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Handle app installed event
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.remove();
    }
});

// Handle page visibility changes for background audio
document.addEventListener('visibilitychange', () => {
    if (isAutoplaying && document.hidden) {
        // Page is hidden, ensure audio continues
        enableBackgroundAudio();
    }
});

// Handle beforeunload to clean up wake lock
window.addEventListener('beforeunload', () => {
    releaseWakeLock();
});

// Make toggleBackgroundPlay globally available
window.toggleBackgroundPlay = toggleBackgroundPlay;

populateChapterSelectors();
loadLearningData();
buildDeck();
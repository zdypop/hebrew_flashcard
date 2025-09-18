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


// --- State Variables ---
let currentDeck = [];
let currentIndex = 0;
let isShuffled = false;
let currentMode = 'flashcard'; // 'flashcard', 'quiz', or 'review'
let synthVoices = []; // To store available speech synthesis voices
let isAutoplaying = false;
let autoplayTimer = null;


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

function startAutoplay() {
    if (currentDeck.length === 0) return;
    isAutoplaying = true;
    autoplayBtn.textContent = '停止播放';
    autoplayBtn.classList.add('playing');
    // Disable nav buttons during autoplay
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    autoplayNextStep();
}

function stopAutoplay() {
    isAutoplaying = false;
    clearTimeout(autoplayTimer);
    autoplayBtn.textContent = '自动播放';
    autoplayBtn.classList.remove('playing');
    prevBtn.disabled = false;
    nextBtn.disabled = false;
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
    const voice = synthVoices.find(v => {
        const voiceLang = v.lang.split('-')[0];
        if (baseLang === 'he') {
            return voiceLang === 'he' || voiceLang === 'iw';
        }
        return voiceLang === baseLang;
    });
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

populateChapterSelectors();
loadLearningData();
buildDeck();
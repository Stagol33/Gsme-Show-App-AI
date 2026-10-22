/* ==========================================================================
   Wheel of Success 2.0 - game logic
   ========================================================================== */

// ----- Key page elements -----
const qwerty = document.getElementById("qwerty");
const word = document.getElementById("word");
const overlay = document.getElementById("overlay");
const timerEl = document.getElementById("timer");

// Snapshot of the start screen so "Home" can restore it exactly as it was
const startScreenMarkup = overlay.innerHTML;

// ----- Game state -----
const MAX_MISSES = 5;
const TOTAL_TIME = 25;
const WORD_LENGTHS = { easy: 3, medium: 6, hard: 9 };

let missed = 0;
let difficulty = "easy";
let lifeIcon = "Heart";
let currentWord = "";
let currentStreak = 0;
let timeRemaining = TOTAL_TIME;
let timerId = null;
let gameActive = false;

/* ==========================================================================
   Word selection
   ========================================================================== */

// Fetches a random word of the right length from the Random Word API.
// Falls back to the local answers.json list if the API fails.
async function getRandomWordAsArray(selectedDifficulty) {
  const wordLength = WORD_LENGTHS[selectedDifficulty];
  let randomWord = "";

  try {
    const response = await fetch(
      `https://random-word-api.herokuapp.com/word?length=${wordLength}&diff=1`
    );
    if (!response.ok) throw new Error(`Random Word API error: ${response.status}`);
    const [apiWord] = await response.json();
    randomWord = apiWord.toLowerCase();
    // Only accept words made of letters with the expected length
    if (!/^[a-z]+$/.test(randomWord) || randomWord.length !== wordLength) {
      throw new Error(`Unusable word from API: ${apiWord}`);
    }
  } catch (error) {
    console.warn(error.message, "- using answers.json instead");
    randomWord = await getLocalWord(selectedDifficulty);
  }

  const characters = randomWord.split("");
  return characters;
}

// Picks a random word for the difficulty from answers.json
async function getLocalWord(selectedDifficulty) {
  try {
    const response = await fetch("./answers.json");
    const { answers } = await response.json();
    const list = answers[selectedDifficulty];
    return list[Math.floor(Math.random() * list.length)];
  } catch (error) {
    console.error("Could not load answers.json:", error);
    return "";
  }
}

/* ==========================================================================
   Display
   ========================================================================== */

// Adds a hidden letter tile to the #word list for each character in arr
function addWordToDisplay(arr) {
  const ul = word.querySelector("ul");
  arr.forEach((character) => {
    const li = document.createElement("li");
    li.textContent = character;
    li.classList.add("letter");
    ul.appendChild(li);
  });
}

// Shows the first Datamuse definition of the word as a hint
async function fetchAndShowDefinition(selectedWord) {
  const definition = document.getElementById("definition");
  const hint = definition.querySelector("p");
  hint.textContent = "Loading hint...";

  try {
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${selectedWord}&md=d&max=1`
    );
    if (!response.ok) throw new Error(`Datamuse API error: ${response.status}`);
    const data = await response.json();
    const firstDef = data[0]?.defs?.[0];

    if (firstDef) {
      // Definitions look like "n\tSome text" - drop the part-of-speech tag
      // and blank out the answer so the hint doesn't give it away
      const text = firstDef.split("\t").pop().trim();
      const answerPattern = new RegExp(selectedWord, "gi");
      hint.textContent = `Hint: ${text.replace(answerPattern, "____")}`;
    } else {
      hint.textContent = "No hint available for this word.";
    }
  } catch (error) {
    console.error(error);
    hint.textContent = "Hint could not be loaded.";
  }
}

// Sets every scoreboard image to the chosen "live" icon
function setLifeIcons() {
  document.querySelectorAll("#scoreboard img").forEach((img) => {
    img.src = `./images/live${lifeIcon}.png`;
    img.alt = "Life remaining";
  });
}

/* ==========================================================================
   Core game logic
   ========================================================================== */

// Reveals every tile matching the guess; returns the letter or null
function checkLetter(guess) {
  const letters = document.querySelectorAll("li.letter");
  let match = null;

  letters.forEach((letter) => {
    if (letter.textContent === guess) {
      letter.classList.add("show");
      match = guess;
    }
  });

  return match;
}

// Records a miss and swaps the next "live" icon for a "lost" one
function removeLife() {
  if (missed >= MAX_MISSES) return;
  const lives = document.querySelectorAll("#scoreboard img");
  lives[missed].src = `./images/lost${lifeIcon}.png`;
  lives[missed].alt = "Life lost";
  missed++;
}

// Handles a guess from either keyboard
function handleInteraction(button) {
  if (!gameActive || button.disabled) return;

  button.disabled = true;
  button.classList.add("chosen");

  const letterFound = checkLetter(button.textContent);
  if (letterFound === null) {
    removeLife();
  }

  checkWin();
}

// Ends the game when every letter is shown or all lives are gone
function checkWin() {
  const shown = document.querySelectorAll(".letter.show").length;
  const total = document.querySelectorAll(".letter").length;

  if (total > 0 && shown === total) {
    endGame("win");
  } else if (missed >= MAX_MISSES) {
    endGame("lose");
  }
}

// Stops play, updates streaks and shows the win/lose overlay
function endGame(result) {
  gameActive = false;
  stopTimer();

  currentStreak = result === "win" ? currentStreak + 1 : 0;
  const bestStreak = saveStreaks();

  overlay.className = result;
  if (result === "win") {
    overlay.innerHTML = `
      <h2 class="title">You Win!</h2>
      <p>The word was "${currentWord}"</p>
      <p>Current Streak: ${currentStreak}</p>
      <p>Best Streak: ${bestStreak}</p>
      <div class="button-container">
        <button class="btn_reset">Play Again</button>
        <button class="btn_home">Home</button>
      </div>`;
  } else {
    overlay.innerHTML = `
      <h2 class="title">You Lose!</h2>
      <p>The word was "${currentWord}"</p>
      <p>Current Streak: ${currentStreak}</p>
      <p>Best Streak: ${bestStreak}</p>
      <div class="button-container">
        <button class="btn_reset">Try Again</button>
        <button class="btn_home">Home</button>
      </div>`;
  }

  overlay.style.display = "flex";
  overlay.querySelector(".btn_reset").focus();
}

/* ==========================================================================
   Local storage - win streaks and theme
   ========================================================================== */

// Saves the current streak and updates the best streak if beaten.
// Returns the best streak for the current difficulty.
function saveStreaks() {
  localStorage.setItem(`currentStreak_${difficulty}`, currentStreak);

  const savedBest = localStorage.getItem(`bestStreak_${difficulty}`);
  let bestStreak = Number(savedBest) || 0;
  if (savedBest === null || currentStreak > bestStreak) {
    bestStreak = currentStreak;
    localStorage.setItem(`bestStreak_${difficulty}`, bestStreak);
  }

  return bestStreak;
}

// Reads the saved current streak for the selected difficulty
function loadCurrentStreak() {
  currentStreak = Number(localStorage.getItem(`currentStreak_${difficulty}`)) || 0;
}

function saveTheme(theme) {
  localStorage.setItem("theme", theme);
}

// Applies the saved theme and preselects it on the start screen
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (!savedTheme) return;

  document.documentElement.dataset.theme = savedTheme;
  const themeSelect = document.getElementById("theme");
  if (themeSelect) themeSelect.value = savedTheme;
}

/* ==========================================================================
   Hard mode timer
   ========================================================================== */

// Counts down from TOTAL_TIME, removing a life every 5 seconds
function startTimer() {
  stopTimer();
  timeRemaining = TOTAL_TIME;
  timerEl.hidden = false;
  updateTimerDisplay();

  timerId = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    if ((TOTAL_TIME - timeRemaining) % 5 === 0) {
      removeLife();
      checkWin();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function updateTimerDisplay() {
  timerEl.querySelector("p").textContent = timeRemaining;
}

/* ==========================================================================
   Game flow
   ========================================================================== */

// Clears the board, keyboard and lives ready for a new round
function resetGame() {
  stopTimer();
  missed = 0;
  currentWord = "";

  qwerty.querySelectorAll("button").forEach((button) => {
    button.disabled = false;
    button.classList.remove("chosen");
  });

  word.querySelector("ul").innerHTML = "";
  document.querySelector("#definition p").textContent = "";
  timerEl.hidden = true;
  setLifeIcons();
}

// Loads a new word and starts a round with the current settings
async function startRound() {
  resetGame();
  overlay.style.display = "none";

  const wordArray = await getRandomWordAsArray(difficulty);
  currentWord = wordArray.join("");
  addWordToDisplay(wordArray);
  fetchAndShowDefinition(currentWord);

  gameActive = true;
  if (difficulty === "hard") startTimer();
}

// Restores the start screen exactly as it was on page load
function goHome() {
  resetGame();
  overlay.className = "start";
  overlay.innerHTML = startScreenMarkup;
  loadTheme();
}

/* ==========================================================================
   Event listeners
   ========================================================================== */

// Start screen form - delegated so it still works after the markup is restored
overlay.addEventListener("submit", (e) => {
  if (e.target.id !== "setup-form") return;
  e.preventDefault();

  difficulty = document.getElementById("difficulty").value;
  lifeIcon = document.getElementById("lifeicon").value;
  const theme = document.getElementById("theme").value;

  document.documentElement.dataset.theme = theme;
  saveTheme(theme);
  loadCurrentStreak();
  startRound();
});

// Play Again / Home buttons on the win and lose screens
overlay.addEventListener("click", (e) => {
  if (e.target.closest("#setup-form")) return;

  if (e.target.classList.contains("btn_reset")) {
    startRound();
  } else if (e.target.classList.contains("btn_home")) {
    goHome();
  }
});

// On-screen keyboard - only react to clicks on the letter buttons
qwerty.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    handleInteraction(e.target);
  }
});

// Physical keyboard - find the matching on-screen key and use it
document.addEventListener("keydown", (e) => {
  if (!gameActive || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!/^[a-z]$/i.test(e.key)) return;

  const letter = e.key.toLowerCase();
  qwerty.querySelectorAll("button").forEach((button) => {
    if (button.textContent === letter) {
      handleInteraction(button);
    }
  });
});

// Apply the saved theme as soon as the page is ready
document.addEventListener("DOMContentLoaded", loadTheme);

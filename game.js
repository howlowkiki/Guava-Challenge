// 遊戲變數
let score = 0;
let gameActive = false;
let isPaused = false; // 用於「答錯等待 Enter」
let isMenuOpen = false; // 用於「離開確認對話框」
let bubbles = []; 
let gameLoopId = null;
let currentConfig = {};
let targetScore = 20000;

let availableWords = [];

// 難度設定
const difficulties = {
    easy:   { speed: 0.6, points: 50,  name: "簡單" },
    normal: { speed: 1.5, points: 100, name: "普通" },
    hard:   { speed: 3.0, points: 200, name: "困難" }
};

// DOM 元素
const scoreDisplay = document.getElementById('score');
const targetScoreDisplay = document.getElementById('target-score-display');
const inputField = document.getElementById('answer-input');
const container = document.getElementById('bubbles-container');
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const exitModal = document.getElementById('exit-confirm-modal');
const endTitle = document.getElementById('end-title');
const endScore = document.getElementById('end-score');
const modeText = document.getElementById('current-mode');
const continueMsg = document.getElementById('continue-msg');
const wordSelect = document.getElementById('word-select');

// 初始化：網頁載入後自動 focus 輸入框
window.onload = function() {
    inputField.focus();
};

// 監聽輸入框
inputField.addEventListener('input', checkInput);

// 監聽全域按鍵
document.addEventListener('keydown', (e) => {
    // 1. 如果在「答錯暫停」狀態，按 Enter 繼續
    if (gameActive && isPaused && !isMenuOpen && e.key === 'Enter') {
        resumeGame();
    }
    
    // 2. 遊戲中按 ESC：直接放棄該題
    if (gameActive && !isPaused && !isMenuOpen && e.key === 'Escape') {
        failCurrentBubble();
    }

    // 3. 遊戲中按 Backspace：跳出離開確認 (僅當輸入框為空時觸發)
    if (gameActive && !isMenuOpen && e.key === 'Backspace') {
        if (inputField.value === '') {
            showExitConfirm();
        }
    }
});

// 顯示主選單
function showMenu() {
    gameOverScreen.classList.add('hidden');
    exitModal.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    clearGame();
}

// 開始遊戲
function startGame(mode) {
    currentConfig = difficulties[mode];
    modeText.innerText = currentConfig.name;
    
    // 選擇單字庫
    const selectedValue = wordSelect.value;
    let sourceList = (selectedValue === "1200") ? wordList1200 : wordList2000;
    availableWords = [...sourceList];

    menuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    score = 0;
    scoreDisplay.innerText = score;
    targetScoreDisplay.innerText = targetScore;
    
    gameActive = true;
    isPaused = false;
    isMenuOpen = false;
    
    inputField.value = '';
    // 強制 Focus
    setTimeout(() => inputField.focus(), 100);

    gameLoop();
    spawnBubble();
}

// 清除遊戲資料
function clearGame() {
    gameActive = false;
    isPaused = false;
    isMenuOpen = false;
    cancelAnimationFrame(gameLoopId);
    bubbles.forEach(b => b.element.remove());
    bubbles = [];
    continueMsg.style.display = 'none';
}

// 顯示離開確認對話框
function showExitConfirm() {
    isMenuOpen = true;
    cancelAnimationFrame(gameLoopId); // 暫停畫面更新
    exitModal.classList.remove('hidden');
}

// 處理離開確認的選擇 (是/否)
function confirmExit(shouldExit) {
    exitModal.classList.add('hidden');
    isMenuOpen = false;

    if (shouldExit) {
        showMenu();
    } else {
        // 選擇「否」，繼續遊戲
        // 如果原本不是在「答錯暫停」狀態，就恢復動畫迴圈
        if (!isPaused) {
            gameLoop();
        }
        inputField.focus();
    }
}

function spawnBubble() {
    if (!gameActive || isPaused || isMenuOpen) return;
    if (bubbles.length > 0) return;

    if (availableWords.length === 0) {
        endGame(true, "單字全制霸！");
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const wordData = availableWords[randomIndex];
    availableWords.splice(randomIndex, 1);
    
    const bubbleEl = document.createElement('div');
    bubbleEl.classList.add('bubble');
    bubbleEl.innerText = wordData.ch;
    
    const minX = window.innerWidth * 0.1;
    const maxX = window.innerWidth * 0.9;
    const randomLeft = Math.floor(Math.random() * (maxX - minX)) + minX;
    
    bubbleEl.style.left = randomLeft + 'px';
    bubbleEl.style.top = '-100px'; 
    
    container.appendChild(bubbleEl);

    bubbles.push({
        element: bubbleEl,
        en: wordData.en.toLowerCase(),
        ch: wordData.ch,
        x: randomLeft,
        y: -100
    });
}

function gameLoop() {
    if (!gameActive) return;

    // 只有在「沒有暫停」且「選單沒開」的時候才移動泡泡
    if (!isPaused && !isMenuOpen) {
        const screenHeight = window.innerHeight;
        bubbles.forEach((bubble) => {
            bubble.y += currentConfig.speed;
            bubble.element.style.top = bubble.y + 'px';

            if (bubble.y > screenHeight - 150) {
                failCurrentBubble();
            }
        });
    }
    
    // 如果選單打開，就不呼叫下一幀，達成完全靜止
    if (!isMenuOpen) {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

function failCurrentBubble() {
    if (bubbles.length === 0) return;
    const bubble = bubbles[0];
    isPaused = true;
    
    bubble.element.classList.add('wrong');
    bubble.element.innerHTML = `${bubble.ch}<br><span class="answer-text">${bubble.en}</span>`;
    
    continueMsg.style.display = 'block';
    // 這裡我們不 disable input，方便玩家練習打字，但不計分
}

function resumeGame() {
    bubbles.forEach(b => b.element.remove());
    bubbles = [];
    
    isPaused = false;
    continueMsg.style.display = 'none';
    inputField.value = '';
    inputField.focus();
    
    spawnBubble();
}

function checkInput() {
    // 如果暫停中或選單開啟，不處理輸入
    if (isPaused || isMenuOpen) return;
    
    const text = inputField.value.trim().toLowerCase();
    
    if (bubbles.length > 0) {
        const target = bubbles[0];
        
        if (text === target.en) {
            target.element.remove();
            bubbles = []; 
            
            score += currentConfig.points;
            scoreDisplay.innerText = score;
            inputField.value = '';

            if (score >= targetScore) {
                endGame(true);
            } else {
                spawnBubble();
            }
        }
    }
}

function endGame(isWin, customMsg) {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    
    menuScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    if (isWin) {
        endTitle.innerText = customMsg || "恭喜過關！";
        endTitle.style.color = "#2ecc71";
    } else {
        endTitle.innerText = "挑戰結束";
    }
    endScore.innerText = `最終分數: ${score}`;
}
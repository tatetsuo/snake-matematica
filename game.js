// Elementos da DOM
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const missionText = document.getElementById("missionText");
const scoreText = document.getElementById("scoreText");
const inventoryBox = document.getElementById("inventoryBox");
const failReason = document.getElementById("failReason");

// Configurações
const gridSize = 16;
const cols = canvas.width / gridSize;
const rows = canvas.height / gridSize;

const blockTypes = [
    { color: "#ef4444", symbol: "A" }, // Vermelho
    { color: "#3b82f6", symbol: "B" }, // Azul
    { color: "#eab308", symbol: "C" }, // Amarelo
    { color: "#a855f7", symbol: "D" }  // Roxo
];

// Estado do Jogo
let snake = [];
let velocity = { x: 0, y: 0 };
let blocksOnMap = [];
let inventory = [];
let interactionsCompleted = 0;
const interactionsNeeded = 5; 
let gameLoop;
let isPlaying = false;

// Variáveis do Modo Infinito (Easter Egg)
let isInfiniteMode = false;
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
let konamiIndex = 0;

// Estado Matemático
let currentMode = "SIMPLES";
const combinationSize = 3;

// --- SISTEMA DE ÁUDIO (Sintetizador Web) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        // Som curto e agudo de coleta
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } 
    else if (type === 'success') {
        // Som agudinho de pacote fechado com sucesso
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
    else if (type === 'error') {
        // Som grave de erro/batida
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// --- GERENCIAMENTO DE TELAS ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (screenId) {
        const screen = document.getElementById(screenId);
        if(screen) screen.classList.remove('hidden');
    }
}

function startGame() {
    showScreen(''); // Esconde todas as telas
    hud.classList.remove('hidden');
    
    snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
    velocity = { x: 0, y: -1 }; // Começa indo pra cima
    inventory = [];
    interactionsCompleted = 0;
    
    setupNewMission();
    
    isPlaying = true;
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 120); // Velocidade do jogo
}

function endGame(reason, isVictory = false) {
    isPlaying = false;
    clearInterval(gameLoop);
    hud.classList.add('hidden');
    
    if (isVictory) {
        playSound('success'); // Toca som de vitória
        showScreen('victoryScreen');
    } else {
        playSound('error'); // Toca som de falha
        failReason.innerText = reason;
        showScreen('gameOverScreen');
    }
}

// --- LÓGICA MATEMÁTICA E MISSÕES ---
function setupNewMission() {
    inventory = [];
    currentMode = Math.random() > 0.5 ? "SIMPLES" : "REPETICAO";
    
    if (currentMode === "SIMPLES") {
        missionText.innerText = "Missão: Combinação Simples (Colete 3 Diferentes)";
        missionText.style.color = "#60a5fa";
    } else {
        missionText.innerText = "Missão: Combinação c/ Repetição (Colete 3 Iguais ou Não)";
        missionText.style.color = "#f472b6";
    }
    
    updateHUD();
    spawnBlocks();
}

function spawnBlocks() {
    blocksOnMap = [];
    for(let i = 0; i < 5; i++) {
        let type = blockTypes[Math.floor(Math.random() * blockTypes.length)];
        blocksOnMap.push({
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows),
            color: type.color,
            symbol: type.symbol
        });
    }
}

function processCollectedBlock(symbol) {
    if (currentMode === "SIMPLES" && inventory.includes(symbol)) {
        endGame("Erro Matemático: Em uma Combinação Simples, os elementos não podem se repetir!");
        return;
    }

    inventory.push(symbol);
    updateHUD();

    if (inventory.length === combinationSize) {
        interactionsCompleted++;
        
        // Se NÃO for modo infinito e bater a meta, vence.
        if (!isInfiniteMode && interactionsCompleted >= interactionsNeeded) {
            endGame("", true); 
        } else {
            // Se for Modo Infinito OU ainda não bateu a meta normal:
            playSound('success'); 
            canvas.style.borderColor = "#fbbf24";
            setTimeout(() => canvas.style.borderColor = "#10b981", 300);
            
            // setupNewMission já zera o inventário e troca a regra matemática
            setupNewMission(); 
        }
    } else {
        playSound('eat'); 
        spawnBlocks(); 
    }
}

function updateHUD() {
    // Muda o texto do placar dependendo do modo
    if (isInfiniteMode) {
        scoreText.innerText = `Pacotes: ${interactionsCompleted} (Infinito)`;
    } else {
        scoreText.innerText = `${interactionsCompleted}/${interactionsNeeded}`;
    }
    
    let invDisplay = "";
    for (let i = 0; i < combinationSize; i++) {
        invDisplay += inventory[i] ? `[${inventory[i]}] ` : "[ ] ";
    }
    inventoryBox.innerText = invDisplay;
}

// --- LOOP DO JOGO ---
function update() {
    if (!isPlaying) return;

    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
        endGame("Falha Crítica: Colisão estrutural (Parede).");
        return;
    }

    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
            endGame("Falha Crítica: Corrompimento de dados (Bateu no próprio corpo).");
            return;
        }
    }

    snake.unshift(head);

    let ateBlock = false;
    for (let i = 0; i < blocksOnMap.length; i++) {
        if (head.x === blocksOnMap[i].x && head.y === blocksOnMap[i].y) {
            processCollectedBlock(blocksOnMap[i].symbol);
            blocksOnMap.splice(i, 1);
            ateBlock = true;
            break;
        }
    }

    if (!ateBlock) {
        snake.pop(); 
    }

    draw();
}

function draw() {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    blocksOnMap.forEach(block => {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x * gridSize + 2, block.y * gridSize + 2, gridSize - 4, gridSize - 4);
    });

    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#10b981" : "#059669";
        ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
    });
}

// --- CONTROLES E BOTÕES ---
// Detector do Konami Code
window.addEventListener('keydown', (e) => {
    // Só escuta o código se estiver na tela inicial (sem jogar)
    if (!isPlaying && !document.getElementById('startScreen').classList.contains('hidden')) {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                ativarModoInfinito();
                konamiIndex = 0; // Reseta após ativar
            }
        } else {
            konamiIndex = 0; // Errou a sequência, zera o progresso
        }
    }
});

function ativarModoInfinito() {
    isInfiniteMode = true;
    playSound('success'); // Toca o sonzinho de sucesso
    
    // Muda o visual da tela inicial para mostrar que desbloqueou
    const titulo = document.querySelector('#startScreen h2');
    titulo.innerText = "Operação: INFINITA (Desbloqueada!)";
    titulo.style.color = "#a855f7"; // Fica roxo neon
    
    const texto = document.querySelector('#startScreen p');
    texto.innerHTML = "<strong>Modo Infinito:</strong> O limite de 5 pacotes foi desativado. Sobreviva até preencher todo o sistema e continue resolvendo as combinações. Boa sorte!";
}

window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': if (velocity.y === 0) velocity = { x: 0, y: -1 }; break;
        case 'ArrowDown': if (velocity.y === 0) velocity = { x: 0, y: 1 }; break;
        case 'ArrowLeft': if (velocity.x === 0) velocity = { x: -1, y: 0 }; break;
        case 'ArrowRight': if (velocity.x === 0) velocity = { x: 1, y: 0 }; break;
    }
    
});

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

window.addEventListener('touchmove', e => {
    if(isPlaying) e.preventDefault(); 
}, {passive: false});

window.addEventListener('touchend', e => {
    if(!isPlaying) return;
    let endX = e.changedTouches[0].screenX;
    let endY = e.changedTouches[0].screenY;
    
    let diffX = endX - touchStartX;
    let diffY = endY - touchStartY;

    if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && velocity.x === 0) velocity = { x: 1, y: 0 };
            else if (diffX < 0 && velocity.x === 0) velocity = { x: -1, y: 0 };
        } else {
            if (diffY > 0 && velocity.y === 0) velocity = { x: 0, y: 1 };
            else if (diffY < 0 && velocity.y === 0) velocity = { x: 0, y: -1 };
        }
    }
});

// Eventos dos Botões (Correção do erro de Reference)
document.getElementById('btnProximo')?.addEventListener('click', () => {
    showScreen('tutorialScreen');
});

document.getElementById('btnIniciar')?.addEventListener('click', () => {
    startGame();
});

document.getElementById('btnReiniciar1')?.addEventListener('click', () => {
    showScreen('startScreen');
});

document.getElementById('btnReiniciar2')?.addEventListener('click', () => {
    showScreen('startScreen');
});


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");
const livesEl = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDescription = document.getElementById("overlayDescription");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const gameStatus = document.getElementById("gameStatus");

// Game configuration
const W = canvas.width;
const H = canvas.height;

let score = 0;
let highScore = Number(localStorage.getItem("galaxyHighScore")) || 0;
let lives = 3;
let level = 1;

let gameRunning = false;
let paused = false;
let gameOver = false;

let animationId = null;
let lastTime = 0;
let enemyTimer = 0;
let shootTimer = 0;
let invincibleTimer = 0;

const keys = {};

let bullets = [];
let enemies = [];
let particles = [];

// Player spaceship
const player = {
    x: W / 2,
    y: H - 65,
    width: 42,
    height: 45,
    speed: 350
};

// Display high score
highScoreEl.textContent = formatScore(highScore);

function formatScore(value) {
    return String(value).padStart(5, "0");
}

// Create background stars
const stars = Array.from({ length: 110 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 55 + 20
}));

// Draw background
function drawBackground(dt) {
    ctx.fillStyle = "#050817";
    ctx.fillRect(0, 0, W, H);

    // Galaxy glow
    const gradient = ctx.createRadialGradient(
        W / 2, H / 2, 10,
        W / 2, H / 2, 450
    );

    gradient.addColorStop(0, "#15133b");
    gradient.addColorStop(1, "#050817");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Moving stars
    stars.forEach(star => {
        star.y += star.speed * dt;

        if (star.y > H) {
            star.y = 0;
            star.x = Math.random() * W;
        }

        ctx.fillStyle = "rgba(180,220,255,0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00d9ff";

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowBlur = 0;
}

// Draw spaceship
function drawPlayer() {
    if (invincibleTimer > 0 && Math.floor(invincibleTimer * 10) % 2 === 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    // Engine flame
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00d9ff";

    ctx.fillStyle = "#00d9ff";
    ctx.beginPath();
    ctx.moveTo(-9, 17);
    ctx.lineTo(0, 38 + Math.random() * 8);
    ctx.lineTo(9, 17);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = "#813cff";
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.lineTo(-23, 20);
    ctx.lineTo(-8, 16);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(13, 8);
    ctx.lineTo(23, 20);
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();

    // Main body
    const bodyGradient = ctx.createLinearGradient(0, -25, 0, 20);
    bodyGradient.addColorStop(0, "#ffffff");
    bodyGradient.addColorStop(0.5, "#00d9ff");
    bodyGradient.addColorStop(1, "#1860dc");

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(15, 14);
    ctx.lineTo(0, 20);
    ctx.lineTo(-15, 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#141a55";
    ctx.beginPath();
    ctx.ellipse(0, -5, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

// Draw enemies
function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.shadowBlur = 18;
    ctx.shadowColor = enemy.color;

    // Enemy body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(0, 23);
    ctx.lineTo(20, -5);
    ctx.lineTo(10, -17);
    ctx.lineTo(0, -10);
    ctx.lineTo(-10, -17);
    ctx.lineTo(-20, -5);
    ctx.closePath();
    ctx.fill();

    // Enemy cockpit
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Spawn enemy
function spawnEnemy() {
    const colors = ["#ff386b", "#b44cff", "#ff9c3d"];

    const enemy = {
        x: 35 + Math.random() * (W - 70),
        y: -30,
        radius: 19,
        speed: 85 + level * 16,
        color: colors[Math.floor(Math.random() * colors.length)]
    };

    enemies.push(enemy);
}

// Shoot laser
function shoot() {
    bullets.push({
        x: player.x,
        y: player.y - 25,
        speed: 520,
        radius: 4
    });
}

// Create explosion particles
function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 160 + 40;

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6,
            maxLife: 0.6,
            color: color
        });
    }
}

// Update particles
function updateParticles(dt) {
    particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    particles = particles.filter(p => p.life > 0);
}

// Circle collision
function collision(a, b, radiusA, radiusB) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.hypot(dx, dy) < radiusA + radiusB;
}

// Update game
function update(dt) {
    if (!gameRunning || paused) return;

    // Player movement
    if (keys.ArrowLeft || keys.a) {
        player.x -= player.speed * dt;
    }

    if (keys.ArrowRight || keys.d) {
        player.x += player.speed * dt;
    }

    player.x = Math.max(25, Math.min(W - 25, player.x));

    // Shooting
    shootTimer -= dt;

    if (keys.Space && shootTimer <= 0) {
        shoot();
        shootTimer = 0.22;
    }

    // Player invincibility after a hit
    invincibleTimer = Math.max(0, invincibleTimer - dt);

    // Update bullets
    bullets.forEach(bullet => {
        bullet.y -= bullet.speed * dt;
    });

    bullets = bullets.filter(bullet => bullet.y > -10);

    // Spawn enemies
    enemyTimer += dt;

    const spawnDelay = Math.max(0.35, 1.1 - level * 0.08);

    if (enemyTimer >= spawnDelay) {
        spawnEnemy();
        enemyTimer = 0;
    }

    // Update enemies
    enemies.forEach(enemy => {
        enemy.y += enemy.speed * dt;
    });

    // Bullet-enemy collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        let destroyed = false;

        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];

            if (collision(enemy, bullet, enemy.radius, bullet.radius)) {
                bullets.splice(j, 1);
                createExplosion(enemy.x, enemy.y, enemy.color);

                enemies.splice(i, 1);

                score += 10;
                destroyed = true;
                break;
            }
        }

        if (destroyed) continue;

        // Enemy hits player
        if (
            invincibleTimer <= 0 &&
            collision(
                enemy,
                player,
                enemy.radius,
                19
            )
        ) {
            enemies.splice(i, 1);
            createExplosion(enemy.x, enemy.y, "#ff386b");
            loseLife();
            continue;
        }

        // Enemy escapes
        if (enemy.y > H + 30) {
            enemies.splice(i, 1);

            if (invincibleTimer <= 0) {
                loseLife();
            }
        }
    }

    // Update score and level
    level = Math.floor(score / 150) + 1;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("galaxyHighScore", highScore);
    }

    updateDashboard();
}

// Update dashboard
function updateDashboard() {
    scoreEl.textContent = formatScore(score);
    highScoreEl.textContent = formatScore(highScore);
    levelEl.textContent = String(level).padStart(2, "0");

    livesEl.textContent =
        "❤️".repeat(lives) + "🖤".repeat(3 - lives);
}

// Lose a life
function loseLife() {
    lives--;
    invincibleTimer = 1.5;

    createExplosion(player.x, player.y, "#00d9ff");

    updateDashboard();

    if (lives <= 0) {
        endGame();
    }
}

// Draw all game objects
function render(dt) {
    drawBackground(dt);

    // Bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = "#00f5ff";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#00d9ff";

        ctx.beginPath();
        ctx.ellipse(
            bullet.x,
            bullet.y,
            3,
            10,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    ctx.shadowBlur = 0;

    enemies.forEach(drawEnemy);

    drawPlayer();

    updateParticles(dt);
}

// Main animation loop
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
    lastTime = timestamp;

    if (!paused && gameRunning) {
        update(dt);
    }

    render(dt);

    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Start game
function startGame() {
    cancelAnimationFrame(animationId);

    score = 0;
    lives = 3;
    level = 1;

    bullets = [];
    enemies = [];
    particles = [];

    player.x = W / 2;
    enemyTimer = 0;
    shootTimer = 0;
    invincibleTimer = 0;

    Object.keys(keys).forEach(key => keys[key] = false);

    paused = false;
    gameOver = false;
    gameRunning = true;

    overlay.style.display = "none";

    pauseBtn.disabled = false;
    pauseBtn.textContent = "Ⅱ PAUSE";

    gameStatus.textContent = "MISSION IN PROGRESS";

    updateDashboard();

    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

// Game over
function endGame() {
    gameRunning = false;
    gameOver = true;

    cancelAnimationFrame(animationId);

    pauseBtn.disabled = true;
    gameStatus.textContent = "MISSION FAILED";

    overlay.style.display = "flex";

    overlayTitle.innerHTML = 'GAME <span>OVER</span>';

    overlayDescription.innerHTML =
        `Your final score: ${formatScore(score)}<br>
         You reached level ${level}.<br>
         The galaxy needs you again!`;

    startBtn.innerHTML = "TRY AGAIN ↻";
}

// Pause and resume
function togglePause() {
    if (!gameRunning) return;

    paused = !paused;

    if (paused) {
        pauseBtn.textContent = "▶ RESUME";
        gameStatus.textContent = "GAME PAUSED";

        overlay.style.display = "flex";
        overlayTitle.innerHTML = 'MISSION <span>PAUSED</span>';
        overlayDescription.textContent =
            "Your spaceship is waiting. Ready to continue?";
        startBtn.textContent = "RESUME MISSION →";

    } else {
        overlay.style.display = "none";
        pauseBtn.textContent = "Ⅱ PAUSE";
        gameStatus.textContent = "MISSION IN PROGRESS";
    }
}

// Keyboard controls
document.addEventListener("keydown", event => {
    const key = event.key;

    if (["ArrowLeft", "ArrowRight", " ", "ArrowUp", "ArrowDown"].includes(key)) {
        event.preventDefault();
    }

    if (key === "Enter" && !gameRunning) {
        startGame();
        return;
    }

    if (key.toLowerCase() === "p") {
        togglePause();
        return;
    }

    if (key === " ") {
        keys.Space = true;
    }

    keys[key] = true;
    keys[key.toLowerCase()] = true;
});

document.addEventListener("keyup", event => {
    keys[event.key] = false;
    keys[event.key.toLowerCase()] = false;

    if (event.key === " ") {
        keys.Space = false;
    }
});

// Button events
startBtn.addEventListener("click", () => {
    if (paused && gameRunning) {
        togglePause();
    } else {
        startGame();
    }
});

pauseBtn.addEventListener("click", togglePause);

restartBtn.addEventListener("click", startGame);

// Stop held keys if the browser loses focus
window.addEventListener("blur", () => {
    Object.keys(keys).forEach(key => keys[key] = false);
});

// Initial screen
updateDashboard();
render(0);

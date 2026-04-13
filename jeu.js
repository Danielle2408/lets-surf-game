(function() {
    
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            return this;
        };
    }

    window.addEventListener('DOMContentLoaded', () => {
        
        const titleScreen = document.getElementById('title-screen');
        const gameContainer = document.querySelector('.game-container');
        const startBtn = document.getElementById('start-btn');
        const personalizationBtn = document.getElementById('personalization-btn');
        const modal = document.getElementById('personalization-modal');
        const closeModal = document.getElementById('close-btn');
        const saveBtn = document.getElementById('save-btn');
        const pauseBtn = document.getElementById('pauseBtn');
        const restartBtn = document.getElementById('restartButton');
        const canvas = document.getElementById('gameCanvas');
        
        if (!canvas) return;
        
        const W = 1000, H = 600;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        
        
        let gameRunning = false;
        let paused = false;
        let distance = 0;
        let score = 0;
        let lives = 3;
        let baseSpeed = 3.2;
        let currentSpeed = baseSpeed;
        let maxSpeed = 12;
        
        const SURFER_W = 42, SURFER_H = 44;
        let surfer = { x: W/2 - SURFER_W/2, y: H - 100, width: SURFER_W, height: SURFER_H };
        let leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
        const MOVE_STEP = 6.5;
        
        let obstacles = [];
        let stars = [];
        let hearts = [];
        let kraken = { active: false, x: 0, y: 0, timer: 0, cooldown: 0, speed: 2.5 };
        
        let waveOffset = 0;
        let waveAmplitude = 12;
        let particles = [];
        let spawnCounter = 0;
        let spawnDelay = 45;
        
        let highScore = localStorage.getItem('surfHighScore') ? parseInt(localStorage.getItem('surfHighScore')) : 0;
        let currentMusic = 'none';
        let currentLang = 'fr';
        
        const distanceSpan = document.getElementById('distanceValue');
        const scoreSpan = document.getElementById('scoreValue');
        const livesSpan = document.getElementById('livesValue');
        const distanceLabelSpan = document.getElementById('distanceLabel');
        const scoreLabelSpan = document.getElementById('scoreLabel');
        const livesLabelSpan = document.getElementById('livesLabel');
        const controlsHintEl = document.querySelector('.controls-hint');
        
        const translations = {
            fr: {
                pause: '⏸️ PAUSE',
                resume: '▶️ REPRENDRE',
                distanceLabel: '🏄 DISTANCE : ',
                scoreLabel: '⭐ SCORE : ',
                livesLabel: '❤️ VIES : ',
                restartBtn: '🔄 NOUVELLE VAGUE',
                startBtn: '🏄‍♂️ DÉMARRER LA VAGUE 🏄‍♂️',
                personalizationBtn: '⚙️ PERSONNALISATION',
                modalTitle: 'Personnalisation',
                langLabel: 'Langue :',
                musicLabel: 'Musique :',
                saveBtn: 'Sauvegarder',
                closeBtn: 'Fermer',
                controlsHint: '🎮 ← → ↑ ↓ pour se déplacer | 🌟 Évite REQUINS, ROCHERS & TORTUES | ⭐ ÉTOILES +10 | ❤️ CŒUR +1 VIE | 🐙 KRAKEN (5s)',
                gameOver: '💀 GAME OVER',
                gameOverDistance: 'Distance : ',
                gameOverScore: 'Score : ',
                gameOverRecord: '🏆 Record : ',
                gameOverRestart: 'Clique sur NOUVELLE VAGUE',
                pauseTitle: '⏸ PAUSE',
                pauseHint: 'Appuie sur P ou bouton pour reprendre',
                controlsKeys: '← → ↑ ↓',
                controlsPause: 'P = Pause',
                record: '🏆 RECORD : ',
            },
            en: {
                pause: '⏸️ PAUSE',
                resume: '▶️ RESUME',
                distanceLabel: '🏄 DISTANCE: ',
                scoreLabel: '⭐ SCORE: ',
                livesLabel: '❤️ LIVES: ',
                restartBtn: '🔄 NEW WAVE',
                startBtn: '🏄‍♂️ START THE WAVE 🏄‍♂️',
                personalizationBtn: '⚙️ SETTINGS',
                modalTitle: 'Settings',
                langLabel: 'Language:',
                musicLabel: 'Music:',
                saveBtn: 'Save',
                closeBtn: 'Close',
                controlsHint: '🎮 ← → ↑ ↓ to move | 🌟 Avoid SHARKS, ROCKS & TURTLES | ⭐ STARS +10 | ❤️ HEART +1 LIFE | 🐙 KRAKEN (5s)',
                gameOver: '💀 GAME OVER',
                gameOverDistance: 'Distance: ',
                gameOverScore: 'Score: ',
                gameOverRecord: '🏆 Record: ',
                gameOverRestart: 'Click NEW WAVE to restart',
                pauseTitle: '⏸ PAUSE',
                pauseHint: 'Press P or button to resume',
                controlsKeys: '← → ↑ ↓',
                controlsPause: 'P = Pause',
                record: '🏆 RECORD: ',
            }
        };
        
        function applyTranslations() {
            const t = translations[currentLang] || translations['fr'];
            if (distanceLabelSpan) distanceLabelSpan.textContent = t.distanceLabel;
            if (scoreLabelSpan) scoreLabelSpan.textContent = t.scoreLabel;
            if (livesLabelSpan) livesLabelSpan.textContent = t.livesLabel;
            if (restartBtn) restartBtn.textContent = t.restartBtn;
            if (pauseBtn) pauseBtn.textContent = paused ? t.resume : t.pause;
            if (controlsHintEl) controlsHintEl.textContent = t.controlsHint;
            const startBtnEl = document.getElementById('start-btn');
            if (startBtnEl) startBtnEl.textContent = t.startBtn;
            if (personalizationBtn) personalizationBtn.textContent = t.personalizationBtn;
            const modalTitle = document.querySelector('#personalization-modal h2');
            if (modalTitle) modalTitle.textContent = t.modalTitle;
            const modalLabels = document.querySelectorAll('#personalization-modal label');
            if (modalLabels[0]) modalLabels[0].textContent = t.langLabel;
            if (modalLabels[1]) modalLabels[1].textContent = t.musicLabel;
            if (saveBtn) saveBtn.textContent = t.saveBtn;
            if (closeModal) closeModal.textContent = t.closeBtn;
            const htmlEl = document.querySelector('html');
            if (htmlEl) htmlEl.lang = currentLang;
        }

        function updateUI() {
            if (distanceSpan) distanceSpan.innerText = Math.floor(distance);
            if (scoreSpan) scoreSpan.innerText = score;
            if (livesSpan) livesSpan.innerText = lives;
        }
        
        function addScore(pts) {
            score += pts;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('surfHighScore', highScore);
            }
            updateUI();
        }
        
        function addDistance(m) {
            distance += m;
            updateUI();
            let speedBonus = Math.floor(distance / 350);
            currentSpeed = Math.min(maxSpeed, baseSpeed + speedBonus * 0.55);
        }
        
        function addLife() {
            if (lives < 5) lives++;
            updateUI();
        }
        
        function loseLife() {
            lives--;
            updateUI();
            addParticles(surfer.x + SURFER_W/2, surfer.y + SURFER_H/2, '#FF4444', 20);
            if (lives <= 0) {
                gameRunning = false;
                paused = false; // s'assurer que la pause n'est pas active
            } else {
                surfer.x = W/2 - SURFER_W/2;
                surfer.y = H - 100;
            }
        }
        
        function addParticles(x, y, color, count = 8) {
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: x + Math.random() * 20 - 10,
                    y: y + Math.random() * 20 - 10,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3 - 2,
                    life: 1,
                    color: color
                });
            }
        }
        
        function collide(r1, r2) {
            return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x ||
                     r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
        }
        
        function trySpawnKraken() {
            if (!gameRunning || paused) return;
            if (kraken.active) return;
            if (kraken.cooldown > 0) {
                kraken.cooldown--;
                return;
            }
            if (distance < 400) return;
            if (Math.random() < 0.007) {
                kraken.active = true;
                kraken.x = surfer.x - 80 + Math.random() * 160;
                kraken.y = surfer.y - 100;
                kraken.timer = 300;
                addParticles(kraken.x + 40, kraken.y + 40, '#AA3366', 25);
            }
        }
        
        function updateKraken() {
            if (!kraken.active) return;
            kraken.timer--;
            if (kraken.timer <= 0) {
                kraken.active = false;
                kraken.cooldown = 600;
                addParticles(kraken.x + 40, kraken.y + 40, '#AA3366', 20);
                return;
            }
            let dx = surfer.x + SURFER_W/2 - (kraken.x + 40);
            let dy = surfer.y + SURFER_H/2 - (kraken.y + 40);
            let dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                kraken.x += (dx / dist) * kraken.speed;
                kraken.y += (dy / dist) * kraken.speed;
            }
            let krakenRect = { x: kraken.x, y: kraken.y, width: 80, height: 80 };
            let surferRect = { x: surfer.x, y: surfer.y, width: SURFER_W, height: SURFER_H };
            if (collide(krakenRect, surferRect)) {
                loseLife();
                kraken.active = false;
                kraken.cooldown = 600;
                addParticles(kraken.x + 40, kraken.y + 40, '#FF4444', 30);
                if (!gameRunning) return;
            }
            kraken.x = Math.max(-50, Math.min(W - 30, kraken.x));
            kraken.y = Math.max(-50, Math.min(H + 100, kraken.y));
        }
        
        function spawnObject() {
            if (!gameRunning || paused) return;
            const rand = Math.random();
            const margin = 45;
            const x = margin + Math.random() * (W - 90);
            const y = -50;
            
            if (rand < 0.4) {
                const typeRand = Math.random();
                let typeObs;
                if (typeRand < 0.5) typeObs = 'shark';
                else if (typeRand < 0.8) typeObs = 'rock';
                else typeObs = 'turtle';
                let w, h;
                if (typeObs === 'shark') { w = 50; h = 34; }
                else if (typeObs === 'rock') { w = 44; h = 44; }
                else { w = 46; h = 38; }
                obstacles.push({
                    type: typeObs,
                    x: x, y: y,
                    w: w, h: h,
                    vy: currentSpeed,
                    vx: typeObs === 'turtle' ? (Math.random() - 0.5) * 1.2 : 0
                });
            } else if (rand < 0.7) {
                stars.push({ x: x, y: y, w: 30, h: 30, vy: currentSpeed });
            } else {
                hearts.push({ x: x, y: y, w: 28, h: 28, vy: currentSpeed });
            }
        }
        
        function updateGame() {
            if (!gameRunning || paused) return;
            
            if (leftPressed && surfer.x > 20) surfer.x -= MOVE_STEP;
            if (rightPressed && surfer.x < W - SURFER_W - 20) surfer.x += MOVE_STEP;
            if (upPressed && surfer.y > 50) surfer.y -= MOVE_STEP;
            if (downPressed && surfer.y < H - SURFER_H - 40) surfer.y += MOVE_STEP;
            
            addDistance(0.12 * currentSpeed);
            waveOffset = (waveOffset + currentSpeed * 0.6) % (Math.PI * 2);
            
            for (let o of obstacles) {
                o.y += o.vy;
                if (o.vx) o.x += o.vx;
                o.x = Math.max(10, Math.min(W - o.w - 10, o.x));
            }
            for (let s of stars) s.y += s.vy;
            for (let h of hearts) h.y += h.vy;
            
            const surferRect = { x: surfer.x, y: surfer.y, width: SURFER_W, height: SURFER_H };
            
            for (let i = 0; i < obstacles.length; i++) {
                const o = obstacles[i];
                if (collide(surferRect, { x: o.x, y: o.y, width: o.w, height: o.h })) {
                    loseLife();
                    obstacles.splice(i, 1);
                    i--;
                    if (!gameRunning) return;
                }
            }
            
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                if (collide(surferRect, { x: s.x, y: s.y, width: s.w, height: s.h })) {
                    addScore(10);
                    addParticles(s.x + s.w/2, s.y + s.h/2, '#FFD700', 12);
                    stars.splice(i, 1);
                    i--;
                }
            }
            
            for (let i = 0; i < hearts.length; i++) {
                const h = hearts[i];
                if (collide(surferRect, { x: h.x, y: h.y, width: h.w, height: h.h })) {
                    addLife();
                    addParticles(h.x + h.w/2, h.y + h.h/2, '#FF69B4', 12);
                    hearts.splice(i, 1);
                    i--;
                }
            }
            
            obstacles = obstacles.filter(o => o.y + o.h < H + 100);
            stars = stars.filter(s => s.y + s.h < H + 100);
            hearts = hearts.filter(h => h.y + h.h < H + 100);
            
            if (spawnCounter <= 0) {
                spawnObject();
                spawnDelay = Math.max(32, 72 - Math.floor(currentSpeed * 2.2));
                spawnCounter = spawnDelay;
            } else {
                spawnCounter--;
            }
            
            trySpawnKraken();
            updateKraken();
            
            for (let i = 0; i < particles.length; i++) {
                particles[i].x += particles[i].vx;
                particles[i].y += particles[i].vy;
                particles[i].life -= 0.02;
                if (particles[i].life <= 0) particles.splice(i, 1);
            }
        }
        
        
        function drawSea() {
            const gradSky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
            gradSky.addColorStop(0, '#0b5e7e');
            gradSky.addColorStop(1, '#1c8bbf');
            ctx.fillStyle = gradSky;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#FFD966';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(100, 80, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFFAA';
            ctx.beginPath();
            ctx.ellipse(300, 70, 50, 30, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(360, 60, 60, 35, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#1E6F9F';
            ctx.fillRect(0, H * 0.6, W, H * 0.4);
            ctx.beginPath();
            for (let x = 0; x <= W; x += 20) {
                let y = H * 0.6 + 18 + Math.sin(x * 0.018 + waveOffset) * waveAmplitude + Math.sin(x * 0.007 + waveOffset * 1.3) * 6;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.lineTo(0, H);
            ctx.fillStyle = '#2E86AB';
            ctx.fill();
            ctx.beginPath();
            for (let x = 0; x <= W; x += 18) {
                let y = H * 0.6 + 12 + Math.sin(x * 0.022 + waveOffset + 1.2) * 8;
                ctx.moveTo(x, y);
                ctx.lineTo(x + 6, y - 4);
            }
            ctx.strokeStyle = '#FFFFFFCC';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        
        function drawShark(x, y, w, h) {
            ctx.save();
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#3A6B8F';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2, w/2, h/2.4, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#2C5070';
            ctx.beginPath();
            ctx.moveTo(x + w*0.5, y - 8);
            ctx.lineTo(x + w*0.68, y + h*0.2);
            ctx.lineTo(x + w*0.32, y + h*0.2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x + w - 14, y + h*0.35, 5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + w - 15, y + h*0.33, 2.5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#FF4444';
            ctx.beginPath();
            ctx.moveTo(x + w - 8, y + h*0.55);
            ctx.lineTo(x + w - 4, y + h*0.62);
            ctx.lineTo(x + w - 12, y + h*0.62);
            ctx.fill();
            ctx.restore();
        }
        
        function drawRock(x, y, w, h) {
            ctx.fillStyle = '#6B5E4A';
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#4A3E2C';
            ctx.beginPath();
            ctx.ellipse(x + w/3, y + h/3, 6, 6, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#7D6E56';
            ctx.beginPath();
            ctx.ellipse(x + w*0.7, y + h*0.6, 5, 5, 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        function drawTurtle(x, y, w, h) {
            ctx.fillStyle = '#6B8E5A';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2, w/2, h/2.2, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#4A6E3A';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h/2.5, w/3, h/4, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#8B6E4A';
            ctx.beginPath();
            ctx.rect(x + w*0.7, y + h*0.3, 8, 12);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x + w*0.75, y + h*0.4, 2, 0, Math.PI*2);
            ctx.fill();
        }
        
        function drawSurfer(x, y, w, h) {
            ctx.save();
            let angle = Math.sin(x * 0.015 + waveOffset) * 0.1;
            ctx.translate(x + w/2, y + h/2);
            ctx.rotate(angle);
            ctx.translate(-(x + w/2), -(y + h/2));
            ctx.fillStyle = '#D48A3A';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h - 8, w*0.48, 9, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#B8732A';
            ctx.beginPath();
            ctx.ellipse(x + w/2, y + h - 4, w*0.52, 7, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#E85D3A';
            ctx.beginPath();
            ctx.roundRect(x + 6, y + h*0.35, w - 12, h*0.45, 10);
            ctx.fill();
            ctx.fillStyle = '#FCD7A0';
            ctx.beginPath();
            ctx.arc(x + w/2, y + h*0.27, w*0.3, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#2B2B2B';
            ctx.beginPath();
            ctx.ellipse(x + w/2 - 4, y + h*0.18, 10, 7, -0.2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.fillRect(x + w*0.33, y + h*0.21, 11, 6);
            ctx.fillRect(x + w*0.54, y + h*0.21, 11, 6);
            ctx.restore();
        }
        
        function drawStar(x, y, size) {
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'gold';
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            let spikes = 5, outer = size/2, inner = size/4.5;
            let step = Math.PI / spikes, rot = Math.PI/2*3;
            for (let i = 0; i < spikes; i++) {
                let x1 = x + size/2 + Math.cos(rot) * outer;
                let y1 = y + size/2 + Math.sin(rot) * outer;
                ctx.lineTo(x1, y1);
                rot += step;
                let x2 = x + size/2 + Math.cos(rot) * inner;
                let y2 = y + size/2 + Math.sin(rot) * inner;
                ctx.lineTo(x2, y2);
                rot += step;
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        function drawHeart(x, y, size) {
            ctx.fillStyle = '#FF3366';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            let xc = x + size/2, yc = y + size/2;
            ctx.moveTo(xc, yc + size/3);
            ctx.bezierCurveTo(xc, yc + size/3, xc - size/3, yc - size/4, xc, yc - size/2);
            ctx.bezierCurveTo(xc + size/3, yc - size/4, xc, yc + size/3, xc, yc + size/3);
            ctx.fill();
        }
        
        function drawKraken(x, y) {
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#7A2A5A';
            ctx.beginPath();
            ctx.ellipse(x + 40, y + 40, 38, 32, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#4A1A3A';
            for (let i = 0; i < 6; i++) {
                let angle = i * Math.PI*2/6 + Date.now() * 0.012;
                let tx = x + 40 + Math.cos(angle) * 48;
                let ty = y + 40 + Math.sin(angle) * 44;
                ctx.beginPath();
                ctx.moveTo(x + 40, y + 40);
                ctx.lineTo(tx, ty);
                ctx.lineTo(tx - 14, ty - 20);
                ctx.fill();
            }
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x + 30, y + 30, 12, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(x + 28, y + 28, 5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x + 26, y + 26, 2, 0, Math.PI*2);
            ctx.fill();
            if (kraken.active && kraken.timer > 0) {
                let percent = kraken.timer / 300;
                ctx.fillStyle = '#AA3366';
                ctx.fillRect(x + 15, y - 12, 70, 8);
                ctx.fillStyle = '#FF88CC';
                ctx.fillRect(x + 15, y - 12, 70 * percent, 8);
            }
            ctx.restore();
        }
        
        function drawParticles() {
            for (let p of particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 4, 4);
            }
            ctx.globalAlpha = 1;
        }
        
        function drawGameOver() {
            const t = translations[currentLang] || translations['fr'];
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#1E2F3A';
            ctx.shadowBlur = 10;
            ctx.fillRect(W/2 - 200, H/2 - 150, 400, 280);
            ctx.fillStyle = '#FFC857';
            ctx.font = 'bold 36px "Segoe UI"';
            ctx.fillText(t.gameOver, W/2 - 130, H/2 - 80);
            ctx.font = '24px monospace';
            ctx.fillStyle = 'white';
            ctx.fillText(t.gameOverDistance + Math.floor(distance) + " m", W/2 - 100, H/2 - 20);
            ctx.fillText(t.gameOverScore + score, W/2 - 60, H/2 + 30);
            ctx.fillText(t.gameOverRecord + highScore, W/2 - 90, H/2 + 80);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#DDD';
            ctx.fillText(t.gameOverRestart, W/2 - 120, H/2 + 140);
            ctx.shadowBlur = 0;
        }
        
        function drawPauseOverlay() {
            const t = translations[currentLang] || translations['fr'];
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);
            ctx.font = 'bold 46px "Segoe UI"';
            ctx.fillStyle = '#FFF';
            ctx.fillText(t.pauseTitle, W/2 - 90, H/2);
            ctx.font = '22px monospace';
            ctx.fillText(t.pauseHint, W/2 - 210, H/2 + 70);
        }
        
        function draw() {
            drawSea();
            for (let o of obstacles) {
                if (o.type === 'shark') drawShark(o.x, o.y, o.w, o.h);
                else if (o.type === 'rock') drawRock(o.x, o.y, o.w, o.h);
                else if (o.type === 'turtle') drawTurtle(o.x, o.y, o.w, o.h);
            }
            for (let s of stars) drawStar(s.x, s.y, s.w);
            for (let h of hearts) drawHeart(h.x, h.y, h.w);
            if (kraken.active) drawKraken(kraken.x, kraken.y);
            drawSurfer(surfer.x, surfer.y, SURFER_W, SURFER_H);
            drawParticles();
            
            const t = translations[currentLang] || translations['fr'];
            ctx.font = 'bold 18px monospace';
            ctx.fillStyle = '#FFF8E7';
            ctx.fillText(t.record + highScore, W - 190, 45);
            ctx.font = 'italic 15px sans-serif';
            ctx.fillStyle = '#C1E4FF';
            ctx.fillText(t.controlsKeys, 25, 55);
            ctx.fillText(t.controlsPause, 25, 85);
            
           
            if (!gameRunning) {
                drawGameOver();
            }
            if (paused && gameRunning) drawPauseOverlay();
        }
        
        function gameLoop() {
            updateGame();
            draw();
            requestAnimationFrame(gameLoop);
        }
        
        
        window.addEventListener('keydown', (e) => {
            if (!gameRunning) return;
            if (e.key === 'ArrowLeft') { leftPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowRight') { rightPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
            else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (!gameRunning) return;
                paused = !paused;
                if (pauseBtn) pauseBtn.textContent = paused ? translations[currentLang].resume : translations[currentLang].pause;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') leftPressed = false;
            if (e.key === 'ArrowRight') rightPressed = false;
            if (e.key === 'ArrowUp') upPressed = false;
            if (e.key === 'ArrowDown') downPressed = false;
        });
        
       
        let touchX = null, touchY = null;
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            const scaleY = H / rect.height;
            touchX = (e.touches[0].clientX - rect.left) * scaleX;
            touchY = (e.touches[0].clientY - rect.top) * scaleY;
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (touchX !== null && touchY !== null && gameRunning && !paused) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = W / rect.width;
                const scaleY = H / rect.height;
                const currentX = (e.touches[0].clientX - rect.left) * scaleX;
                const currentY = (e.touches[0].clientY - rect.top) * scaleY;
                const deltaX = currentX - touchX;
                const deltaY = currentY - touchY;
                surfer.x += deltaX;
                surfer.y += deltaY;
                surfer.x = Math.max(20, Math.min(W - SURFER_W - 20, surfer.x));
                surfer.y = Math.max(50, Math.min(H - SURFER_H - 40, surfer.y));
                touchX = currentX;
                touchY = currentY;
            }
        });
        canvas.addEventListener('touchend', () => { touchX = null; touchY = null; });
        
        function resetGame() {
            gameRunning = true;
            paused = false;
            distance = 0;
            score = 0;
            lives = 3;
            currentSpeed = baseSpeed;
            obstacles = [];
            stars = [];
            hearts = [];
            particles = [];
            kraken.active = false;
            kraken.cooldown = 0;
            kraken.timer = 0;
            surfer.x = W/2 - SURFER_W/2;
            surfer.y = H - 100;
            leftPressed = rightPressed = upPressed = downPressed = false;
            spawnCounter = 15;
            updateUI();
            if (pauseBtn) pauseBtn.textContent = translations[currentLang].pause;
        }
        
        function startGame() {
            if (titleScreen) titleScreen.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'flex';
            resetGame();
        }
        
        
        if (startBtn) startBtn.addEventListener('click', startGame);
        if (personalizationBtn) {
            personalizationBtn.addEventListener('click', () => { if (modal) modal.style.display = 'block'; });
        }
        if (closeModal) {
            closeModal.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const langSelect = document.getElementById('lang-select');
                if (langSelect) currentLang = langSelect.value;
                const musicSelect = document.getElementById('music-select');
                if (musicSelect) currentMusic = musicSelect.value;
                localStorage.setItem('surfLang', currentLang);
                localStorage.setItem('surfMusic', currentMusic);
                applyTranslations();
                const music1 = document.getElementById('music1');
                const music2 = document.getElementById('music2');
                if (music1) music1.pause();
                if (music2) music2.pause();
                if (currentMusic !== 'none') {
                    const musicElem = document.getElementById(currentMusic);
                    if (musicElem) musicElem.play().catch(e => console.log('Audio error', e));
                }
                if (modal) modal.style.display = 'none';
            });
        }
        if (restartBtn) restartBtn.addEventListener('click', () => {
            resetGame();
        });
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (!gameRunning) return;
                paused = !paused;
                pauseBtn.textContent = paused ? translations[currentLang].resume : translations[currentLang].pause;
            });
        }
        

        const savedLang = localStorage.getItem('surfLang') || 'fr';
        const savedMusic = localStorage.getItem('surfMusic') || 'none';
        const langSelect = document.getElementById('lang-select');
        if (langSelect) langSelect.value = savedLang;
        const musicSelect = document.getElementById('music-select');
        if (musicSelect) musicSelect.value = savedMusic;
        currentLang = savedLang;
        currentMusic = savedMusic;
        applyTranslations();
        if (currentMusic !== 'none') {
            const musicElem = document.getElementById(currentMusic);
            if (musicElem) musicElem.play().catch(e => console.log('Audio error', e));
        }
        
        gameLoop();
    });
})();
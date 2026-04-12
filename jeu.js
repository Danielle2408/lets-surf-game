<<<<<<< HEAD
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
        
        const translations = {
            fr: { pause: '⏸️ PAUSE', resume: '▶️ REPRENDRE' },
            en: { pause: '⏸️ PAUSE', resume: '▶️ RESUME' }
        };
        
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
        
        // ---------- DESSINS ----------
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
            // Overlay semi-transparent
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0, 0, W, H);
            // Fenêtre game over (style carte)
            ctx.fillStyle = '#1E2F3A';
            ctx.shadowBlur = 10;
            ctx.fillRect(W/2 - 200, H/2 - 150, 400, 280);
            ctx.fillStyle = '#FFC857';
            ctx.font = 'bold 36px "Segoe UI"';
            ctx.fillText("💀 GAME OVER", W/2 - 130, H/2 - 80);
            ctx.font = '24px monospace';
            ctx.fillStyle = 'white';
            ctx.fillText("Distance: " + Math.floor(distance) + " m", W/2 - 100, H/2 - 20);
            ctx.fillText("Score: " + score, W/2 - 60, H/2 + 30);
            ctx.fillText("🏆 Record: " + highScore, W/2 - 90, H/2 + 80);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#DDD';
            ctx.fillText("Clique sur NOUVELLE VAGUE", W/2 - 120, H/2 + 140);
            ctx.shadowBlur = 0;
        }
        
        function drawPauseOverlay() {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);
            ctx.font = 'bold 46px "Segoe UI"';
            ctx.fillStyle = '#FFF';
            ctx.fillText("⏸ PAUSE", W/2 - 90, H/2);
            ctx.font = '22px monospace';
            ctx.fillText("Appuie sur P ou bouton pour reprendre", W/2 - 210, H/2 + 70);
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
            
            ctx.font = 'bold 18px monospace';
            ctx.fillStyle = '#FFF8E7';
            ctx.fillText("🏆 RECORD: " + highScore, W - 190, 45);
            ctx.font = 'italic 15px sans-serif';
            ctx.fillStyle = '#C1E4FF';
            ctx.fillText("← → ↑ ↓", 25, 55);
            ctx.fillText("P = Pause", 25, 85);
            
            // Affichage du game over si le jeu est terminé
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
=======

(function() {
  
    const translations = {
        fr: {
            distance: "🏄 DISTANCE", lives: "❤️ VIES", speed: "🌊 VITESSE",
            gameOver: "🏁 GAME OVER", distanceM: "Distance: ", record: "Record: ",
            restartBtn: "🏄‍♂️ NOUVELLE VAGUE", recordLabel: "🏆 RECORD: "
        },
        en: {
            distance: "🏄 DISTANCE", lives: "❤️ LIVES", speed: "🌊 SPEED",
            gameOver: "🏁 GAME OVER", distanceM: "Distance: ", record: "Best: ",
            restartBtn: "🏄‍♂️ NEW WAVE", recordLabel: "🏆 BEST: "
        },
        de: {
            distance: "🏄 DISTANZ", lives: "❤️ LEBEN", speed: "🌊 GESCHW.",
            gameOver: "🏁 SPIEL VORBEI", distanceM: "Strecke: ", record: "Rekord: ",
            restartBtn: "🏄‍♂️ NEUE WELLE", recordLabel: "🏆 REKORD: "
        },
        es: {
            distance: "🏄 DISTANCIA", lives: "❤️ VIDAS", speed: "🌊 VELOC.",
            gameOver: "🏁 FIN DEL JUEGO", distanceM: "Distancia: ", record: "Récord: ",
            restartBtn: "🏄‍♂️ NUEVA OLA", recordLabel: "🏆 RÉCORD: "
        }
    };
    let currentLang = 'fr';
    function updateUITexts() {
        const t = translations[currentLang];
        if (!t) return;
        document.getElementById('distLabel').innerText = t.distance;
        document.getElementById('livesLabel').innerText = t.lives;
        document.getElementById('speedLabel').innerText = t.speed;
        document.getElementById('restartButton').innerText = t.restartBtn;
        document.getElementById('controlsHint').innerHTML = (currentLang === 'fr' ? "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Boost | ⭐❤️ bonus | ⏰ Événements chrono" :
                                                               currentLang === 'en' ? "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Boost | ⭐❤️ bonus | ⏰ Time events" :
                                                               currentLang === 'de' ? "🎮 ← → ↑ ↓ | 🌀 Strg/Shift Turbo | ⭐❤️ Bonus | ⏰ Zeitereignisse" :
                                                               "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Impulso | ⭐❤️ bonus | ⏰ Eventos de tiempo");
    }

 
    function applyThemeColor(color) {
        let primary = '#ffb347', bgGrad = 'radial-gradient(circle at 20% 30%, #0b2b44, #021526)';
        if (color === 'jaune') { primary = '#ffcc33'; bgGrad = 'radial-gradient(circle at 20% 30%, #5a4a1a, #2a2505)'; }
        else if (color === 'vert') { primary = '#44cc77'; bgGrad = 'radial-gradient(circle at 20% 30%, #1c4d2d, #062010)'; }
        else if (color === 'gris') { primary = '#a0aab5'; bgGrad = 'radial-gradient(circle at 20% 30%, #3a404a, #1a1e24)'; }
        else { primary = '#c97e5a'; bgGrad = 'radial-gradient(circle at 20% 30%, #11161f, #03070f)'; }
        document.body.style.background = bgGrad;
        const btns = document.querySelectorAll('.btn:not(.btn-secondary)');
        btns.forEach(btn => { btn.style.background = primary; });
        window.surfboardColor = color;
    }


    let audioElement = null;
    function loadMusic(file) {
        if (audioElement) { audioElement.pause(); audioElement = null; }
        if (!file) return;
        const url = URL.createObjectURL(file);
        audioElement = new Audio(url);
        audioElement.loop = true;
        audioElement.volume = 0.4;
        audioElement.play().catch(e => console.log("auto-play bloqué"));
    }
    function stopMusic() { if (audioElement) { audioElement.pause(); audioElement = null; } }


    let gameRunning = true;
    let animationId = null;
    let gameInitialized = false;
    let canvas, ctx, W = 1000, H = 600;
    let surfer, leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
    let distance = 0, lives = 3, baseSpeed = 3.2, currentSpeed, maxSpeed = 12;
    let obstacles = [], powerups = [], projectiles = [];
    let boostActive = false, boostTimer = 0, normalSpeed;
    let spawnCounter = 0, spawnDelay = 45;
    let highDistance = localStorage.getItem('surfHighDist') ? parseInt(localStorage.getItem('surfHighDist')) : 0;
    let waveOffset = 0, waveAmplitude = 10;
    let particles = [];

   
    let gameStartTime = 0;     
    let elapsedSeconds = 0;
    let lastOctopusTime = 0;  
    let sharkEventTriggered = false;
    let boatEventTriggered = false;
    let activeShark = null;     
    let activeBoat = null;    

    const timerSpan = document.getElementById('timerValue');
    const distanceSpan = document.getElementById('distanceValue');
    const livesSpan = document.getElementById('livesValue');
    const speedSpan = document.getElementById('speedValue');

    function updateUI() {
        distanceSpan.innerText = Math.floor(distance);
        livesSpan.innerText = lives;
        let dispSpeed = boostActive ? currentSpeed * 1.8 : currentSpeed;
        speedSpan.innerText = dispSpeed.toFixed(1);
        timerSpan.innerText = Math.floor(elapsedSeconds);
    }
    function addDistance(meters) {
        distance += meters;
        if (Math.floor(distance) > highDistance) {
            highDistance = Math.floor(distance);
            localStorage.setItem('surfHighDist', highDistance);
        }
        updateUI();
    }
    function addParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) particles.push({
            x: x + Math.random() * 20 - 10, y: y + Math.random() * 20 - 10,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 - 2,
            life: 1, color
        });
    }
    function activateBoost() {
        if (boostActive) return;
        boostActive = true;
        normalSpeed = currentSpeed;
        currentSpeed = Math.min(maxSpeed + 2, currentSpeed * 1.8);
        boostTimer = 180;
        addParticles(surfer.x + surfer.width / 2, surfer.y + surfer.height / 2, '#FFFFAA', 12);
        updateUI();
    }
    function loseLife() {
        lives--;
        updateUI();
        addParticles(surfer.x + surfer.width / 2, surfer.y + surfer.height / 2, '#FF6666', 15);
        if (lives <= 0) gameRunning = false;
        else { surfer.x = W / 2 - surfer.width / 2; surfer.y = H - 100; }
    }
    function updateSpeed() {
        if (boostActive) return;
        let speedBonus = Math.floor(distance / 400);
        currentSpeed = Math.min(maxSpeed, baseSpeed + speedBonus * 0.5);
        updateUI();
    }
    function collide(r1, r2) {
        return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x ||
                 r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
    }
    function spawnObject() {
        if (!gameRunning) return;
        const rand = Math.random();
        const margin = 40;
        const x = margin + Math.random() * (W - 80);
        const y = -50;
        if (rand < 0.55) {
            obstacles.push({ type: 'rock', x: x, y: y, w: 38, h: 34, vy: currentSpeed, angle: Math.random() * Math.PI * 2 });
        } else if (rand < 0.8) {
            obstacles.push({ type: 'octopus', x: x, y: y, w: 42, h: 38, vy: currentSpeed, tentacle: 0 });
        } else {
            const typePow = Math.random() < 0.6 ? 'star' : 'heart';
            powerups.push({ type: typePow, x: x, y: y, w: 28, h: 28, vy: currentSpeed });
        }
    }

   
    function triggerOctopusAttack() {
        if (!gameRunning) return;
       
        let side = Math.random() < 0.5 ? -1 : 1; 
        let startX = side === -1 ? -50 : W + 50;
        let targetY = surfer.y + surfer.height/2;
        let octo = {
            type: 'boss_octopus',
            x: startX,
            y: Math.min(H - 80, Math.max(50, targetY + (Math.random() - 0.5) * 100)),
            w: 70, h: 70,
            vx: (side === -1 ? 5 : -5),
            vy: 0,
            life: 1,
            attackCooldown: 0
        };
        obstacles.push(octo);
        addParticles(startX, octo.y, '#AA66FF', 20);
    }

    function triggerSharkEvent() {
        if (sharkEventTriggered || !gameRunning) return;
        sharkEventTriggered = true;
        activeShark = {
            x: W/2 - 40,
            y: 80,
            w: 80, h: 60,
            active: true,
            brickCooldown: 0,
            hp: 5
        };
        addParticles(activeShark.x + 40, activeShark.y + 30, '#FF4444', 25);
    }

    function triggerBoatEvent() {
        if (boatEventTriggered || !gameRunning) return;
        boatEventTriggered = true;
        activeBoat = {
            x: -150,
            y: H - 120,
            w: 140, h: 80,
            vx: 3,
            active: true,
            attackCooldown: 0
        };
    }

    function updateTimeEvents(now) {
        if (!gameRunning) return;
        let elapsed = (now - gameStartTime) / 1000;
        elapsedSeconds = elapsed;
        updateUI();

       
        if (elapsedSeconds - lastOctopusTime >= 10 && elapsedSeconds > 0) {
            lastOctopusTime = elapsedSeconds;
            triggerOctopusAttack();
        }

       
        if (!sharkEventTriggered && elapsedSeconds >= 30) {
            triggerSharkEvent();
        }

      
        if (!boatEventTriggered && elapsedSeconds >= 60) {
            triggerBoatEvent();
        }
    }

    function updateSpecialAttacks() {
        
        if (activeShark && activeShark.active) {
           
            let dx = surfer.x + surfer.width/2 - (activeShark.x + activeShark.w/2);
            activeShark.x += Math.sign(dx) * 1.5;
            activeShark.x = Math.max(20, Math.min(W - activeShark.w - 20, activeShark.x));
          
            if (activeShark.brickCooldown <= 0) {
                let brick = {
                    x: activeShark.x + activeShark.w/2 - 10,
                    y: activeShark.y + activeShark.h,
                    w: 20, h: 15,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 5,
                    type: 'brick'
                };
                projectiles.push(brick);
                activeShark.brickCooldown = 30;
            } else {
                activeShark.brickCooldown--;
            }
            
            if (collide({x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height},
                        {x: activeShark.x, y: activeShark.y, width: activeShark.w, height: activeShark.h})) {
                loseLife();
                activeShark.active = false; 
                addParticles(activeShark.x+40, activeShark.y+30, '#FF0000', 20);
            }
           
        }

       
        if (activeBoat && activeBoat.active) {
            activeBoat.x += activeBoat.vx;
            if (activeBoat.x > W + 200) activeBoat.active = false;
          
            if (collide({x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height},
                        {x: activeBoat.x, y: activeBoat.y, width: activeBoat.w, height: activeBoat.h})) {
                loseLife();
                activeBoat.active = false;
                addParticles(activeBoat.x+70, activeBoat.y+40, '#FF8844', 30);
            }
        }

    
        for (let i = 0; i < projectiles.length; i++) {
            let p = projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > H + 50 || p.x < -50 || p.x > W + 50) {
                projectiles.splice(i,1);
                i--;
                continue;
            }
            if (collide({x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height},
                        {x: p.x, y: p.y, width: p.w, height: p.h})) {
                loseLife();
                projectiles.splice(i,1);
                i--;
            }
        }
    }

  
    function updateGame() {
        if (!gameRunning) return;

        
        if (leftPressed && surfer.x > 20) surfer.x -= 7;
        if (rightPressed && surfer.x < W - surfer.width - 20) surfer.x += 7;
        if (upPressed && surfer.y > 50) surfer.y -= 7;
        if (downPressed && surfer.y < H - surfer.height - 30) surfer.y += 7;

        if (boostActive) { boostTimer--; if (boostTimer <= 0) { boostActive = false; currentSpeed = normalSpeed; updateUI(); } }
        addDistance(0.12 * currentSpeed);
        updateSpeed();
        waveOffset = (waveOffset + currentSpeed * 0.6) % (Math.PI * 2);

       
        for (let o of obstacles) { o.y += o.vy; if (o.type === 'octopus') o.tentacle = (o.tentacle + 0.15) % (Math.PI * 2); if (o.type === 'boss_octopus') { o.x += o.vx; o.y += o.vy; if (o.x < -100 || o.x > W+100) o.toRemove = true; } }
        for (let p of powerups) p.y += p.vy;

     
        const surferRect = { x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height };
        for (let i = 0; i < obstacles.length; i++) {
            let o = obstacles[i];
            if (collide(surferRect, { x: o.x, y: o.y, width: o.w, height: o.h })) {
                loseLife();
                obstacles.splice(i,1);
                i--;
                if (!gameRunning) return;
            }
        }
       
        for (let i = 0; i < powerups.length; i++) {
            let p = powerups[i];
            if (collide(surferRect, { x: p.x, y: p.y, width: p.w, height: p.h })) {
                if (p.type === 'star') { addDistance(20); addParticles(p.x + p.w/2, p.y + p.h/2, '#FFD700', 12); }
                else if (p.type === 'heart') { lives = Math.min(lives + 1, 5); addParticles(p.x + p.w/2, p.y + p.h/2, '#FF69B4', 12); updateUI(); }
                powerups.splice(i,1);
                i--;
            }
        }

     
        obstacles = obstacles.filter(o => o.y + o.h < H + 100 && !o.toRemove);
        powerups = powerups.filter(p => p.y + p.h < H + 100);

     
        if (spawnCounter <= 0) { spawnObject(); spawnDelay = Math.max(35, 75 - Math.floor(currentSpeed * 2.2)); spawnCounter = spawnDelay; }
        else spawnCounter--;

      
        for (let i = 0; i < particles.length; i++) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.02;
            if (particles[i].life <= 0) particles.splice(i,1);
        }
    }


    function drawSea() {
        let grad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
        grad.addColorStop(0, '#6fc3df'); grad.addColorStop(1, '#3282a7');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FFDD77'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(70, 65, 35, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#2b6d8f'; ctx.fillRect(0, H * 0.65, W, H * 0.35);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 20) {
            let y = H * 0.65 + 12 + Math.sin(x * 0.02 + waveOffset) * waveAmplitude + Math.sin(x * 0.008 + waveOffset * 1.5) * 5;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fillStyle = '#3994b3'; ctx.fill();
    }
    function drawRock(x, y, w, h) {
        ctx.fillStyle = '#6b5a4c'; ctx.shadowBlur = 3; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2, h/2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4f3e32'; ctx.beginPath(); ctx.ellipse(x + w/3, y + h/3, w/5, h/6, 0, 0, Math.PI * 2); ctx.fill();
    }
    function drawOctopus(x, y, w, h, angle) {
        ctx.fillStyle = '#b96f4a'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2.2, h/1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9b4a2c';
        for (let i = 0; i < 6; i++) { let off = Math.sin(angle + i) * 6; ctx.beginPath(); ctx.moveTo(x + w - 8, y + h/2); ctx.lineTo(x + w + 8 + off, y + h/2 - 8 + i*3); ctx.lineTo(x + w + 5 + off, y + h/2 + 5); ctx.fill(); }
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x + w - 10, y + h*0.35, 4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'black'; ctx.arc(x + w - 11, y + h*0.33, 2, 0, Math.PI*2); ctx.fill();
    }
    function drawBossOctopus(x, y, w, h) {
        ctx.fillStyle = '#AA66CC'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2.2, h/1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8822AA'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/3, h/3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(x + w - 15, y + h*0.35, 5, 0, Math.PI*2); ctx.fill();
        for (let i = 0; i < 8; i++) { ctx.fillRect(x + w/2 - 4 + i*2, y + h-12, 3, 12); }
    }
    function drawSurfer(x, y, w, h) {
        ctx.save(); ctx.shadowBlur = 2;
        let colorBoard = '#b57a3a';
        if (window.surfboardColor === 'jaune') colorBoard = '#f5d742';
        else if (window.surfboardColor === 'vert') colorBoard = '#6ac46e';
        else if (window.surfboardColor === 'gris') colorBoard = '#b0b6b0';
        ctx.fillStyle = colorBoard;
        ctx.beginPath(); ctx.ellipse(x + w/2, y + h - 8, w * 0.48, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F55B3C'; ctx.beginPath(); ctx.roundRect(x + 6, y + h*0.3, w - 12, h*0.5, 8); ctx.fill();
        ctx.fillStyle = '#FCD7A0'; ctx.beginPath(); ctx.arc(x + w/2, y + h*0.28, w*0.28, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2B2B2B'; ctx.beginPath(); ctx.ellipse(x + w/2 - 3, y + h*0.2, 8, 6, -0.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x + w/2 - 5, y + h*0.18, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
    function drawStar(x, y, s) { ctx.fillStyle = '#FFD700'; ctx.shadowBlur = 6; ctx.beginPath(); let step=Math.PI/5, rot=Math.PI/2*3; for(let i=0;i<5;i++){ let x1=x+s/2+Math.cos(rot)*s/2; let y1=y+s/2+Math.sin(rot)*s/2; ctx.lineTo(x1,y1); rot+=step; let x2=x+s/2+Math.cos(rot)*s/4; let y2=y+s/2+Math.sin(rot)*s/4; ctx.lineTo(x2,y2); rot+=step; } ctx.closePath(); ctx.fill(); }
    function drawHeart(x, y, s) { ctx.fillStyle = '#FF69B4'; ctx.beginPath(); let xc=x+s/2, yc=y+s/2; ctx.moveTo(xc, yc+s/3); ctx.bezierCurveTo(xc, yc-s/4, xc-s/3, yc-s/4, xc, yc-s/2); ctx.bezierCurveTo(xc+s/3, yc-s/4, xc, yc+s/3, xc, yc+s/3); ctx.fill(); }
    function drawShark(x, y, w, h) {
        ctx.fillStyle = '#4C7A9E'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2, h/2.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + w - 12, y + h*0.35, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x + w - 13, y + h*0.33, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#A8CBE1'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h/1.7, w/2.5, h/4, 0, 0, Math.PI*2); ctx.fill();
    }
    function drawBoat(x, y, w, h) {
        ctx.fillStyle = '#8B5A2B'; ctx.fillRect(x, y, w, h*0.6);
        ctx.fillStyle = '#D2B48C'; ctx.beginPath(); ctx.moveTo(x + w*0.2, y); ctx.lineTo(x + w*0.8, y); ctx.lineTo(x + w*0.5, y - h*0.5); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + w*0.7, y - 5, 10, 20);
    }
    function drawBrick(x, y, w, h) { ctx.fillStyle = '#AA5533'; ctx.fillRect(x, y, w, h); }
    function drawParticles() { for (let p of particles) { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); } ctx.globalAlpha = 1; }
    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
        ctx.font = 'bold 44px "Segoe UI"'; ctx.fillStyle = '#FFC857'; ctx.fillText(translations[currentLang].gameOver, W/2 - 140, H/2 - 60);
        ctx.font = '26px monospace'; ctx.fillStyle = 'white'; ctx.fillText(translations[currentLang].distanceM + Math.floor(distance) + " m", W/2 - 110, H/2 + 10);
        ctx.fillText(translations[currentLang].record + highDistance + " m", W/2 - 80, H/2 + 60);
    }
    function draw() {
        drawSea();
        for (let o of obstacles) {
            if (o.type === 'rock') drawRock(o.x, o.y, o.w, o.h);
            else if (o.type === 'octopus') drawOctopus(o.x, o.y, o.w, o.h, o.tentacle);
            else if (o.type === 'boss_octopus') drawBossOctopus(o.x, o.y, o.w, o.h);
        }
        for (let p of powerups) { if (p.type === 'star') drawStar(p.x, p.y, p.w); else drawHeart(p.x, p.y, p.w); }
        drawSurfer(surfer.x, surfer.y, surfer.width, surfer.height);
        if (activeShark && activeShark.active) drawShark(activeShark.x, activeShark.y, activeShark.w, activeShark.h);
        if (activeBoat && activeBoat.active) drawBoat(activeBoat.x, activeBoat.y, activeBoat.w, activeBoat.h);
        for (let proj of projectiles) { if (proj.type === 'brick') drawBrick(proj.x, proj.y, proj.w, proj.h); }
        drawParticles();
        ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#FFF8E7'; ctx.fillText(translations[currentLang].recordLabel + highDistance + " m", W - 190, 40);
        if (!gameRunning) drawGameOver();
    }

    function gameLoop(now) {
        if (gameRunning && gameStartTime > 0) updateTimeEvents(now);
        updateGame();
        updateSpecialAttacks();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        gameRunning = true;
        distance = 0; lives = 3; currentSpeed = baseSpeed;
        obstacles = []; powerups = []; projectiles = [];
        particles = [];
        boostActive = false; boostTimer = 0;
        surfer.x = W / 2 - surfer.width / 2; surfer.y = H - 100;
        leftPressed = rightPressed = upPressed = downPressed = false;
        spawnCounter = 10;
     
        gameStartTime = performance.now();
        elapsedSeconds = 0;
        lastOctopusTime = 0;
        sharkEventTriggered = false;
        boatEventTriggered = false;
        activeShark = null;
        activeBoat = null;
        updateUI();
    }

    
    function initGameObjects() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        canvas.width = W; canvas.height = H;
        surfer = { x: W / 2 - 18, y: H - 100, width: 36, height: 36 };
        currentSpeed = baseSpeed;
        normalSpeed = baseSpeed;
        resetGame();

        window.addEventListener('keydown', (e) => {
            if (gameWrapper.style.display === 'none') return;
>>>>>>> 52f9937f5e66e2a0e6edc0b8a1a478fb960ade62
            if (e.key === 'ArrowLeft') { leftPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowRight') { rightPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
<<<<<<< HEAD
            else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                if (!gameRunning) return;
                paused = !paused;
                if (pauseBtn) pauseBtn.textContent = paused ? translations[currentLang].resume : translations[currentLang].pause;
            }
=======
            else if (e.key === 'Control' || e.key === 'Shift') { activateBoost(); e.preventDefault(); }
>>>>>>> 52f9937f5e66e2a0e6edc0b8a1a478fb960ade62
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') leftPressed = false;
            if (e.key === 'ArrowRight') rightPressed = false;
            if (e.key === 'ArrowUp') upPressed = false;
            if (e.key === 'ArrowDown') downPressed = false;
        });
<<<<<<< HEAD
        
       
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
        if (currentMusic !== 'none') {
            const musicElem = document.getElementById(currentMusic);
            if (musicElem) musicElem.play().catch(e => console.log('Audio error', e));
        }
        
        gameLoop();
    });
})();
=======
        document.getElementById('restartButton').addEventListener('click', () => { resetGame(); });
        document.getElementById('menuButton').addEventListener('click', stopGameAndShowMenu);
    }

    const gameWrapper = document.getElementById('gameWrapper');
    function startGame() {
        if (!gameInitialized) { initGameObjects(); gameInitialized = true; }
        gameWrapper.style.display = 'flex';
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        resetGame();
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
    }
    function stopGameAndShowMenu() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        gameWrapper.style.display = 'none';
        document.getElementById('menuScreen').classList.remove('hidden');
    }

   
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('splashScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
    });
    document.getElementById('playButton').addEventListener('click', startGame);
    document.getElementById('helpButtonMenu').addEventListener('click', () => {
        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('helpScreen').classList.remove('hidden');
    });
    document.getElementById('customButtonMenu').addEventListener('click', () => {
        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('customScreen').classList.remove('hidden');
    });
    document.getElementById('backFromHelp').addEventListener('click', () => {
        document.getElementById('helpScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
    });
    document.getElementById('backFromCustom').addEventListener('click', () => {
        document.getElementById('customScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
    });

 
    document.getElementById('applyCustomBtn').addEventListener('click', () => {
        currentLang = document.getElementById('langSelect').value;
        updateUITexts();
        applyThemeColor(document.getElementById('colorSelect').value);
        const file = document.getElementById('musicFile').files[0];
        if (file) loadMusic(file);
    });
    document.getElementById('stopMusicBtn').addEventListener('click', stopMusic);

  
    updateUITexts();
    applyThemeColor('noir');
    window.surfboardColor = 'noir';
})();

>>>>>>> 52f9937f5e66e2a0e6edc0b8a1a478fb960ade62

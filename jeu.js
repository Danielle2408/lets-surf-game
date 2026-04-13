(function() {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let W, H, frame = 0, worldY = 0, score = 0;
    let gameRunning = false, gamePaused = false;
    let surferX, surferAngle = 0;
    let lives = 3, boosts = 3, invincibility = 0;
    
    let highScore = parseInt(localStorage.getItem('letsSurfRecord')) || 0;
    let currentBoardColor = '#FFD700', currentTheme = 'day';

    const sprites = {};
    let objects = [];
    const trail = [];
    // Le Kraken est configuré pour descendre vers le surfeur
    const kraken = { active: false, x: 0, dist: 0, speed: 1.5 };

    function createSprites() {
        const draw = (w, h, fn) => {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            fn(c.getContext('2d'), w, h);
            return c;
        };

        // Textures des obstacles
        sprites.rock = draw(60, 60, g => {
            g.fillStyle = '#444'; g.beginPath(); g.moveTo(10,55); g.lineTo(30,5); g.lineTo(55,55); g.fill();
            g.fillStyle = '#666'; g.beginPath(); g.moveTo(30,5); g.lineTo(55,55); g.lineTo(35,55); g.fill();
            g.strokeStyle = '#222'; g.beginPath(); g.moveTo(25,25); g.lineTo(35,45); g.stroke();
        });

        sprites.log = draw(85, 35, g => {
            g.fillStyle = '#5D4037'; g.fillRect(5, 8, 75, 20);
            g.strokeStyle = '#3E2723'; g.beginPath(); g.moveTo(10,15); g.lineTo(70,15); g.stroke();
        });

        sprites.island = draw(180, 180, g => {
            g.fillStyle = '#F0E68C'; g.beginPath(); g.arc(90, 110, 80, 0, 7); g.fill();
            g.fillStyle = '#D4C66A'; for(let i=0; i<30; i++) g.fillRect(Math.random()*140+20, Math.random()*80+70, 3, 3);
            g.fillStyle = '#795548'; g.fillRect(85, 45, 12, 50);
            g.fillStyle = '#2E7D32'; for(let a=0; a<5; a++) { g.save(); g.translate(91, 50); g.rotate(a*1.2); g.beginPath(); g.ellipse(20, 0, 25, 8, 0, 0, 7); g.fill(); g.restore(); }
        });

        sprites.surfer = () => draw(45, 85, g => {
            g.fillStyle = currentBoardColor; g.beginPath(); g.ellipse(20, 45, 12, 35, 0, 0, 7); g.fill();
            g.fillStyle = '#e0ac69'; g.beginPath(); g.arc(20, 25, 7, 0, 7); g.fill();
            g.fillStyle = '#333'; g.fillRect(12, 35, 16, 12);
        });

        sprites.heart = draw(40, 40, g => { g.fillStyle = '#ff3333'; g.beginPath(); g.arc(12,15,10,0,7); g.arc(28,15,10,0,7); g.lineTo(20,38); g.fill(); });
        sprites.boost = draw(40, 40, g => { g.fillStyle = '#FFEB3B'; g.beginPath(); g.moveTo(25,2); g.lineTo(10,22); g.lineTo(22,22); g.lineTo(15,38); g.lineTo(35,15); g.fill(); });
        
        sprites.kraken = draw(200, 200, g => {
            g.fillStyle = '#4A148C'; g.beginPath(); g.arc(100, 100, 80, 0, 7); g.fill();
            g.fillStyle = 'white'; g.beginPath(); g.arc(70, 80, 18, 0, 7); g.arc(130, 80, 18, 0, 7); g.fill();
            g.fillStyle = 'black'; g.beginPath(); g.arc(70, 80, 8, 0, 7); g.arc(130, 80, 8, 0, 7); g.fill();
            // Tentacules
            g.strokeStyle = '#4A148C'; g.lineWidth = 15;
            for(let i=0; i<8; i++) { g.beginPath(); g.moveTo(100,100); g.quadraticCurveTo(100+Math.cos(i)*120, 180, 100+Math.cos(i)*100, 200); g.stroke(); }
        });
    }

    function init() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        surferX = W / 2;
        updateUI();
        createSprites();
        setupEvents();
        requestAnimationFrame(loop);
    }

    function updateUI() {
        document.getElementById('bestScoreMenu').textContent = highScore;
        document.getElementById('distanceValue').textContent = score;
        document.getElementById('livesBox').innerHTML = '❤️'.repeat(lives);
        document.getElementById('boostBox').innerHTML = '⚡'.repeat(boosts);
    }

    function setupEvents() {
        document.getElementById('btnPlay').onclick = startGame;
        document.getElementById('btnRestart').onclick = startGame;
        document.getElementById('btnRestartPause').onclick = startGame;
        document.getElementById('pauseButton').onclick = togglePause;
        document.getElementById('btnResume').onclick = togglePause;
        document.getElementById('btnToMenuPause').onclick = () => { gameRunning = false; showOverlay('overlayMenu'); };
        document.getElementById('btnToMenu').onclick = () => showOverlay('overlayMenu');

        window.onkeydown = (e) => {
            if (e.code === 'ArrowLeft') surferAngle = -0.75;
            if (e.code === 'ArrowRight') surferAngle = 0.75;
            if (e.code === 'ArrowDown') useBoost();
            if (e.code === 'KeyP') togglePause();
        };
        window.onkeyup = (e) => { if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') surferAngle = 0; };
    }

    function showOverlay(id) {
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        if (id !== 'none') document.getElementById(id).classList.remove('hidden');
    }

    function startGame() {
        lives = 3; boosts = 3; score = 0; worldY = 0; objects = [];
        gameRunning = true; gamePaused = false; kraken.active = false;
        showOverlay('none');
        document.getElementById('hud').classList.remove('hidden');
    }

    function togglePause() {
        if (!gameRunning) return;
        gamePaused = !gamePaused;
        showOverlay(gamePaused ? 'overlayPause' : 'none');
    }

    function useBoost() {
        if (boosts > 0 && gameRunning && !gamePaused) { boosts--; worldY += 750; invincibility = 80; }
    }

    function spawn() {
        // Beaucoup d'obstacles (fréquence élevée)
        if (frame % 25 === 0) {
            let r = Math.random(), type = 'rock', col = 25;
            if (r > 0.88) { type = 'island'; col = 75; }
            else if (r > 0.55) { type = 'log'; col = 35; }
            let b = Math.random();
            if (b < 0.02) type = 'heart'; else if (b < 0.07) type = 'boost';
            objects.push({ x: Math.random() * W, wy: worldY + H, type: type, colRadius: col });
        }
        
        // Apparition du Kraken
        if (!kraken.active && frame > 600 && Math.random() < 0.003) {
            kraken.active = true; 
            // FIX : On calcule la distance pour qu'il apparaisse juste en haut du canvas
            // Le surfeur est à H * 0.35. Pour qu'il soit au bord haut (0), la distance doit être H*0.35.
            // On ajoute 100 pour qu'il soit légèrement "caché" au début.
            kraken.dist = (H * 0.35) + 100;
            kraken.x = surferX;
            document.getElementById('krakenWarning').classList.remove('hidden');
            setTimeout(() => document.getElementById('krakenWarning').classList.add('hidden'), 3500);
        }
    }

    function loop() {
        if (gameRunning && !gamePaused) {
            frame++;
            let speed = 7.5 + (worldY / 12000);
            worldY += Math.cos(surferAngle) * speed;
            surferX += Math.sin(surferAngle) * speed * 1.8;
            surferX = Math.max(25, Math.min(W - 25, surferX));

            if (kraken.active) {
                // Le Kraken se rapproche (réduit la distance)
                kraken.dist -= (kraken.speed + (score/5000));
                kraken.x += (surferX - kraken.x) * 0.04;
                
                let ky = (H * 0.35) - kraken.dist;
                objects.forEach(o => {
                    if (['rock', 'log', 'island'].includes(o.type)) {
                        let oy = H * 0.35 + (o.wy - worldY);
                        // Si le Kraken touche un obstacle, il fuit
                        if (Math.hypot(kraken.x - o.x, ky - oy) < o.colRadius + 65) kraken.active = false;
                    }
                });
                if (kraken.active && kraken.dist < 35) endGame("LE KRAKEN VOUS A DÉVORÉ !");
            }

            spawn();

            for (let i = objects.length - 1; i >= 0; i--) {
                let o = objects[i], sy = H * 0.35 + (o.wy - worldY);
                if (sy < -300) { objects.splice(i, 1); continue; }
                if (Math.hypot(surferX - o.x, H * 0.35 - sy) < o.colRadius + 15) {
                    if (o.type === 'heart') { lives = Math.min(5, lives+1); objects.splice(i, 1); }
                    else if (o.type === 'boost') { boosts = Math.min(5, boosts+1); objects.splice(i, 1); }
                    else if (invincibility <= 0) {
                        lives--; invincibility = 60; objects.splice(i, 1);
                        if (lives <= 0) endGame("WIPEOUT !");
                    }
                }
            }
            if (invincibility > 0) invincibility--;
            score = Math.floor(worldY / 50);
            trail.unshift({ x: surferX, wy: worldY }); if (trail.length > 30) trail.pop();
            updateUI();
        }
        draw();
        requestAnimationFrame(loop);
    }

    function endGame(reason) {
        gameRunning = false;
        document.getElementById('deathReason').textContent = reason;
        document.getElementById('finalDist').textContent = score;
        if (score > highScore) { highScore = score; localStorage.setItem('letsSurfRecord', highScore); document.getElementById('newRecordMsg').classList.remove('hidden'); }
        showOverlay('overlayGameOver');
    }

    function draw() {
        ctx.fillStyle = currentTheme === 'day' ? '#1aafe8' : '#0a1a2f';
        ctx.fillRect(0, 0, W, H);
        
        // Sillage du surfeur
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 5; ctx.beginPath();
        trail.forEach((p, i) => { let sy = H * 0.35 + (p.wy - worldY); if (i === 0) ctx.moveTo(p.x, sy); else ctx.lineTo(p.x, sy); });
        ctx.stroke();

        // Dessin des objets
        objects.forEach(o => { 
            let sy = H * 0.35 + (o.wy - worldY); 
            ctx.drawImage(sprites[o.type], o.x - sprites[o.type].width/2, sy - sprites[o.type].height/2); 
        });
        
        // Dessin du Kraken
        if (kraken.active) {
            let ky = (H * 0.35) - kraken.dist;
            ctx.drawImage(sprites.kraken, kraken.x - 100, ky - 100);
        }
        
        // Dessin du Surfeur
        ctx.save(); ctx.translate(surferX, H * 0.35); ctx.rotate(surferAngle);
        if (invincibility % 10 < 5) ctx.drawImage(sprites.surfer(), -22, -42);
        ctx.restore();
    }
    init();
})();
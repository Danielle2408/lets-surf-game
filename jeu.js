(function () {
    // ================================================================
    //  EDGE SURF · JS — Version améliorée
    //  Nouveautés : Pause (P/bouton), méduses, mines, bouteilles
    // ================================================================

    // ---------- BULLES DE FOND ----------
    (function spawnBgBubbles() {
        const container = document.getElementById('bgBubbles');
        for (let i = 0; i < 18; i++) {
            const b = document.createElement('div');
            b.className = 'bubble';
            const size = 16 + Math.random() * 50;
            b.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random()*100}%;
                animation-duration:${8+Math.random()*18}s;
                animation-delay:${Math.random()*12}s;
            `;
            container.appendChild(b);
        }
    })();

    // ---------- TRADUCTIONS ----------
    const translations = {
        fr: { distance: "🏄 DISTANCE", lives: "❤️ VIES", speed: "🌊 VITESSE", gameOver: "🏁 GAME OVER", distanceM: "Distance : ", record: "Record : ", restartBtn: "🔄 REJOUER", recordLabel: "🏆 RECORD: " },
        en: { distance: "🏄 DISTANCE", lives: "❤️ LIVES", speed: "🌊 SPEED", gameOver: "🏁 GAME OVER", distanceM: "Distance: ", record: "Best: ", restartBtn: "🔄 NEW WAVE", recordLabel: "🏆 BEST: " },
        de: { distance: "🏄 DISTANZ", lives: "❤️ LEBEN", speed: "🌊 GESCHW.", gameOver: "🏁 SPIEL VORBEI", distanceM: "Strecke: ", record: "Rekord: ", restartBtn: "🔄 NEUE WELLE", recordLabel: "🏆 REKORD: " },
        es: { distance: "🏄 DISTANCIA", lives: "❤️ VIDAS", speed: "🌊 VELOC.", gameOver: "🏁 FIN DEL JUEGO", distanceM: "Distancia: ", record: "Récord: ", restartBtn: "🔄 NUEVA OLA", recordLabel: "🏆 RÉCORD: " }
    };
    let currentLang = 'fr';

    function updateUITexts() {
        const t = translations[currentLang];
        if (!t) return;
        document.getElementById('distLabel').innerText = t.distance;
        document.getElementById('livesLabel').innerText = t.lives;
        document.getElementById('speedLabel').innerText = t.speed;
        document.getElementById('restartButton').innerText = t.restartBtn;
        const hints = { fr: "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Boost | ⏸ P = Pause | ⭐❤️ bonus | ⏰ Chrono", en: "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Boost | ⏸ P = Pause | ⭐❤️ bonus | ⏰ Time events", de: "🎮 ← → ↑ ↓ | 🌀 Strg/Shift Turbo | ⏸ P = Pause | ⭐❤️ Bonus | ⏰ Zeitereignisse", es: "🎮 ← → ↑ ↓ | 🌀 Ctrl/Shift Impulso | ⏸ P = Pausa | ⭐❤️ bonus | ⏰ Eventos" };
        document.getElementById('controlsHint').innerHTML = hints[currentLang] || hints.fr;
    }

    // ---------- THÈME ----------
    function applyThemeColor(color) {
        const themes = {
            noir:  { primary: '#ffb347', bg: 'radial-gradient(ellipse at 20% 30%, #0d3352 0%, #021526 55%, #000d18 100%)' },
            jaune: { primary: '#ffcc33', bg: 'radial-gradient(ellipse at 20% 30%, #5a4a1a 0%, #2a2505 55%, #0f0d02 100%)' },
            vert:  { primary: '#44cc77', bg: 'radial-gradient(ellipse at 20% 30%, #1c4d2d 0%, #062010 55%, #010d06 100%)' },
            gris:  { primary: '#a0aab5', bg: 'radial-gradient(ellipse at 20% 30%, #3a404a 0%, #1a1e24 55%, #0a0c0f 100%)' }
        };
        const th = themes[color] || themes.noir;
        document.body.style.background = th.bg;
        document.querySelectorAll('.btn:not(.btn-secondary):not(.btn-pause)').forEach(b => b.style.background = th.primary);
        document.documentElement.style.setProperty('--primary', th.primary);
        window.surfboardColor = color;
    }

    // ---------- MUSIQUE ----------
    let audioElement = null;
    function loadMusic(file) {
        if (audioElement) { audioElement.pause(); audioElement = null; }
        if (!file) return;
        audioElement = new Audio(URL.createObjectURL(file));
        audioElement.loop = true; audioElement.volume = 0.4;
        audioElement.play().catch(() => {});
    }
    function stopMusic() { if (audioElement) { audioElement.pause(); audioElement = null; } }

    // ---------- VARIABLES JEU ----------
    let gameRunning = true, isPaused = false;
    let animationId = null, gameInitialized = false;
    let canvas, ctx, W = 1000, H = 600;
    let surfer;
    let leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
    let distance = 0, lives = 3, baseSpeed = 3.2, currentSpeed, maxSpeed = 12;
    let obstacles = [], powerups = [], projectiles = [];
    let boostActive = false, boostTimer = 0, normalSpeed;
    let spawnCounter = 0, spawnDelay = 45;
    let highDistance = parseInt(localStorage.getItem('surfHighDist') || '0');
    let waveOffset = 0, waveAmplitude = 10;
    let particles = [], floatingTexts = [];

    // Événements chrono
    let gameStartTime = 0, pausedAt = 0, totalPausedTime = 0;
    let elapsedSeconds = 0, lastOctopusTime = 0;
    let sharkEventTriggered = false, boatEventTriggered = false;
    let activeShark = null, activeBoat = null;

    // Éléments UI
    const timerSpan    = document.getElementById('timerValue');
    const distanceSpan = document.getElementById('distanceValue');
    const livesSpan    = document.getElementById('livesValue');
    const speedSpan    = document.getElementById('speedValue');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const pauseButton  = document.getElementById('pauseButton');
    const gameWrapper  = document.getElementById('gameWrapper');

    function updateUI() {
        distanceSpan.innerText = Math.floor(distance);
        livesSpan.innerText = lives;
        speedSpan.innerText = (boostActive ? currentSpeed * 1.8 : currentSpeed).toFixed(1);
        timerSpan.innerText = Math.floor(elapsedSeconds);
    }
    function updateMenuRecord() {
        const el = document.getElementById('menuRecord');
        if (el) el.textContent = '🏆 Record : ' + highDistance + ' m';
    }
    function addDistance(m) {
        distance += m;
        if (Math.floor(distance) > highDistance) {
            highDistance = Math.floor(distance);
            localStorage.setItem('surfHighDist', highDistance);
        }
        updateUI();
    }

    // ---------- PARTICULES & TEXTES FLOTTANTS ----------
    function addParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) particles.push({
            x: x + Math.random() * 20 - 10, y: y + Math.random() * 20 - 10,
            vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 2,
            life: 1, size: 2 + Math.random() * 3, color
        });
    }
    function addFloatingText(x, y, text, color = '#FFD700') {
        floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
    }

    // ---------- PAUSE ----------
    function togglePause() {
        if (!gameRunning) return;
        isPaused = !isPaused;
        if (isPaused) {
            pausedAt = performance.now();
            pauseOverlay.classList.remove('hidden');
            canvas.classList.add('paused');
            pauseButton.textContent = '▶ REPRENDRE';
            pauseButton.classList.add('active');
        } else {
            totalPausedTime += performance.now() - pausedAt;
            pauseOverlay.classList.add('hidden');
            canvas.classList.remove('paused');
            pauseButton.textContent = '⏸ PAUSE';
            pauseButton.classList.remove('active');
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    // ---------- BOOST & VIE ----------
    function activateBoost() {
        if (boostActive || !gameRunning || isPaused) return;
        boostActive = true;
        normalSpeed = currentSpeed;
        currentSpeed = Math.min(maxSpeed + 2, currentSpeed * 1.8);
        boostTimer = 180;
        addParticles(surfer.x + surfer.width / 2, surfer.y + surfer.height / 2, '#FFFFAA', 16);
        addFloatingText(surfer.x + surfer.width / 2, surfer.y, 'BOOST!', '#FFEE44');
        updateUI();
    }
    function loseLife() {
        lives--;
        updateUI();
        addParticles(surfer.x + surfer.width / 2, surfer.y + surfer.height / 2, '#FF6666', 18);
        addFloatingText(surfer.x + surfer.width / 2, surfer.y, '-1❤️', '#FF4444');
        if (lives <= 0) { gameRunning = false; return; }
        surfer.x = W / 2 - surfer.width / 2;
        surfer.y = H - 100;
    }
    function updateSpeed() {
        if (boostActive) return;
        currentSpeed = Math.min(maxSpeed, baseSpeed + Math.floor(distance / 400) * 0.5);
        updateUI();
    }

    // ---------- COLLISION ----------
    function collide(r1, r2) {
        return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x ||
                 r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
    }

    // ---------- SPAWN OBSTACLES ----------
    // Types : rock, octopus, jellyfish (méduse), mine, bottle
    function spawnObject() {
        if (!gameRunning) return;
        const rand = Math.random();
        const x = 40 + Math.random() * (W - 80);
        const y = -55;
        const vy = currentSpeed;

        if (rand < 0.28) {
            // Rocher
            obstacles.push({ type: 'rock', x, y, w: 40, h: 36, vy, angle: Math.random() * Math.PI * 2 });
        } else if (rand < 0.48) {
            // Pieuvre
            obstacles.push({ type: 'octopus', x, y, w: 44, h: 40, vy, tentacle: 0 });
        } else if (rand < 0.62) {
            // Méduse — petite, rapide, translucide
            obstacles.push({ type: 'jellyfish', x, y, w: 30, h: 30, vy: vy * 1.2, pulse: 0, color: `hsl(${200+Math.random()*80}, 80%, 70%)` });
        } else if (rand < 0.73) {
            // Mine — lente, dangereuse
            obstacles.push({ type: 'mine', x, y, w: 32, h: 32, vy: vy * 0.7, rot: 0 });
        } else if (rand < 0.82) {
            // Bouteille — très petite, bonus furtif (peut faire perdre une vie si touchée)
            obstacles.push({ type: 'bottle', x, y, w: 16, h: 36, vy: vy * 1.1, bob: 0 });
        } else {
            // Power-up
            powerups.push({ type: Math.random() < 0.6 ? 'star' : 'heart', x, y, w: 28, h: 28, vy });
        }
    }

    // ---------- ÉVÉNEMENTS TEMPORELS ----------
    function triggerOctopusAttack() {
        if (!gameRunning) return;
        const side = Math.random() < 0.5 ? -1 : 1;
        const startX = side === -1 ? -60 : W + 60;
        obstacles.push({
            type: 'boss_octopus',
            x: startX, y: Math.random() * (H - 150) + 50,
            w: 72, h: 72, vx: side === -1 ? 5 : -5, vy: 0,
            life: 1
        });
        addParticles(startX, H / 2, '#AA66FF', 24);
        addFloatingText(W / 2, 100, '⚠ PIEUVRE GÉANTE!', '#CC44FF');
    }
    function triggerSharkEvent() {
        if (sharkEventTriggered || !gameRunning) return;
        sharkEventTriggered = true;
        activeShark = { x: W/2-40, y: 80, w: 80, h: 60, active: true, brickCooldown: 0, hp: 5 };
        addParticles(activeShark.x+40, activeShark.y+30, '#FF4444', 25);
        addFloatingText(W / 2, 80, '🦈 REQUIN!', '#FF3333');
    }
    function triggerBoatEvent() {
        if (boatEventTriggered || !gameRunning) return;
        boatEventTriggered = true;
        activeBoat = { x: -160, y: H-130, w: 145, h: 85, vx: 3, active: true };
        addFloatingText(W / 2, 120, '⛵ BATEAU!', '#FF8833');
    }
    function updateTimeEvents(now) {
        if (!gameRunning || isPaused) return;
        elapsedSeconds = (now - gameStartTime - totalPausedTime) / 1000;
        updateUI();
        if (elapsedSeconds - lastOctopusTime >= 10 && elapsedSeconds > 0) {
            lastOctopusTime = elapsedSeconds;
            triggerOctopusAttack();
        }
        if (!sharkEventTriggered && elapsedSeconds >= 30) triggerSharkEvent();
        if (!boatEventTriggered && elapsedSeconds >= 60) triggerBoatEvent();
    }

    // ---------- ATTAQUES SPÉCIALES ----------
    function updateSpecialAttacks() {
        if (activeShark && activeShark.active) {
            const dx = surfer.x + surfer.width/2 - (activeShark.x + activeShark.w/2);
            activeShark.x = Math.max(20, Math.min(W - activeShark.w - 20, activeShark.x + Math.sign(dx) * 1.5));
            if (activeShark.brickCooldown <= 0) {
                projectiles.push({ x: activeShark.x + activeShark.w/2 - 10, y: activeShark.y + activeShark.h, w: 20, h: 15, vx: (Math.random()-0.5)*2, vy: 5, type: 'brick' });
                activeShark.brickCooldown = 30;
            } else activeShark.brickCooldown--;
            if (collide({x:surfer.x,y:surfer.y,width:surfer.width,height:surfer.height},{x:activeShark.x,y:activeShark.y,width:activeShark.w,height:activeShark.h})) {
                loseLife(); activeShark.active = false; addParticles(activeShark.x+40, activeShark.y+30, '#FF0000', 20);
            }
        }
        if (activeBoat && activeBoat.active) {
            activeBoat.x += activeBoat.vx;
            if (activeBoat.x > W + 200) activeBoat.active = false;
            if (collide({x:surfer.x,y:surfer.y,width:surfer.width,height:surfer.height},{x:activeBoat.x,y:activeBoat.y,width:activeBoat.w,height:activeBoat.h})) {
                loseLife(); activeBoat.active = false; addParticles(activeBoat.x+70, activeBoat.y+40, '#FF8844', 30);
            }
        }
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.x += p.vx; p.y += p.vy;
            if (p.y > H+50 || p.x < -50 || p.x > W+50) { projectiles.splice(i,1); continue; }
            if (collide({x:surfer.x,y:surfer.y,width:surfer.width,height:surfer.height},{x:p.x,y:p.y,width:p.w,height:p.h})) {
                loseLife(); projectiles.splice(i,1);
            }
        }
    }

    // ---------- MISE À JOUR JEU ----------
    function updateGame() {
        if (!gameRunning || isPaused) return;

        if (leftPressed  && surfer.x > 20)                        surfer.x -= 7;
        if (rightPressed && surfer.x < W - surfer.width - 20)     surfer.x += 7;
        if (upPressed    && surfer.y > 50)                         surfer.y -= 7;
        if (downPressed  && surfer.y < H - surfer.height - 30)    surfer.y += 7;

        if (boostActive) { if (--boostTimer <= 0) { boostActive = false; currentSpeed = normalSpeed; updateUI(); } }
        addDistance(0.12 * currentSpeed);
        updateSpeed();
        waveOffset = (waveOffset + currentSpeed * 0.6) % (Math.PI * 2);

        // Mise à jour obstacles
        for (let o of obstacles) {
            o.y += o.vy;
            if (o.type === 'octopus')     o.tentacle = (o.tentacle + 0.15) % (Math.PI * 2);
            if (o.type === 'jellyfish')   { o.pulse = (o.pulse + 0.08) % (Math.PI * 2); }
            if (o.type === 'mine')        { o.rot = (o.rot + 0.03); }
            if (o.type === 'bottle')      { o.bob = (o.bob + 0.06) % (Math.PI * 2); }
            if (o.type === 'boss_octopus'){ o.x += o.vx; if (o.x < -110 || o.x > W+110) o.toRemove = true; }
        }
        for (let p of powerups) p.y += p.vy;

        // Collisions obstacles
        const sr = { x: surfer.x + 4, y: surfer.y + 4, width: surfer.width - 8, height: surfer.height - 6 };
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            if (collide(sr, { x: o.x, y: o.y, width: o.w, height: o.h })) {
                loseLife(); obstacles.splice(i, 1);
                if (!gameRunning) return;
            }
        }
        // Collisions powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            if (collide(sr, { x: p.x, y: p.y, width: p.w, height: p.h })) {
                if (p.type === 'star')  { addDistance(20); addParticles(p.x+p.w/2, p.y+p.h/2, '#FFD700', 14); addFloatingText(p.x+p.w/2, p.y, '+20m ⭐', '#FFD700'); }
                if (p.type === 'heart') { lives = Math.min(lives+1, 5); addParticles(p.x+p.w/2, p.y+p.h/2, '#FF69B4', 14); addFloatingText(p.x+p.w/2, p.y, '+1❤️', '#FF88BB'); updateUI(); }
                powerups.splice(i, 1);
            }
        }

        obstacles = obstacles.filter(o => o.y + o.h < H + 110 && !o.toRemove);
        powerups  = powerups.filter(p => p.y + p.h < H + 110);

        if (spawnCounter <= 0) {
            spawnObject();
            spawnDelay = Math.max(28, 75 - Math.floor(currentSpeed * 2.2));
            spawnCounter = spawnDelay;
        } else spawnCounter--;

        // Particules
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.022;
            if (p.life <= 0) particles.splice(i, 1);
        }
        // Textes flottants
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const f = floatingTexts[i];
            f.y += f.vy; f.life -= 0.016;
            if (f.life <= 0) floatingTexts.splice(i, 1);
        }
    }

    // ================================================================
    //  DESSIN
    // ================================================================

    function drawSea() {
        // Ciel dégradé
        const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        sky.addColorStop(0, '#5ec8e5');
        sky.addColorStop(0.5, '#3ca0c8');
        sky.addColorStop(1, '#1e6a94');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Soleil avec halo
        ctx.save();
        const sunGrad = ctx.createRadialGradient(80, 72, 5, 80, 72, 60);
        sunGrad.addColorStop(0,   'rgba(255,240,100,1)');
        sunGrad.addColorStop(0.4, 'rgba(255,210,60,0.85)');
        sunGrad.addColorStop(1,   'rgba(255,160,30,0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath(); ctx.arc(80, 72, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath(); ctx.arc(80, 72, 28, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Nuages
        drawCloud(ctx, 180, 45, 0.8);
        drawCloud(ctx, 550, 30, 1.1);
        drawCloud(ctx, 820, 55, 0.7);

        // Mer profonde
        const seaGrad = ctx.createLinearGradient(0, H*0.55, 0, H);
        seaGrad.addColorStop(0, '#2288b0');
        seaGrad.addColorStop(1, '#0d3a55');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);

        // Reflets soleil sur mer
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#fffbaa';
        for (let i = 0; i < 6; i++) {
            const rx = 60 + i * 40 + Math.sin(waveOffset + i) * 8;
            const ry = H * 0.58 + Math.cos(waveOffset * 0.7 + i) * 4;
            ctx.beginPath(); ctx.ellipse(rx, ry, 18 - i*2, 3, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // Vague principale animée
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
            const y = H * 0.63 + Math.sin(x * 0.018 + waveOffset) * waveAmplitude
                      + Math.sin(x * 0.007 + waveOffset * 1.6) * 5;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H);
        const waveFill = ctx.createLinearGradient(0, H*0.63, 0, H);
        waveFill.addColorStop(0, 'rgba(80,190,220,0.65)');
        waveFill.addColorStop(1, 'rgba(20,80,120,0.2)');
        ctx.fillStyle = waveFill;
        ctx.fill();

        // Petites vagues de détail
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1.5;
        for (let row = 0; row < 4; row++) {
            ctx.beginPath();
            for (let x = 0; x <= W; x += 8) {
                const y = H * (0.67 + row*0.07) + Math.sin(x * 0.025 + waveOffset * (1.2+row*0.2) + row) * 3;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function drawCloud(ctx, cx, cy, scale) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 22*scale, 0, Math.PI*2);
        ctx.arc(cx+30*scale, cy-8*scale, 18*scale, 0, Math.PI*2);
        ctx.arc(cx+55*scale, cy, 20*scale, 0, Math.PI*2);
        ctx.arc(cx+28*scale, cy+10*scale, 16*scale, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    // ---- Dessin obstacles ----
    function drawRock(x, y, w, h) {
        // Corps principal
        ctx.save();
        const rg = ctx.createRadialGradient(x+w*0.4, y+h*0.35, 2, x+w/2, y+h/2, w/2);
        rg.addColorStop(0, '#8a7060'); rg.addColorStop(1, '#3d2e22');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w/2, h/2.2, 0, 0, Math.PI*2); ctx.fill();
        // Reflet
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.ellipse(x+w*0.35, y+h*0.32, w*0.18, h*0.12, -0.5, 0, Math.PI*2); ctx.fill();
        // Crevasse
        ctx.strokeStyle = '#2a1e14'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x+w*0.45, y+h*0.3); ctx.lineTo(x+w*0.5, y+h*0.55); ctx.stroke();
        ctx.restore();
    }

    function drawOctopus(x, y, w, h, angle) {
        ctx.save();
        // Tentacules
        ctx.strokeStyle = '#8b3510'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
            const off = Math.sin(angle + i * 0.8) * 8;
            ctx.beginPath();
            ctx.moveTo(x+w/2, y+h*0.7);
            ctx.quadraticCurveTo(x+w/2+(i-3)*10, y+h+12+off, x+w/2+(i-3)*18, y+h+22+off);
            ctx.stroke();
        }
        // Corps
        const og = ctx.createRadialGradient(x+w*0.42, y+h*0.38, 3, x+w/2, y+h/2, w/2);
        og.addColorStop(0, '#e8834a'); og.addColorStop(1, '#a04020');
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w/2.1, h/1.8, 0, 0, Math.PI*2); ctx.fill();
        // Yeux
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x+w*0.35, y+h*0.38, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x+w*0.65, y+h*0.38, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x+w*0.35+1, y+h*0.38, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x+w*0.65+1, y+h*0.38, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawJellyfish(x, y, w, h, pulse, color) {
        ctx.save();
        const jelly = ctx.createRadialGradient(x+w/2, y+h*0.4, 2, x+w/2, y+h/2, w/2);
        jelly.addColorStop(0, color);
        jelly.addColorStop(1, 'rgba(100,150,255,0.1)');
        ctx.globalAlpha = 0.75;
        // Cloche pulsante
        const pulseW = w/2 * (1 + Math.sin(pulse) * 0.07);
        const pulseH = h/2 * (1 - Math.sin(pulse) * 0.07);
        ctx.fillStyle = jelly;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, pulseW, pulseH, 0, Math.PI, Math.PI*2); ctx.fill();
        // Tentacules fins
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        for (let i = 0; i < 5; i++) {
            const tx = x + w*0.2 + i*(w*0.15);
            const wave = Math.sin(pulse + i) * 4;
            ctx.beginPath(); ctx.moveTo(tx, y+h/2); ctx.lineTo(tx+wave, y+h+10+i*3); ctx.stroke();
        }
        // Détails lumineux
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(x+w*0.38, y+h*0.35, 4, 2, -0.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawMine(x, y, w, h, rot) {
        ctx.save();
        ctx.translate(x+w/2, y+h/2);
        ctx.rotate(rot);
        // Corps sphérique
        const mg = ctx.createRadialGradient(-w*0.15, -h*0.15, 2, 0, 0, w/2);
        mg.addColorStop(0, '#555'); mg.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(0, 0, w/2, 0, Math.PI*2); ctx.fill();
        // Pointes
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle)*w/2, Math.sin(angle)*h/2);
            ctx.lineTo(Math.cos(angle)*(w/2+6), Math.sin(angle)*(h/2+6));
            ctx.stroke();
        }
        // Reflet et œil rouge
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.ellipse(-4, -4, 6, 4, -0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff2200'; ctx.shadowBlur = 6; ctx.shadowColor = '#ff2200';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawBottle(x, y, w, h, bob) {
        ctx.save();
        const bobY = Math.sin(bob) * 3;
        ctx.translate(x+w/2, y+h/2+bobY);
        // Corps
        const bg = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        bg.addColorStop(0, 'rgba(80,180,80,0.85)');
        bg.addColorStop(1, 'rgba(30,90,30,0.85)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(-w/2, -h/3, w, h*0.7, [4, 4, 2, 2]);
        ctx.fill();
        // Goulot
        ctx.fillStyle = 'rgba(60,140,60,0.9)';
        ctx.fillRect(-w/4, -h/2, w/2, h/3);
        // Bouchon
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-w/4-1, -h/2-5, w/2+2, 6);
        // Reflet
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(-w*0.1, 0, 2, h*0.25, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawBossOctopus(x, y, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        // Tentacules géants
        ctx.strokeStyle = '#6622aa'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const a = (i/8)*Math.PI*2 + waveOffset;
            ctx.beginPath();
            ctx.moveTo(x+w/2, y+h/2);
            ctx.lineTo(x+w/2+Math.cos(a)*45, y+h/2+Math.sin(a)*45);
            ctx.stroke();
        }
        // Corps
        const bg = ctx.createRadialGradient(x+w*0.4, y+h*0.35, 4, x+w/2, y+h/2, w/2);
        bg.addColorStop(0, '#cc66ff'); bg.addColorStop(1, '#6600aa');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(x+w/2, y+h/2, w/2, 0, Math.PI*2); ctx.fill();
        // Yeux brillants
        ctx.fillStyle = 'red'; ctx.shadowBlur = 10; ctx.shadowColor = 'red';
        ctx.beginPath(); ctx.arc(x+w*0.35, y+h*0.4, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.65, y+h*0.4, 6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawSurfer(x, y, w, h) {
        ctx.save();
        const boardColors = { noir: '#c8803a', jaune: '#f5d742', vert: '#6ac46e', gris: '#b0b6b0' };
        const boardColor = boardColors[window.surfboardColor] || boardColors.noir;

        // Ombre sous la planche
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h+4, w*0.55, 5, 0, 0, Math.PI*2); ctx.fill();

        // Planche de surf
        const boardGrad = ctx.createLinearGradient(x, y+h*0.85, x+w, y+h);
        boardGrad.addColorStop(0, boardColor);
        boardGrad.addColorStop(1, shadeColor(boardColor, -30));
        ctx.fillStyle = boardGrad;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h-7, w*0.5, 8, 0, 0, Math.PI*2); ctx.fill();
        // Liseré de planche
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h-7, w*0.45, 6, 0, 0, Math.PI*2); ctx.stroke();

        // Corps (combinaison)
        const bodyGrad = ctx.createLinearGradient(x+w*0.1, y+h*0.25, x+w*0.9, y+h*0.8);
        bodyGrad.addColorStop(0, '#e05540'); bodyGrad.addColorStop(1, '#8a2010');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath(); ctx.roundRect(x+7, y+h*0.28, w-14, h*0.52, 7); ctx.fill();
        // Détail combinaison
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x+w/2, y+h*0.3); ctx.lineTo(x+w/2, y+h*0.75); ctx.stroke();

        // Bras
        ctx.fillStyle = '#F55B3C';
        ctx.beginPath(); ctx.ellipse(x+4, y+h*0.45, 5, 10, 0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+w-4, y+h*0.45, 5, 10, -0.4, 0, Math.PI*2); ctx.fill();

        // Tête + peau
        const headGrad = ctx.createRadialGradient(x+w/2-2, y+h*0.2, 2, x+w/2, y+h*0.25, w*0.28);
        headGrad.addColorStop(0, '#fce0b0'); headGrad.addColorStop(1, '#e8b878');
        ctx.fillStyle = headGrad;
        ctx.beginPath(); ctx.arc(x+w/2, y+h*0.25, w*0.28, 0, Math.PI*2); ctx.fill();

        // Cheveux
        ctx.fillStyle = '#2a1a0a';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h*0.14, w*0.27, w*0.14, 0, Math.PI, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+w/2-8, y+h*0.18, 6, 8, -0.3, 0, Math.PI*2); ctx.fill();

        // Yeux
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(x+w/2-5, y+h*0.22, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+w/2+5, y+h*0.22, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(x+w/2-4, y+h*0.22, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w/2+6, y+h*0.22, 1.5, 0, Math.PI*2); ctx.fill();

        // Sourire
        ctx.strokeStyle = '#a06030'; ctx.lineWidth = 1; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x+w/2-4, y+h*0.295);
        ctx.quadraticCurveTo(x+w/2, y+h*0.32, x+w/2+4, y+h*0.295);
        ctx.stroke();

        // Sillage boost
        if (boostActive) {
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#FFEE44'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x+w/2-10+i*6, y+h+2);
                ctx.lineTo(x+w/2-15+i*8, y+h+16+i*3);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    function shadeColor(hex, amount) {
        const num = parseInt(hex.replace('#',''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
        return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
    }

    function drawStar(x, y, s) {
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 10; ctx.shadowColor = '#FFCC00';
        ctx.beginPath();
        let rot = Math.PI/2*3, step = Math.PI/5;
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(x+s/2+Math.cos(rot)*s/2, y+s/2+Math.sin(rot)*s/2); rot+=step;
            ctx.lineTo(x+s/2+Math.cos(rot)*s/4, y+s/2+Math.sin(rot)*s/4); rot+=step;
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function drawHeart(x, y, s) {
        ctx.save();
        ctx.fillStyle = '#FF69B4'; ctx.shadowBlur = 8; ctx.shadowColor = '#FF44AA';
        const cx = x+s/2, cy = y+s/2;
        ctx.beginPath();
        ctx.moveTo(cx, cy+s/3);
        ctx.bezierCurveTo(cx, cy-s/4, cx-s/3, cy-s/4, cx, cy-s/2);
        ctx.bezierCurveTo(cx+s/3, cy-s/4, cx, cy+s/3, cx, cy+s/3);
        ctx.fill();
        ctx.restore();
    }

    function drawShark(x, y, w, h) {
        ctx.save();
        const sg = ctx.createLinearGradient(x, y, x+w, y+h);
        sg.addColorStop(0, '#5a8aae'); sg.addColorStop(1, '#2a5070');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w/2, h/2.5, 0, 0, Math.PI*2); ctx.fill();
        // Ventre
        ctx.fillStyle = 'rgba(220,240,255,0.7)';
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h*0.65, w*0.35, h*0.2, 0, 0, Math.PI*2); ctx.fill();
        // Aileron
        ctx.fillStyle = '#3a7090';
        ctx.beginPath(); ctx.moveTo(x+w*0.55, y+h*0.12); ctx.lineTo(x+w*0.7, y-10); ctx.lineTo(x+w*0.8, y+h*0.12); ctx.fill();
        // Oeil
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(x+w*0.75, y+h*0.35, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x+w*0.76, y+h*0.34, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawBoat(x, y, w, h) {
        ctx.save();
        // Coque
        const cg = ctx.createLinearGradient(x, y, x, y+h*0.6);
        cg.addColorStop(0, '#a0622a'); cg.addColorStop(1, '#5c3010');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w*0.85, y+h*0.6); ctx.lineTo(x+w*0.15, y+h*0.6); ctx.closePath();
        ctx.fill();
        // Pont
        ctx.fillStyle = '#c88040';
        ctx.fillRect(x+w*0.05, y, w*0.9, h*0.18);
        // Voile
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.moveTo(x+w*0.35, y); ctx.lineTo(x+w*0.35, y-h*0.65); ctx.lineTo(x+w*0.75, y); ctx.fill();
        ctx.fillStyle = 'rgba(200,60,50,0.85)';
        ctx.beginPath(); ctx.moveTo(x+w*0.35, y-h*0.65); ctx.lineTo(x+w*0.35, y-h*0.2); ctx.lineTo(x+w*0.6, y-h*0.35); ctx.fill();
        // Mât
        ctx.strokeStyle = '#5c3010'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x+w*0.35, y); ctx.lineTo(x+w*0.35, y-h*0.75); ctx.stroke();
        // Hublots
        ctx.fillStyle = '#ffeea0';
        ctx.beginPath(); ctx.arc(x+w*0.6, y+h*0.1, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.75, y+h*0.1, 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    function drawBrick(x, y, w, h) {
        ctx.save();
        ctx.fillStyle = '#994422';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#7a3218'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#bb6644';
        ctx.fillRect(x+1, y+1, w/2-2, h/2-2);
        ctx.restore();
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life * 0.9;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawFloatingTexts() {
        for (const f of floatingTexts) {
            ctx.save();
            ctx.globalAlpha = f.life;
            ctx.font = 'bold 16px Exo\\ 2, sans-serif';
            ctx.fillStyle = f.color;
            ctx.shadowBlur = 8; ctx.shadowColor = f.color;
            ctx.textAlign = 'center';
            ctx.fillText(f.text, f.x, f.y);
            ctx.restore();
        }
    }

    function drawGameOver() {
        // Fondu sombre
        ctx.fillStyle = 'rgba(0,5,15,0.88)';
        ctx.fillRect(0, 0, W, H);
        // Panneau central
        ctx.save();
        ctx.fillStyle = 'rgba(10,30,55,0.95)';
        ctx.strokeStyle = 'rgba(255,200,60,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(W/2-220, H/2-110, 440, 220, 28); ctx.fill(); ctx.stroke();
        // Titre
        ctx.font = 'bold 52px Bangers, cursive';
        ctx.fillStyle = '#FFC857';
        ctx.shadowBlur = 20; ctx.shadowColor = '#FFA020';
        ctx.textAlign = 'center';
        ctx.fillText(translations[currentLang].gameOver, W/2, H/2-42);
        ctx.shadowBlur = 0;
        // Distance
        ctx.font = 'bold 22px Exo\\ 2, sans-serif';
        ctx.fillStyle = '#e0f0ff';
        ctx.fillText(translations[currentLang].distanceM + Math.floor(distance) + ' m', W/2, H/2+10);
        // Record
        ctx.font = 'bold 18px Exo\\ 2, sans-serif';
        ctx.fillStyle = '#ffd966';
        ctx.fillText(translations[currentLang].record + highDistance + ' m', W/2, H/2+48);
        // Sous-texte
        ctx.font = '14px Exo\\ 2, sans-serif';
        ctx.fillStyle = '#6090b0';
        ctx.fillText('Appuie sur REJOUER pour recommencer', W/2, H/2+85);
        ctx.restore();
    }

    function drawPausedIndicator() {
        // Petit bandeau "EN PAUSE"
        ctx.save();
        ctx.fillStyle = 'rgba(0,10,25,0.72)';
        ctx.fillRect(W/2-80, 14, 160, 36);
        ctx.strokeStyle = 'rgba(80,160,255,0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(W/2-80, 14, 160, 36);
        ctx.fillStyle = '#60c0ff'; ctx.font = 'bold 18px Bangers, cursive';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⏸  EN PAUSE', W/2, 32);
        ctx.restore();
    }

    function draw() {
        drawSea();

        // Obstacles
        for (const o of obstacles) {
            if      (o.type === 'rock')        drawRock(o.x, o.y, o.w, o.h);
            else if (o.type === 'octopus')     drawOctopus(o.x, o.y, o.w, o.h, o.tentacle);
            else if (o.type === 'jellyfish')   drawJellyfish(o.x, o.y, o.w, o.h, o.pulse, o.color);
            else if (o.type === 'mine')        drawMine(o.x, o.y, o.w, o.h, o.rot);
            else if (o.type === 'bottle')      drawBottle(o.x, o.y, o.w, o.h, o.bob);
            else if (o.type === 'boss_octopus') drawBossOctopus(o.x, o.y, o.w, o.h);
        }
        // Power-ups
        for (const p of powerups) {
            if (p.type === 'star') drawStar(p.x, p.y, p.w); else drawHeart(p.x, p.y, p.w);
        }

        drawSurfer(surfer.x, surfer.y, surfer.width, surfer.height);

        if (activeShark && activeShark.active) drawShark(activeShark.x, activeShark.y, activeShark.w, activeShark.h);
        if (activeBoat  && activeBoat.active)  drawBoat(activeBoat.x, activeBoat.y, activeBoat.w, activeBoat.h);
        for (const proj of projectiles) { if (proj.type === 'brick') drawBrick(proj.x, proj.y, proj.w, proj.h); }

        drawParticles();
        drawFloatingTexts();

        // Record en haut à droite
        ctx.save();
        ctx.fillStyle = 'rgba(0,5,15,0.65)';
        ctx.beginPath(); ctx.roundRect(W-210, 12, 198, 32, 16); ctx.fill();
        ctx.font = 'bold 14px Exo\\ 2, monospace';
        ctx.fillStyle = '#ffd966'; ctx.textAlign = 'right';
        ctx.fillText(translations[currentLang].recordLabel + highDistance + ' m', W-18, 33);
        ctx.restore();

        if (isPaused) drawPausedIndicator();
        if (!gameRunning) drawGameOver();
    }

    // ================================================================
    //  BOUCLE PRINCIPALE
    // ================================================================
    function gameLoop(now) {
        if (isPaused) return;  // stoppe l'itération sans annuler le RAF
        if (gameRunning && gameStartTime > 0) updateTimeEvents(now);
        updateGame();
        updateSpecialAttacks();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        gameRunning = true; isPaused = false;
        distance = 0; lives = 3; currentSpeed = baseSpeed;
        obstacles = []; powerups = []; projectiles = []; particles = []; floatingTexts = [];
        boostActive = false; boostTimer = 0;
        spawnCounter = 10;
        gameStartTime = performance.now();
        totalPausedTime = 0; elapsedSeconds = 0; lastOctopusTime = 0;
        sharkEventTriggered = false; boatEventTriggered = false;
        activeShark = null; activeBoat = null;
        surfer.x = W/2 - surfer.width/2; surfer.y = H - 100;
        leftPressed = rightPressed = upPressed = downPressed = false;
        pauseOverlay.classList.add('hidden');
        canvas.classList.remove('paused');
        pauseButton.textContent = '⏸ PAUSE';
        pauseButton.classList.remove('active');
        updateUI();
    }

    // ================================================================
    //  INIT
    // ================================================================
    function initGameObjects() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        canvas.width = W; canvas.height = H;
        surfer = { x: W/2 - 18, y: H - 100, width: 36, height: 38 };
        currentSpeed = baseSpeed; normalSpeed = baseSpeed;
        resetGame();

        window.addEventListener('keydown', (e) => {
            if (gameWrapper.style.display === 'none') return;
            switch (e.key) {
                case 'ArrowLeft':  leftPressed  = true; e.preventDefault(); break;
                case 'ArrowRight': rightPressed = true; e.preventDefault(); break;
                case 'ArrowUp':    upPressed    = true; e.preventDefault(); break;
                case 'ArrowDown':  downPressed  = true; e.preventDefault(); break;
                case 'Control':
                case 'Shift': activateBoost(); e.preventDefault(); break;
                case 'p':
                case 'P':
                case 'Escape': togglePause(); e.preventDefault(); break;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft')  leftPressed  = false;
            if (e.key === 'ArrowRight') rightPressed = false;
            if (e.key === 'ArrowUp')    upPressed    = false;
            if (e.key === 'ArrowDown')  downPressed  = false;
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            if (isPaused) togglePause();
            resetGame();
            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(gameLoop);
        });
        document.getElementById('menuButton').addEventListener('click', stopGameAndShowMenu);
        pauseButton.addEventListener('click', togglePause);
        document.getElementById('resumeButton').addEventListener('click', togglePause);
        document.getElementById('pauseMenuButton').addEventListener('click', stopGameAndShowMenu);
    }

    function startGame() {
        if (!gameInitialized) { initGameObjects(); gameInitialized = true; }
        gameWrapper.style.display = 'flex';
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        resetGame();
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(gameLoop);
        updateMenuRecord();
    }
    function stopGameAndShowMenu() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        isPaused = false;
        pauseOverlay.classList.add('hidden');
        gameWrapper.style.display = 'none';
        document.getElementById('menuScreen').classList.remove('hidden');
        updateMenuRecord();
    }

    // ---- Navigation écrans ----
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('splashScreen').classList.add('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
        updateMenuRecord();
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

    // ---- Personnalisation ----
    document.getElementById('applyCustomBtn').addEventListener('click', () => {
        currentLang = document.getElementById('langSelect').value;
        updateUITexts();
        applyThemeColor(document.getElementById('colorSelect').value);
        const file = document.getElementById('musicFile').files[0];
        if (file) loadMusic(file);
    });
    document.getElementById('stopMusicBtn').addEventListener('click', stopMusic);

    // ---- Init globale ----
    updateUITexts();
    applyThemeColor('noir');
    window.surfboardColor = 'noir';
    updateMenuRecord();

})();

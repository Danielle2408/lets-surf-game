
(function() {
    // ---------- TRADUCTIONS ----------
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

    // ---------- GESTION COULEUR ----------
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

    // ---------- MUSIQUE ----------
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

    // ---------- VARIABLES JEU ----------
    let gameRunning = true;
    let animationId = null;
    let gameInitialized = false;
    let canvas, ctx, W = 1000, H = 600;
    let surfer, leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
    let distance = 0, lives = 3, baseSpeed = 3.2, currentSpeed, maxSpeed = 12;
    let obstacles = [], powerups = [], projectiles = []; // projectiles pour le requin
    let boostActive = false, boostTimer = 0, normalSpeed;
    let spawnCounter = 0, spawnDelay = 45;
    let highDistance = localStorage.getItem('surfHighDist') ? parseInt(localStorage.getItem('surfHighDist')) : 0;
    let waveOffset = 0, waveAmplitude = 10;
    let particles = [];

    // Gestion du temps et événements spéciaux
    let gameStartTime = 0;     // timestamp au début de la partie (performance.now)
    let elapsedSeconds = 0;
    let lastOctopusTime = 0;   // dernière apparition de pieuvre (en secondes)
    let sharkEventTriggered = false;
    let boatEventTriggered = false;
    let activeShark = null;     // { x, y, hp?, active, bricksCooldown }
    let activeBoat = null;      // { x, y, direction, active }

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
        elDistance.textContent = Math.floor(distance);
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

    // ---------- ÉVÉNEMENTS TEMPORELS ----------
    function triggerOctopusAttack() {
        if (!gameRunning) return;
        // Fait apparaître une pieuvre géante qui se déplace rapidement vers le joueur et le fait tomber
        let side = Math.random() < 0.5 ? -1 : 1; // gauche ou droite
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

        // Pieuvre toutes les 10 secondes
        if (elapsedSeconds - lastOctopusTime >= 10 && elapsedSeconds > 0) {
            lastOctopusTime = elapsedSeconds;
            triggerOctopusAttack();
        }

        // Requin à 30 secondes (une seule fois)
        if (!sharkEventTriggered && elapsedSeconds >= 30) {
            triggerSharkEvent();
        }

        // Bateau à 60 secondes
        if (!boatEventTriggered && elapsedSeconds >= 60) {
            triggerBoatEvent();
        }
    }

    function updateSpecialAttacks() {
        // Mise à jour du requin et de ses briques
        if (activeShark && activeShark.active) {
            // Suivre le joueur horizontalement
            let dx = surfer.x + surfer.width/2 - (activeShark.x + activeShark.w/2);
            activeShark.x += Math.sign(dx) * 1.5;
            activeShark.x = Math.max(20, Math.min(W - activeShark.w - 20, activeShark.x));
            // Tirer des briques toutes les 40 frames environ
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
            // Collision requin avec joueur = dégât
            if (collide({x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height},
                        {x: activeShark.x, y: activeShark.y, width: activeShark.w, height: activeShark.h})) {
                loseLife();
                activeShark.active = false; // disparaît après contact
                addParticles(activeShark.x+40, activeShark.y+30, '#FF0000', 20);
            }
            // Le requin peut être détruit par des collisions? (optionnel)
        }

        // Mise à jour du bateau
        if (activeBoat && activeBoat.active) {
            activeBoat.x += activeBoat.vx;
            if (activeBoat.x > W + 200) activeBoat.active = false;
            // Collision bateau -> joueur = perte de vie immédiate et le bateau disparaît
            if (collide({x: surfer.x, y: surfer.y, width: surfer.width, height: surfer.height},
                        {x: activeBoat.x, y: activeBoat.y, width: activeBoat.w, height: activeBoat.h})) {
                loseLife();
                activeBoat.active = false;
                addParticles(activeBoat.x+70, activeBoat.y+40, '#FF8844', 30);
            }
        }

        // Mise à jour des projectiles (briques)
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

    // ---------- MISE À JOUR STANDARD ----------
    function updateGame() {
        if (!gameRunning) return;

        // Mouvements
        if (leftPressed && surfer.x > 20) surfer.x -= 7;
        if (rightPressed && surfer.x < W - surfer.width - 20) surfer.x += 7;
        if (upPressed && surfer.y > 50) surfer.y -= 7;
        if (downPressed && surfer.y < H - surfer.height - 30) surfer.y += 7;

        if (boostActive) { boostTimer--; if (boostTimer <= 0) { boostActive = false; currentSpeed = normalSpeed; updateUI(); } }
        addDistance(0.12 * currentSpeed);
        updateSpeed();
        waveOffset = (waveOffset + currentSpeed * 0.6) % (Math.PI * 2);

        // Déplacement obstacles
        for (let o of obstacles) { o.y += o.vy; if (o.type === 'octopus') o.tentacle = (o.tentacle + 0.15) % (Math.PI * 2); if (o.type === 'boss_octopus') { o.x += o.vx; o.y += o.vy; if (o.x < -100 || o.x > W+100) o.toRemove = true; } }
        for (let p of powerups) p.y += p.vy;

        // Collisions avec obstacles
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
        // Collisions powerups
        for (let i = 0; i < powerups.length; i++) {
            let p = powerups[i];
            if (collide(surferRect, { x: p.x, y: p.y, width: p.w, height: p.h })) {
                if (p.type === 'star') { addDistance(20); addParticles(p.x + p.w/2, p.y + p.h/2, '#FFD700', 12); }
                else if (p.type === 'heart') { lives = Math.min(lives + 1, 5); addParticles(p.x + p.w/2, p.y + p.h/2, '#FF69B4', 12); updateUI(); }
                powerups.splice(i,1);
                i--;
            }
        }

        // Nettoyage
        obstacles = obstacles.filter(o => o.y + o.h < H + 100 && !o.toRemove);
        powerups = powerups.filter(p => p.y + p.h < H + 100);

        // Spawn classique
        if (spawnCounter <= 0) { spawnObject(); spawnDelay = Math.max(35, 75 - Math.floor(currentSpeed * 2.2)); spawnCounter = spawnDelay; }
        else spawnCounter--;

        // Particules
        for (let i = 0; i < particles.length; i++) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.02;
            if (particles[i].life <= 0) particles.splice(i,1);
        }
    }

    // ---------- DESSINS ----------
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
        // Réinitialisation événements temporels
        gameStartTime = performance.now();
        elapsedSeconds = 0;
        lastOctopusTime = 0;
        sharkEventTriggered = false;
        boatEventTriggered = false;
        activeShark = null;
        activeBoat = null;
        updateUI();
    }

    // Initialisation du jeu
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
            if (e.key === 'ArrowLeft') { leftPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowRight') { rightPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
            else if (e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
            else if (e.key === 'Control' || e.key === 'Shift') { activateBoost(); e.preventDefault(); }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') leftPressed = false;
            if (e.key === 'ArrowRight') rightPressed = false;
            if (e.key === 'ArrowUp') upPressed = false;
            if (e.key === 'ArrowDown') downPressed = false;
        });
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

    // Gestion des écrans
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

    // Personnalisation
    document.getElementById('applyCustomBtn').addEventListener('click', () => {
        currentLang = document.getElementById('langSelect').value;
        updateUITexts();
        applyThemeColor(document.getElementById('colorSelect').value);
        const file = document.getElementById('musicFile').files[0];
        if (file) loadMusic(file);
    });
    document.getElementById('stopMusicBtn').addEventListener('click', stopMusic);

    // Valeurs par défaut
    updateUITexts();
    applyThemeColor('noir');
    window.surfboardColor = 'noir';
})();


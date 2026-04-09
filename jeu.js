(function(){
    // ---------- CANVAS ----------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const W = 1000, H = 600;
    canvas.width = W; canvas.height = H;

    // ---------- PARAMÈTRES JEU ----------
    let distance = 0;
    let lives = 3;
    let gameRunning = true;
    let baseSpeed = 3.2;
    let currentSpeed = baseSpeed;
    let maxSpeed = 12;
    
    // Surfeur (mouvement complet)
    const SURFER_W = 36, SURFER_H = 36;
    let surfer = { x: W/2 - SURFER_W/2, y: H - 100, width: SURFER_W, height: SURFER_H };
    let leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
    const MOVE_STEP = 7;
    
    // Éléments du jeu
    let obstacles = [];      // requins
    let otherSurfers = [];
    let powerups = [];
    
    // Kraken cyclique
    let kraken = { 
        active: false, 
        x: 0, y: 0, 
        targetX: 0, targetY: 0,
        timer: 0,           // temps restant d'activité (frames)
        cooldown: 0,        // temps avant prochaine apparition
        speed: 2.2
    };
    
    // Vagues
    let waveOffset = 0;
    let waveAmplitude = 10;
    
    // Particules et effets
    let particles = [];
    
    // Boost (tournade)
    let boostActive = false;
    let boostTimer = 0;
    let normalSpeed = baseSpeed;
    
    // Spawn
    let spawnCounter = 0;
    let spawnDelay = 45;
    
    // High score
    let highDistance = localStorage.getItem('surfHighDist') ? parseInt(localStorage.getItem('surfHighDist')) : 0;
    
    // Pause
    let gamePaused = false;
    
    // UI
    const restartBtn = document.getElementById('restartButton');
    const pauseBtn = document.getElementById('pauseButton');
    
    // Variables UI (cachées une fois pour performance)
    const elDistance = document.getElementById('distanceValue');
    const elLivesBox = document.getElementById('livesBox');
    const elSpeed    = document.getElementById('speedValue');

    // Construit les 5 cœurs une fois au départ
    function buildHearts() {
        elLivesBox.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const h = document.createElement('span');
            h.className = 'heart';
            h.textContent = i < lives ? '❤️' : '🖤';
            elLivesBox.appendChild(h);
        }
    }

    // Met à jour l'affichage de chaque cœur selon `lives`
    function refreshHearts() {
        const hearts = elLivesBox.querySelectorAll('.heart');
        hearts.forEach((h, i) => {
            h.textContent = i < lives ? '❤️' : '🖤';
        });
    }

    function animateLostHeart() {
        refreshHearts();
        const hearts = elLivesBox.querySelectorAll('.heart');
        const target = hearts[lives]; // le cœur qui vient de passer à '🖤'
        if (target) {
            target.style.animation = 'none';
            target.offsetHeight; // reflow
            target.style.animation = 'heartLost 0.5s ease forwards';
        }
    }

    function animateGainHeart() {
        refreshHearts();
        const hearts = elLivesBox.querySelectorAll('.heart');
        const target = hearts[lives - 1]; // le cœur qui vient de passer à '❤️'
        if (target) {
            target.style.animation = 'none';
            target.offsetHeight;
            target.style.animation = 'heartPulse 0.4s ease';
        }
    }

    function updateUI() {
        elDistance.textContent = Math.floor(distance);
        elSpeed.textContent = (boostActive ? currentSpeed * 1.8 : currentSpeed).toFixed(1);
    }

    function addDistance(meters) {
        distance += meters;
        if (Math.floor(distance) > highDistance) {
            highDistance = Math.floor(distance);
            localStorage.setItem('surfHighDist', highDistance);
        }
        elDistance.textContent = Math.floor(distance);
    }
    
    function addParticles(x, y, color, count=8) {
        for(let i=0;i<count;i++) {
            particles.push({
                x: x + Math.random()*20 - 10,
                y: y + Math.random()*20 - 10,
                vx: (Math.random() - 0.5)*3,
                vy: (Math.random() - 0.5)*3 - 2,
                life: 1,
                color: color
            });
        }
    }
    
    function activateBoost() {
        if(boostActive) return;
        boostActive = true;
        normalSpeed = currentSpeed;
        currentSpeed = Math.min(maxSpeed + 2, currentSpeed * 1.8);
        boostTimer = 180;
        addParticles(surfer.x+SURFER_W/2, surfer.y+SURFER_H/2, '#88FFAA', 12);
        updateUI();
    }
    
    function loseLife() {
        lives--;
        animateLostHeart();
        addParticles(surfer.x+SURFER_W/2, surfer.y+SURFER_H/2, '#FF6666', 15);
        if(lives <= 0) {
            gameRunning = false;
        } else {
            surfer.x = W/2 - SURFER_W/2;
            surfer.y = H - 100;
        }
    }
    
    function updateSpeed() {
        if(boostActive) return;
        let speedBonus = Math.floor(distance / 400);
        currentSpeed = Math.min(maxSpeed, baseSpeed + speedBonus * 0.5);
        updateUI();
    }
    
    function collide(r1, r2) {
        return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x ||
                 r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
    }
    
    // ---------- SPAWN ----------
    function spawnObject() {
        if(!gameRunning) return;
        const rand = Math.random();
        const margin = 40;
        const x = margin + Math.random() * (W - 80);
        const y = -50;
        
        if(rand < 0.4) { // 40% requin (plus réaliste)
            obstacles.push({
                type: 'shark',
                x: x, y: y, w: 48, h: 32,
                vx: (Math.random() - 0.5)*1.5,
                vy: currentSpeed,
                angle: 0,
                tailAngle: 0
            });
        } else if(rand < 0.65) { // 25% autre surfeur
            otherSurfers.push({
                type: 'surfer',
                x: x, y: y, w: 32, h: 32,
                vx: (Math.random() - 0.5)*1.5,
                vy: currentSpeed * (0.8 + Math.random()*0.6)
            });
        } else { // 35% powerups
            const typePow = Math.random() < 0.6 ? 'star' : 'heart';
            powerups.push({
                type: typePow,
                x: x, y: y, w: 28, h: 28,
                vy: currentSpeed
            });
        }
    }
    
    // Gestion du Kraken cyclique
    function trySpawnKraken() {
        if(!gameRunning) return;
        if(kraken.active) return;
        if(kraken.cooldown > 0) {
            kraken.cooldown--;
            return;
        }
        // Distance minimale pour que le Kraken apparaisse (évite le début)
        if(distance < 200) return;
        // Probabilité d'apparition (toutes les 15-20 secondes en moyenne)
        if(Math.random() < 0.008) {
            kraken.active = true;
            kraken.x = surfer.x - 120 + Math.random() * 240;
            kraken.y = surfer.y - 100;
            kraken.targetX = surfer.x;
            kraken.targetY = surfer.y;
            kraken.timer = 300; // 5 secondes à 60fps
            addParticles(kraken.x+30, kraken.y+30, '#AA3366', 20);
        }
    }
    
    function updateKraken() {
        if(!kraken.active) return;
        
        // Diminuer le timer
        kraken.timer--;
        if(kraken.timer <= 0) {
            kraken.active = false;
            kraken.cooldown = 450; // 7.5 secondes avant réapparition
            addParticles(kraken.x+30, kraken.y+30, '#AA3366', 25);
            return;
        }
        
        // Poursuite du joueur
        let dx = surfer.x + SURFER_W/2 - (kraken.x + 30);
        let dy = surfer.y + SURFER_H/2 - (kraken.y + 30);
        let dist = Math.hypot(dx, dy);
        if(dist > 0.1) {
            kraken.x += (dx / dist) * kraken.speed;
            kraken.y += (dy / dist) * kraken.speed;
        }
        
        // Collision avec le surfeur
        let krakenRect = { x: kraken.x, y: kraken.y, width: 60, height: 60 };
        let surferRect = { x: surfer.x, y: surfer.y, width: SURFER_W, height: SURFER_H };
        if(collide(krakenRect, surferRect)) {
            loseLife();
            kraken.active = false;
            kraken.cooldown = 300;
            addParticles(kraken.x+30, kraken.y+30, '#FF4444', 30);
        }
        
        // Empêcher le Kraken de sortir trop loin
        kraken.x = Math.max(-50, Math.min(W - 30, kraken.x));
        kraken.y = Math.max(-50, Math.min(H + 100, kraken.y));
    }
    
    // ---------- MISE À JOUR ----------
    function updateGame() {
        if(!gameRunning || gamePaused) return;
        
        // Mouvement du surfeur
        if(leftPressed && surfer.x > 20) surfer.x -= MOVE_STEP;
        if(rightPressed && surfer.x < W - SURFER_W - 20) surfer.x += MOVE_STEP;
        if(upPressed && surfer.y > 50) surfer.y -= MOVE_STEP;
        if(downPressed && surfer.y < H - SURFER_H - 30) surfer.y += MOVE_STEP;
        
        // Gestion du boost
        if(boostActive) {
            boostTimer--;
            if(boostTimer <= 0) {
                boostActive = false;
                currentSpeed = normalSpeed;
                updateUI();
            }
        }
        
        addDistance(0.12 * currentSpeed);
        updateSpeed();
        waveOffset = (waveOffset + currentSpeed * 0.15) % (Math.PI * 2);
        
        // Mise à jour des requins (avec animation)
        for(let i=0; i<obstacles.length; i++) {
            let o = obstacles[i];
            o.y += o.vy;
            if(o.vx) o.x += o.vx;
            o.x = Math.max(10, Math.min(W - o.w - 10, o.x));
            // Animation de la queue
            o.tailAngle = (o.tailAngle || 0) + 0.2;
        }
        
        // Mise à jour des autres surfeurs
        for(let i=0; i<otherSurfers.length; i++) {
            let s = otherSurfers[i];
            s.y += s.vy;
            if(s.vx) s.x += s.vx;
            s.x = Math.max(15, Math.min(W - s.w - 15, s.x));
        }
        
        // Mise à jour des powerups
        for(let p of powerups) p.y += p.vy;
        
        // Collisions
        const surferRect = { x: surfer.x, y: surfer.y, width: SURFER_W, height: SURFER_H };
        
        // Requins
        for(let i=0; i<obstacles.length; i++) {
            const o = obstacles[i];
            if(collide(surferRect, { x: o.x, y: o.y, width: o.w, height: o.h })) {
                loseLife();
                obstacles.splice(i,1);
                i--;
                if(!gameRunning) return;
            }
        }
        
        // Autres surfeurs
        for(let i=0; i<otherSurfers.length; i++) {
            const s = otherSurfers[i];
            if(collide(surferRect, { x: s.x, y: s.y, width: s.w, height: s.h })) {
                loseLife();
                otherSurfers.splice(i,1);
                i--;
                if(!gameRunning) return;
            }
        }
        
        // Powerups
        for(let i=0; i<powerups.length; i++) {
            const p = powerups[i];
            if(collide(surferRect, { x: p.x, y: p.y, width: p.w, height: p.h })) {
                if(p.type === 'star') {
                    addDistance(20);
                    addParticles(p.x+p.w/2, p.y+p.h/2, '#FFD700', 12);
                } else if(p.type === 'heart') {
                    lives = Math.min(lives + 1, 5);
                    animateGainHeart();
                    addParticles(p.x+p.w/2, p.y+p.h/2, '#FF69B4', 12);
                }
                powerups.splice(i,1);
                i--;
            }
        }
        
        // Nettoyage
        obstacles = obstacles.filter(o => o.y + o.h < H + 100);
        otherSurfers = otherSurfers.filter(s => s.y + s.h < H + 100);
        powerups = powerups.filter(p => p.y + p.h < H + 100);
        
        // Spawn
        if(spawnCounter <= 0) {
            spawnObject();
            spawnDelay = Math.max(35, 75 - Math.floor(currentSpeed * 2.5));
            spawnCounter = spawnDelay;
        } else {
            spawnCounter--;
        }
        
        // Kraken cyclique
        trySpawnKraken();
        updateKraken();
        
        // Particules
        for(let i=0; i<particles.length; i++) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.02;
            if(particles[i].life <= 0) particles.splice(i,1);
        }
    }
    
    // ---------- DESSIN (requins réalistes, Kraken amélioré) ----------
    function drawSea() {
        let gradSky = ctx.createLinearGradient(0,0,0,H*0.6);
        gradSky.addColorStop(0,'#87CEEB');
        gradSky.addColorStop(1,'#3A7CA5');
        ctx.fillStyle = gradSky;
        ctx.fillRect(0,0,W,H);
        
        ctx.fillStyle = '#FFD966';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(80,70,40,0,Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#1E6F9F';
        ctx.fillRect(0,H*0.6,W,H*0.4);
        
        ctx.beginPath();
        for(let x=0; x<=W; x+=20) {
            let y = H*0.6 + 15 + Math.sin(x*0.015 + waveOffset)*4 + Math.sin(x*0.006 + waveOffset*0.7)*2;
            if(x===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        }
        ctx.lineTo(W,H);
        ctx.lineTo(0,H);
        ctx.fillStyle = '#2E86AB';
        ctx.fill();
        
        ctx.beginPath();
        for(let x=0; x<=W; x+=15) {
            let y = H*0.6 + 10 + Math.sin(x*0.018 + waveOffset+1)*2.5;
            ctx.moveTo(x,y);
            ctx.lineTo(x+5,y-2);
        }
        ctx.strokeStyle = '#FFFFFFAA';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    function drawRealisticShark(x, y, w, h, tailAngle) {
        ctx.save();
        ctx.shadowBlur = 3;
        // Corps principal
        ctx.fillStyle = '#4C7A9E';
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2.5, 0, 0, Math.PI*2);
        ctx.fill();
        // Ventre plus clair
        ctx.fillStyle = '#A8CBE1';
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/1.7, w/2.5, h/4, 0, 0, Math.PI*2);
        ctx.fill();
        // Nageoire dorsale
        ctx.fillStyle = '#3A6080';
        ctx.beginPath();
        ctx.moveTo(x + w*0.5, y - 8);
        ctx.lineTo(x + w*0.65, y + h*0.2);
        ctx.lineTo(x + w*0.35, y + h*0.2);
        ctx.fill();
        // Nageoire caudale (queue) animée
        let angle = tailAngle || 0;
        let tailOffset = Math.sin(angle) * 8;
        ctx.fillStyle = '#3A6080';
        ctx.beginPath();
        ctx.moveTo(x + w - 5, y + h/2);
        ctx.lineTo(x + w + 15 + tailOffset, y + h/2 - 12);
        ctx.lineTo(x + w + 15 - tailOffset, y + h/2 + 12);
        ctx.fill();
        // Œil
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + w - 12, y + h*0.35, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + w - 13, y + h*0.33, 2.5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + w - 14, y + h*0.31, 1, 0, Math.PI*2);
        ctx.fill();
        // Branchies
        ctx.strokeStyle = '#2A4A6A';
        ctx.lineWidth = 1.5;
        for(let i=0;i<3;i++) {
            ctx.beginPath();
            ctx.moveTo(x + w*0.7, y + h*0.45 + i*6);
            ctx.lineTo(x + w*0.8, y + h*0.5 + i*5);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    function drawSurfer(x,y,w,h, isEnemy=false) {
        ctx.save();
        let angle = Math.sin(x*0.02 + waveOffset)*0.08;
        ctx.translate(x+w/2, y+h/2);
        ctx.rotate(angle);
        ctx.translate(-(x+w/2), -(y+h/2));
        
        ctx.fillStyle = isEnemy ? '#6B4C3B' : '#C27E3A';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h-6, w*0.45, 7, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = isEnemy ? '#8B634A' : '#E5A455';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h-3, w*0.5, 6, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = isEnemy ? '#4A8B5C' : '#F55B3C';
        ctx.beginPath();
        ctx.roundRect(x+5, y+h*0.35, w-10, h*0.45, 8);
        ctx.fill();
        ctx.fillStyle = isEnemy ? '#D4A87A' : '#FCD7A0';
        ctx.beginPath();
        ctx.arc(x+w/2, y+h*0.28, w*0.28, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = isEnemy ? '#1A2A1A' : '#2B2B2B';
        ctx.beginPath();
        ctx.ellipse(x+w/2-3, y+h*0.2, 9, 6, -0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(x+w*0.33, y+h*0.22, 9, 5);
        ctx.fillRect(x+w*0.55, y+h*0.22, 9, 5);
        ctx.restore();
    }
    
    function drawStar(x,y,size) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'gold';
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        let spikes = 5;
        let outer = size/2;
        let inner = size/4;
        let step = Math.PI / spikes;
        let rot = Math.PI/2*3;
        for(let i=0; i<spikes; i++) {
            let x1 = x + size/2 + Math.cos(rot)*outer;
            let y1 = y + size/2 + Math.sin(rot)*outer;
            ctx.lineTo(x1,y1);
            rot += step;
            let x2 = x + size/2 + Math.cos(rot)*inner;
            let y2 = y + size/2 + Math.sin(rot)*inner;
            ctx.lineTo(x2,y2);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    function drawHeart(x,y,size) {
        ctx.fillStyle = '#FF69B4';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        let xc = x + size/2;
        let yc = y + size/2;
        ctx.moveTo(xc, yc + size/3);
        ctx.bezierCurveTo(xc, yc + size/3, xc - size/3, yc - size/4, xc, yc - size/2);
        ctx.bezierCurveTo(xc + size/3, yc - size/4, xc, yc + size/3, xc, yc + size/3);
        ctx.fill();
    }
    
    function drawKraken(x,y) {
        ctx.save();
        ctx.fillStyle = '#8B2252';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(x+30, y+30, 32, 28, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#5C1A3A';
        for(let i=0; i<6; i++) {
            let angle = i * Math.PI*2/6 + Date.now() * 0.01;
            let tx = x+30 + Math.cos(angle)*42;
            let ty = y+30 + Math.sin(angle)*38;
            ctx.beginPath();
            ctx.moveTo(x+30, y+30);
            ctx.lineTo(tx, ty);
            ctx.lineTo(tx-12, ty-18);
            ctx.fill();
        }
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x+22, y+22, 9, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(x+20, y+20, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x+18, y+18, 1.5, 0, Math.PI*2);
        ctx.fill();
        // Barre de temps restant
        if(kraken.active && kraken.timer > 0) {
            let percent = kraken.timer / 300;
            ctx.fillStyle = '#AA3366';
            ctx.fillRect(x+5, y-10, 50, 6);
            ctx.fillStyle = '#FF88CC';
            ctx.fillRect(x+5, y-10, 50 * percent, 6);
        }
        ctx.restore();
    }
    
    function drawParticles() {
        for(let p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1;
    }
    
    function drawPause() {
        ctx.fillStyle = 'rgba(0, 10, 30, 0.75)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = 'bold 52px "Segoe UI"';
        ctx.fillStyle = '#FFD966';
        ctx.textAlign = 'center';
        ctx.fillText("⏸ PAUSE", W/2, H/2 - 30);
        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#C1E4FF';
        ctx.fillText("Appuie sur P pour reprendre", W/2, H/2 + 30);
        ctx.textAlign = 'left';
    }

    // Zone cliquable du bouton Rejouer sur le canvas
    let replayBtnRect = null;

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0,0,W,H);
        ctx.textAlign = 'center';
        ctx.font = 'bold 46px "Segoe UI"';
        ctx.fillStyle = '#FFC857';
        ctx.fillText("🏁 GAME OVER", W/2, H/2 - 80);
        ctx.font = '28px monospace';
        ctx.fillStyle = 'white';
        ctx.fillText("Distance: "+Math.floor(distance)+" m", W/2, H/2 - 20);
        ctx.fillText("Record: "+highDistance+" m", W/2, H/2 + 30);

        // Bouton Rejouer sur le canvas
        const btnW = 240, btnH = 54;
        const btnX = W/2 - btnW/2;
        const btnY = H/2 + 70;
        replayBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

        ctx.fillStyle = '#ff9f2e';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff9f2e55';
        roundRect(ctx, btnX, btnY, btnW, btnH, 30);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 22px "Segoe UI"';
        ctx.fillStyle = '#1e2f3a';
        ctx.fillText("🏄‍♂️ REJOUER", W/2, btnY + 36);
        ctx.textAlign = 'left';
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    
    function draw() {
        drawSea();
        for(let o of obstacles) {
            drawRealisticShark(o.x, o.y, o.w, o.h, o.tailAngle);
        }
        for(let s of otherSurfers) drawSurfer(s.x, s.y, s.w, s.h, true);
        for(let p of powerups) {
            if(p.type === 'star') drawStar(p.x, p.y, p.w);
            else drawHeart(p.x, p.y, p.w);
        }
        drawSurfer(surfer.x, surfer.y, SURFER_W, SURFER_H, false);
        if(kraken.active) drawKraken(kraken.x, kraken.y);
        drawParticles();
        
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#FFF8E7';
        ctx.shadowBlur = 2;
        ctx.fillText("🏆 RECORD: "+highDistance+" m", W-180, 40);
        ctx.font = 'italic 14px sans-serif';
        ctx.fillStyle = '#C1E4FF';
        ctx.fillText("← → ↑ ↓ SURF", 20, 50);
        ctx.fillText("Ctrl/Shift = Boost", 20, 75);
        
        if(!gameRunning) drawGameOver();
        if(gamePaused && gameRunning) drawPause();
    }
    
    // ---------- BOUCLE PRINCIPALE ----------
    function gameLoop() {
        updateGame();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // ---------- CONTROLES ----------
    window.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowLeft') { leftPressed = true; e.preventDefault(); }
        else if(e.key === 'ArrowRight') { rightPressed = true; e.preventDefault(); }
        else if(e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
        else if(e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
        else if(e.key === 'Control' || e.key === 'Shift') { activateBoost(); e.preventDefault(); }
        else if(e.key === 'r' || e.key === 'R') { resetGame(); e.preventDefault(); }
        else if(e.key === 'p' || e.key === 'P') { togglePause(); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
        if(e.key === 'ArrowLeft') leftPressed = false;
        if(e.key === 'ArrowRight') rightPressed = false;
        if(e.key === 'ArrowUp') upPressed = false;
        if(e.key === 'ArrowDown') downPressed = false;
    });
    
    // Tactile
    let touchX = null, touchY = null;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        touchX = (e.touches[0].clientX - rect.left) * (W/rect.width);
        touchY = (e.touches[0].clientY - rect.top) * (H/rect.height);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if(touchX !== null && touchY !== null) {
            let rect = canvas.getBoundingClientRect();
            let currentX = (e.touches[0].clientX - rect.left) * (W/rect.width);
            let currentY = (e.touches[0].clientY - rect.top) * (H/rect.height);
            let deltaX = currentX - touchX;
            let deltaY = currentY - touchY;
            surfer.x += deltaX;
            surfer.y += deltaY;
            surfer.x = Math.max(20, Math.min(W - SURFER_W - 20, surfer.x));
            surfer.y = Math.max(50, Math.min(H - SURFER_H - 30, surfer.y));
            touchX = currentX;
            touchY = currentY;
        }
    });
    canvas.addEventListener('touchend', () => { touchX = null; touchY = null; });
    
    function togglePause() {
        if(!gameRunning) return;
        gamePaused = !gamePaused;
        pauseBtn.textContent = gamePaused ? '▶ REPRENDRE' : '⏸ PAUSE';
    }

    canvas.addEventListener('click', (e) => {
        if(gameRunning) return;
        if(!replayBtnRect) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);
        const b = replayBtnRect;
        if(mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            resetGame();
        }
    });

    function resetGame() {
        gameRunning = true;
        distance = 0;
        lives = 3;
        currentSpeed = baseSpeed;
        obstacles = [];
        otherSurfers = [];
        powerups = [];
        particles = [];
        kraken.active = false;
        kraken.cooldown = 0;
        kraken.timer = 0;
        boostActive = false;
        gamePaused = false;
        pauseBtn.textContent = '⏸ PAUSE';
        surfer.x = W/2 - SURFER_W/2;
        surfer.y = H - 100;
        leftPressed = rightPressed = upPressed = downPressed = false;
        spawnCounter = 10;
        buildHearts();
        updateUI();
    }
    
    restartBtn.addEventListener('click', resetGame);
    pauseBtn.addEventListener('click', togglePause);
    resetGame();
    gameLoop();
})();
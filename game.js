(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // ── Responsive sizing ──────────────────────────────────────────────
  const BASE_W = 800;
  const BASE_H = 480;
  let scale = 1;

  function resize() {
    const sw = window.innerWidth / BASE_W;
    const sh = window.innerHeight / BASE_H;
    scale = Math.min(sw, sh);
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    canvas.style.width = BASE_W * scale + 'px';
    canvas.style.height = BASE_H * scale + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Constants ──────────────────────────────────────────────────────
  const GRAVITY = 0.55;
  const JUMP_FORCE = -13;
  const MOVE_ACCEL = 0.8;
  const FRICTION = 0.82;
  const MAX_SPEED = 5.5;
  const GROUND_Y = BASE_H - 48;
  const WORLD_WIDTH = 4800;

  // ── State ──────────────────────────────────────────────────────────
  let gameState = 'start'; // start | playing | dead | gameover | win
  let score = 0;
  let coins = 0;
  let lives = 3;
  let cameraX = 0;

  // ── Input ──────────────────────────────────────────────────────────
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState === 'start' && (e.code === 'Space' || e.code === 'Enter')) startGame();
    if (gameState === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) initGame();
    if (gameState === 'win' && (e.code === 'Space' || e.code === 'Enter')) initGame();
    if (gameState === 'dead' && (e.code === 'Space' || e.code === 'Enter')) respawn();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // ── Luigi ──────────────────────────────────────────────────────────
  const LUIGI_W = 22;
  const LUIGI_H = 42;
  let luigi;

  function createLuigi(x, y) {
    return {
      x, y,
      vx: 0, vy: 0,
      w: LUIGI_W, h: LUIGI_H,
      onGround: false,
      facingRight: true,
      dead: false,
      invincible: 0,
      winAnim: false,
      winTimer: 0,
    };
  }

  // ── Platforms ──────────────────────────────────────────────────────
  let platforms = [];
  let questionBlocks = [];
  let goombas = [];
  let coinsArr = [];
  let particles = [];
  let flagPole = null;
  let flagY = 0;
  let flagDescending = false;

  function initGame() {
    score = 0;
    coins = 0;
    lives = 3;
    startGame();
  }

  function startGame() {
    gameState = 'playing';
    cameraX = 0;
    luigi = createLuigi(80, GROUND_Y - LUIGI_H);

    // Ground segments (full ground)
    platforms = [
      // Main ground
      { x: 0, y: GROUND_Y, w: WORLD_WIDTH, h: 48, type: 'ground' },

      // Floating platforms
      { x: 300, y: 320, w: 128, h: 20, type: 'platform' },
      { x: 500, y: 260, w: 96, h: 20, type: 'platform' },
      { x: 700, y: 300, w: 112, h: 20, type: 'platform' },
      { x: 1000, y: 280, w: 96, h: 20, type: 'platform' },
      { x: 1300, y: 300, w: 128, h: 20, type: 'platform' },
      { x: 1700, y: 260, w: 112, h: 20, type: 'platform' },
      { x: 2100, y: 300, w: 96, h: 20, type: 'platform' },
      { x: 2500, y: 270, w: 128, h: 20, type: 'platform' },
    ];

    // Question blocks
    questionBlocks = [
      { x: 340, y: 220, w: 32, h: 32, hit: false, bobT: 0 },
      { x: 780, y: 200, w: 32, h: 32, hit: false, bobT: 0 },
      { x: 1060, y: 200, w: 32, h: 32, hit: false, bobT: 0 },
      { x: 1780, y: 190, w: 32, h: 32, hit: false, bobT: 0 },
    ];

    // Goombas
    goombas = [
      makeGoomba(450, GROUND_Y - 28),
      makeGoomba(850, GROUND_Y - 28),
      makeGoomba(1100, GROUND_Y - 28),
      makeGoomba(1500, GROUND_Y - 28),
      makeGoomba(1900, GROUND_Y - 28),
      makeGoomba(2300, GROUND_Y - 28),
    ];

    // Coins
    coinsArr = [
      makeCoin(320, 350), makeCoin(520, 280),
      makeCoin(720, 320), makeCoin(1020, 300),
      makeCoin(1320, 320), makeCoin(1720, 280),
      makeCoin(2120, 320), makeCoin(2520, 290),
    ];

    particles = [];

    // Flag pole at end
    flagPole = { x: WORLD_WIDTH - 200, y: GROUND_Y - 260 };
    flagY = flagPole.y;
    flagDescending = false;
  }

  function makeGoomba(x, y) {
    return { x, y, w: 28, h: 28, vx: -1, vy: 0, onGround: false, dead: false, deadTimer: 0, bobT: 0 };
  }

  function makeCoin(x, y) {
    return { x, y, w: 16, h: 16, collected: false, bobT: Math.random() * Math.PI * 2 };
  }

  function respawn() {
    if (lives <= 0) { gameState = 'gameover'; return; }
    cameraX = 0;
    luigi = createLuigi(80, GROUND_Y - LUIGI_H);
    gameState = 'playing';
  }

  // ── Collision helpers ───────────────────────────────────────────────
  function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function resolveTopCollision(entity, plat) {
    const prevBottom = entity.y + entity.h - entity.vy;
    if (prevBottom <= plat.y + 2 && entity.vy >= 0) {
      entity.y = plat.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
      return true;
    }
    return false;
  }

  // ── Update ─────────────────────────────────────────────────────────
  function update() {
    if (gameState !== 'playing') return;

    // Win animation
    if (luigi.winAnim) {
      luigi.winTimer++;
      if (luigi.winTimer > 120) { gameState = 'win'; }
      return;
    }

    // Luigi movement
    if (keys['ArrowLeft'] || keys['KeyA']) {
      luigi.vx -= MOVE_ACCEL;
      luigi.facingRight = false;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
      luigi.vx += MOVE_ACCEL;
      luigi.facingRight = true;
    } else {
      luigi.vx *= FRICTION;
      if (Math.abs(luigi.vx) < 0.1) luigi.vx = 0;
    }

    luigi.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, luigi.vx));

    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && luigi.onGround) {
      luigi.vy = JUMP_FORCE;
      luigi.onGround = false;
    }

    luigi.vy += GRAVITY;
    luigi.x += luigi.vx;
    luigi.y += luigi.vy;

    // Clamp world
    if (luigi.x < 0) { luigi.x = 0; luigi.vx = 0; }
    if (luigi.x + luigi.w > WORLD_WIDTH) { luigi.x = WORLD_WIDTH - luigi.w; luigi.vx = 0; }

    // Platform collisions
    luigi.onGround = false;
    for (const p of platforms) {
      if (rectOverlap(luigi, p)) {
        resolveTopCollision(luigi, p);
      }
    }

    // Question block collisions (bottom hit)
    for (const qb of questionBlocks) {
      if (!qb.hit && rectOverlap(luigi, qb)) {
        const prevTop = luigi.y - luigi.vy;
        if (prevTop >= qb.y + qb.h - 4 && luigi.vy < 0) {
          // Hit from below
          qb.hit = true;
          luigi.vy = Math.abs(luigi.vy) * 0.5;
          score += 100;
          coins++;
          spawnCoinParticle(qb.x + qb.w / 2, qb.y);
        } else {
          resolveTopCollision(luigi, qb);
        }
      }
    }

    // Collect coins
    for (const c of coinsArr) {
      if (!c.collected) {
        c.bobT += 0.05;
        if (rectOverlap(luigi, { x: c.x, y: c.y + Math.sin(c.bobT) * 4, w: c.w, h: c.h })) {
          c.collected = true;
          coins++;
          score += 50;
          spawnCoinParticle(c.x + c.w / 2, c.y);
        }
      }
    }

    // Goombas
    for (const g of goombas) {
      if (g.dead) {
        g.deadTimer++;
        continue;
      }
      g.bobT += 0.1;
      g.vx = g.vx;
      g.vy += GRAVITY;
      g.x += g.vx;
      g.y += g.vy;
      g.onGround = false;

      for (const p of platforms) {
        if (rectOverlap(g, p)) resolveTopCollision(g, p);
      }

      // Reverse at edges
      if (g.x <= 0) g.vx = Math.abs(g.vx);
      if (g.x + g.w >= WORLD_WIDTH) g.vx = -Math.abs(g.vx);

      // Reverse at platform edges
      if (g.onGround) {
        let onPlat = false;
        for (const p of platforms) {
          if (g.x + g.w > p.x && g.x < p.x + p.w && Math.abs((g.y + g.h) - p.y) < 4) onPlat = true;
        }
        if (!onPlat && g.y >= GROUND_Y - g.h - 2) onPlat = true;
        // Check ahead
        const aheadX = g.vx > 0 ? g.x + g.w + 4 : g.x - 4;
        let aheadOnGround = false;
        for (const p of platforms) {
          if (aheadX >= p.x && aheadX <= p.x + p.w && Math.abs((g.y + g.h) - p.y) < 8) aheadOnGround = true;
        }
        if (g.y + g.h >= GROUND_Y) aheadOnGround = true;
      }

      // Check luigi stomp
      if (luigi.invincible <= 0 && rectOverlap(luigi, g)) {
        const luigiBottom = luigi.y + luigi.h;
        const gTop = g.y;
        if (luigiBottom - luigi.vy <= gTop + 8 && luigi.vy > 0) {
          // Stomp
          g.dead = true;
          luigi.vy = -8;
          score += 200;
          luigi.invincible = 60;
        } else {
          // Luigi hurt
          luigiHurt();
        }
      }
    }

    // Fall death
    if (luigi.y > BASE_H + 100) {
      luigiHurt();
    }

    // Flag / win check
    if (flagPole && luigi.x + luigi.w >= flagPole.x && luigi.x <= flagPole.x + 16) {
      luigi.winAnim = true;
      luigi.winTimer = 0;
      score += 1000;
    }

    // Invincibility
    if (luigi.invincible > 0) luigi.invincible--;

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Camera
    const targetCam = luigi.x - BASE_W / 3;
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - BASE_W, targetCam));
  }

  function luigiHurt() {
    if (luigi.invincible > 0) return;
    lives--;
    if (lives <= 0) {
      gameState = 'gameover';
    } else {
      gameState = 'dead';
    }
  }

  function spawnCoinParticle(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 6 - 2,
        life: 40,
        color: '#FFD700',
        size: 4 + Math.random() * 4,
      });
    }
  }

  // ── Draw helpers ────────────────────────────────────────────────────
  function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - cameraX, y, w, h);
  }

  function drawText(text, x, y, size, color, align) {
    ctx.font = `${size}px 'Press Start 2P', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  }

  // ── Draw Luigi ─────────────────────────────────────────────────────
  function drawLuigi(x, y, facingRight, invincible) {
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

    const cx = x - cameraX;
    const dir = facingRight ? 1 : -1;
    ctx.save();
    ctx.translate(cx + luigi.w / 2, y + luigi.h / 2);
    if (!facingRight) ctx.scale(-1, 1);
    const ox = -luigi.w / 2;
    const oy = -luigi.h / 2;

    // Legs / overalls bottom
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(ox + 1, oy + 28, 9, 14);
    ctx.fillRect(ox + 12, oy + 28, 9, 14);

    // Shoes
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(ox - 1, oy + 38, 11, 5);
    ctx.fillRect(ox + 12, oy + 38, 11, 5);

    // Body / overalls
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(ox + 1, oy + 18, 20, 14);

    // Shirt (green)
    ctx.fillStyle = '#00a800';
    ctx.fillRect(ox + 3, oy + 20, 16, 8);

    // Arms
    ctx.fillStyle = '#00a800';
    ctx.fillRect(ox - 4, oy + 18, 6, 10);
    ctx.fillRect(ox + 20, oy + 18, 6, 10);

    // Hands
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(ox - 4, oy + 26, 6, 5);
    ctx.fillRect(ox + 20, oy + 26, 6, 5);

    // Neck
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(ox + 8, oy + 14, 6, 6);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(ox + 4, oy + 4, 14, 13);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(ox + 14, oy + 7, 3, 3);

    // Nose
    ctx.fillStyle = '#e8a070';
    ctx.fillRect(ox + 13, oy + 11, 4, 3);

    // Mustache
    ctx.fillStyle = '#000';
    ctx.fillRect(ox + 7, oy + 13, 10, 2);
    ctx.fillRect(ox + 9, oy + 15, 6, 2);

    // Cap
    ctx.fillStyle = '#00a800';
    ctx.fillRect(ox + 2, oy + 2, 18, 6);
    ctx.fillRect(ox + 4, oy - 2, 14, 6);
    // Cap brim
    ctx.fillRect(ox - 1, oy + 6, 24, 3);

    // L on cap
    ctx.fillStyle = '#fff';
    ctx.fillRect(ox + 8, oy, 3, 6);
    ctx.fillRect(ox + 8, oy + 4, 6, 2);

    ctx.restore();
  }

  // ── Draw Goomba ────────────────────────────────────────────────────
  function drawGoomba(g) {
    if (g.dead) {
      if (g.deadTimer > 60) return;
      const cx2 = g.x - cameraX;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(cx2, g.y + g.h - 8, g.w, 8);
      return;
    }
    const cx2 = g.x - cameraX;
    const bob = Math.sin(g.bobT) * 2;

    // Body
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx2, g.y + bob, g.w, g.h);

    // Feet
    ctx.fillStyle = '#5D2E0C';
    ctx.fillRect(cx2 - 2, g.y + g.h - 6 + bob, 10, 6);
    ctx.fillRect(cx2 + g.w - 8, g.y + g.h - 6 + bob, 10, 6);

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx2 + 4, g.y + 4 + bob, 6, 6);
    ctx.fillRect(cx2 + g.w - 10, g.y + 4 + bob, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(cx2 + 5, g.y + 5 + bob, 3, 3);
    ctx.fillRect(cx2 + g.w - 9, g.y + 5 + bob, 3, 3);

    // Frown
    ctx.fillStyle = '#000';
    ctx.fillRect(cx2 + 4, g.y + 18 + bob, 4, 2);
    ctx.fillRect(cx2 + g.w - 8, g.y + 18 + bob, 4, 2);
    ctx.fillRect(cx2 + 8, g.y + 20 + bob, g.w - 16, 2);
  }

  // ── Draw Question Block ─────────────────────────────────────────────
  function drawQuestionBlock(qb) {
    const bx = qb.x - cameraX;
    const bob = qb.hit ? 0 : Math.sin(qb.bobT) * 2;
    qb.bobT += 0.05;

    if (qb.hit) {
      ctx.fillStyle = '#888';
      ctx.fillRect(bx, qb.y + bob, qb.w, qb.h);
      ctx.fillStyle = '#666';
      ctx.fillRect(bx + 2, qb.y + 2 + bob, qb.w - 4, qb.h - 4);
    } else {
      ctx.fillStyle = '#e8a800';
      ctx.fillRect(bx, qb.y + bob, qb.w, qb.h);
      ctx.fillStyle = '#ffd040';
      ctx.fillRect(bx + 2, qb.y + 2 + bob, qb.w - 4, qb.h - 4);
      ctx.fillStyle = '#fff';
      ctx.font = "bold 18px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('?', bx + qb.w / 2, qb.y + qb.h - 6 + bob);
      ctx.textAlign = 'left';
    }
    // Border
    ctx.strokeStyle = '#5a3a00';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, qb.y + bob, qb.w, qb.h);
  }

  // ── Draw Coin ──────────────────────────────────────────────────────
  function drawCoin(c) {
    if (c.collected) return;
    const bob = Math.sin(c.bobT) * 4;
    const cx2 = c.x - cameraX;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx2 + c.w / 2, c.y + c.h / 2 + bob, c.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(cx2 + c.w / 2 - 2, c.y + c.h / 2 + bob - 2, c.w / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Draw Background ────────────────────────────────────────────────
  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
    grad.addColorStop(0, '#5C94FC');
    grad.addColorStop(1, '#9BC8FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    // Clouds (parallax)
    const cloudPositions = [100, 350, 650, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3400, 3800, 4200, 4600];
    const cloudY = [60, 80, 50, 70, 60, 85, 55, 75, 65, 80, 50, 70, 60, 80, 55];
    ctx.fillStyle = '#fff';
    for (let i = 0; i < cloudPositions.length; i++) {
      const cx2 = cloudPositions[i] - cameraX * 0.5;
      const cy = cloudY[i];
      if (cx2 > -80 && cx2 < BASE_W + 80) {
        ctx.beginPath();
        ctx.arc(cx2, cy, 25, 0, Math.PI * 2);
        ctx.arc(cx2 + 30, cy - 10, 30, 0, Math.PI * 2);
        ctx.arc(cx2 + 60, cy, 25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hills
    ctx.fillStyle = '#5BAD2A';
    const hillPos = [0, 600, 1300, 2000, 2800, 3600, 4200];
    for (const hx of hillPos) {
      const hcx = hx - cameraX * 0.8;
      ctx.beginPath();
      ctx.arc(hcx + 120, GROUND_Y, 100, Math.PI, 0, false);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hcx + 280, GROUND_Y, 70, Math.PI, 0, false);
      ctx.fill();
    }
  }

  // ── Draw Ground ────────────────────────────────────────────────────
  function drawGround(p) {
    const px = p.x - cameraX;
    if (px + p.w < 0 || px > BASE_W) return;

    if (p.type === 'ground') {
      // Top row - green grass
      ctx.fillStyle = '#5BAD2A';
      ctx.fillRect(px, p.y, p.w, 16);
      // Dirt
      ctx.fillStyle = '#C8851C';
      ctx.fillRect(px, p.y + 16, p.w, p.h - 16);
      // Grid lines
      ctx.strokeStyle = '#A06010';
      ctx.lineWidth = 1;
      for (let gx = Math.floor(p.x / 32) * 32; gx < p.x + p.w; gx += 32) {
        const lx = gx - cameraX;
        ctx.beginPath();
        ctx.moveTo(lx, p.y + 16);
        ctx.lineTo(lx, p.y + p.h);
        ctx.stroke();
      }
    } else {
      // Floating platform
      ctx.fillStyle = '#5BAD2A';
      ctx.fillRect(px, p.y, p.w, 8);
      ctx.fillStyle = '#C8851C';
      ctx.fillRect(px, p.y + 8, p.w, p.h - 8);
      ctx.strokeStyle = '#A06010';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, p.y, p.w, p.h);
    }
  }

  // ── Draw Flag Pole ─────────────────────────────────────────────────
  function drawFlagPole() {
    if (!flagPole) return;
    const px = flagPole.x - cameraX;
    if (px < -50 || px > BASE_W + 50) return;

    // Pole
    ctx.fillStyle = '#888';
    ctx.fillRect(px + 6, flagPole.y, 4, GROUND_Y - flagPole.y);

    // Ball on top
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + 8, flagPole.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Flag
    ctx.fillStyle = '#00a800';
    ctx.fillRect(px + 10, flagY, 30, 20);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 14, flagY + 4, 4, 12);
    ctx.fillRect(px + 18, flagY + 4, 8, 4);
  }

  // ── Draw Particles ─────────────────────────────────────────────────
  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / 40;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Draw HUD ────────────────────────────────────────────────────────
  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, BASE_W, 44);

    drawText('LUIGI', 12, 28, 10, '#00ff00');
    drawText(`SCORE: ${String(score).padStart(6, '0')}`, BASE_W / 2 - 100, 28, 10, '#fff');
    drawText(`x${coins}`, BASE_W - 180, 28, 10, '#FFD700');

    // Coin icon
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(BASE_W - 192, 21, 7, 0, Math.PI * 2);
    ctx.fill();

    // Lives (hearts)
    for (let i = 0; i < Math.max(0, lives); i++) {
      drawHeart(BASE_W - 50 + i * 0 - (lives - 1) * 20 / 2 - 20 + i * 22, 14);
    }
  }

  function drawHeart(x, y) {
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 6);
    ctx.bezierCurveTo(x + 9, y + 3, x + 5, y, x, y + 5);
    ctx.bezierCurveTo(x - 5, y, x - 9, y + 3, x - 9, y + 6);
    ctx.bezierCurveTo(x - 9, y + 10, x, y + 17, x, y + 17);
    ctx.bezierCurveTo(x, y + 17, x + 9, y + 10, x + 9, y + 6);
    ctx.fill();
  }

  // ── Draw Screens ───────────────────────────────────────────────────
  function drawStartScreen() {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
    grad.addColorStop(0, '#000066');
    grad.addColorStop(1, '#000033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    // Stars
    ctx.fillStyle = '#fff';
    const starPositions = [[50,30],[150,80],[250,40],[400,20],[550,60],[700,30],[750,90],[100,120],[300,100],[650,110]];
    for (const [sx, sy] of starPositions) {
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('SUPER LUIGI', BASE_W / 2, 160);
    ctx.fillStyle = '#00ff00';
    ctx.font = "28px 'Press Start 2P', monospace";
    ctx.fillText('BROS', BASE_W / 2, 200);

    // Luigi on start screen
    const luigiDemo = { x: BASE_W / 2 - 11, y: 240, w: LUIGI_W, h: LUIGI_H, vx: 0, vy: 0, invincible: 0, facingRight: true };
    const origCam = cameraX;
    cameraX = 0;
    drawLuigi(luigiDemo.x, luigiDemo.y, true, 0);
    cameraX = origCam;

    // Blink press start
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.fillText('PRESS SPACE TO START', BASE_W / 2, 360);
    }

    ctx.fillStyle = '#888';
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText('ARROW KEYS / WASD to move  SPACE to jump', BASE_W / 2, 420);
    ctx.textAlign = 'left';
  }

  function drawDeadScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444';
    ctx.font = "28px 'Press Start 2P', monospace";
    ctx.fillText('LUIGI DIED!', BASE_W / 2, BASE_H / 2 - 40);
    ctx.fillStyle = '#fff';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText(`LIVES LEFT: ${lives}`, BASE_W / 2, BASE_H / 2 + 10);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO CONTINUE', BASE_W / 2, BASE_H / 2 + 60);
    }
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff0000';
    ctx.font = "32px 'Press Start 2P', monospace";
    ctx.fillText('GAME OVER', BASE_W / 2, BASE_H / 2 - 60);
    ctx.fillStyle = '#fff';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText(`FINAL SCORE: ${score}`, BASE_W / 2, BASE_H / 2);
    ctx.fillText(`COINS: ${coins}`, BASE_W / 2, BASE_H / 2 + 35);
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillText('PRESS SPACE TO RETRY', BASE_W / 2, BASE_H / 2 + 80);
    }
    ctx.textAlign = 'left';
  }

  function drawWinScreen() {
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
    grad.addColorStop(0, '#001a00');
    grad.addColorStop(1, '#003300');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = "26px 'Press Start 2P', monospace";
    ctx.fillText('YOU WIN!', BASE_W / 2, 150);
    ctx.fillStyle = '#00ff00';
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillText('LUIGI SAVES THE DAY!', BASE_W / 2, 200);

    ctx.fillStyle = '#fff';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText(`SCORE: ${score}`, BASE_W / 2, 270);
    ctx.fillText(`COINS: ${coins}`, BASE_W / 2, 305);
    ctx.fillText(`LIVES: ${lives}`, BASE_W / 2, 340);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('PRESS SPACE TO PLAY AGAIN', BASE_W / 2, 410);
    }
    ctx.textAlign = 'left';
  }

  // ── Main draw ──────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, BASE_W, BASE_H);

    if (gameState === 'start') {
      drawStartScreen();
      return;
    }

    drawBackground();

    // Platforms
    for (const p of platforms) drawGround(p);

    // Question blocks
    for (const qb of questionBlocks) drawQuestionBlock(qb);

    // Coins
    for (const c of coinsArr) drawCoin(c);

    // Flag
    drawFlagPole();

    // Goombas
    for (const g of goombas) drawGoomba(g);

    // Luigi
    if (luigi) drawLuigi(luigi.x, luigi.y, luigi.facingRight, luigi.invincible);

    // Particles
    drawParticles();

    // HUD
    drawHUD();

    // Overlay screens
    if (gameState === 'dead') drawDeadScreen();
    if (gameState === 'gameover') drawGameOverScreen();
    if (gameState === 'win') drawWinScreen();
  }

  // ── Game Loop ──────────────────────────────────────────────────────
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Start
  requestAnimationFrame(loop);

})();

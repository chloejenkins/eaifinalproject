(function(){
  const root = document.getElementById('rl-root');
  if (!root) {
    console.error('rl-root element not found');
    return;
  }

  root.innerHTML = `
    <div class="code-block">
      <div class="line"><span class="ln">1</span><span class="code comment">// reinforcement learning: no labels, no demonstrations -- just a track and a reward.</span></div>
      <div class="line"><span class="ln">2</span><span class="code comment">// the car tries an action, sees what happens, and nudges its own value estimates.</span></div>
      <div class="line"><span class="ln">3</span><span class="code comment">// repeat for a few hundred laps and steering starts to look like driving.</span></div>
      <div class="line blank"><span class="ln">4</span><span class="code"></span></div>
      <div class="line"><span class="ln">5</span><span class="code"><span class="hl">Q</span>(state, action) += alpha * (reward + gamma * <span class="hl2">max</span>(<span class="hl">Q</span>(nextState, ·)) - <span class="hl">Q</span>(state, action))</span></div>
    </div>

    <div class="rl-layout">
      <div>
        <div class="mode-toggle">
          <button class="btn active-toggle" id="modeManualBtn">🚗 Manual Drive</button>
          <button class="btn" id="modeTrainBtn">🧠 Train AI</button>
        </div>

        <canvas id="rlCanvas" width="640" height="440" aria-label="Car driving simulation"></canvas>

        <div id="rewardProgressContainer" style="display:none;">
          <div class="console-label" style="margin-top:16px;">Reward Progress</div>
          <canvas id="rewardChart" width="640" height="110" aria-label="Episode reward over time"></canvas>
        </div>

        <div class="stats" id="rlStats"></div>
      </div>

      <div class="card">
        <div class="field">
          <label>Track</label>
          <select id="trackSelect">
            <option value="0">01 · Oval circuit</option>
            <option value="1">02 · Figure eight</option>
            <option value="2">03 · Serpentine</option>
          </select>
          <p class="hint">Switching tracks resets the car's position but keeps the Q-table — states are defined by what the sensors see, not by (x, y), so some learning can transfer.</p>
        </div>

        <div class="field" id="manualHint">
          <label>Manual controls</label>
          <p class="hint">← / → or A / D to steer, ↑ / ↓ to speed up / brake.</p>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <button class="btn primary" id="startManualBtn" style="flex:1; font-size:14px; padding:12px;">▶ Start Driving</button>
            <button class="btn" id="stopManualBtn" style="flex:1; font-size:14px; padding:12px; display:none;">⏹ Stop</button>
          </div>
          <div id="countdownDisplay" style="display:none; text-align:center; font-size:48px; font-weight:bold; color:var(--accent); padding:20px 0; font-family:monospace;">3</div>
        </div>

        <div id="trainControls" style="display:none;">
          <div class="field">
            <label>Episodes <span class="val" id="episodesVal">500</span></label>
            <input type="range" id="episodesSlider" min="20" max="3000" step="20" value="500">
          </div>
          <div class="field">
            <label>Epsilon start <span class="val" id="epsStartVal">1.00</span></label>
            <input type="range" id="epsStartSlider" min="0" max="1" step="0.01" value="1">
          </div>
          <div class="field">
            <label>Epsilon min <span class="val" id="epsMinVal">0.05</span></label>
            <input type="range" id="epsMinSlider" min="0" max="1" step="0.01" value="0.05">
          </div>
          <div class="field">
            <label>Epsilon decay</label>
            <select id="decayTypeSelect">
              <option value="none">None (constant)</option>
              <option value="linear" selected>Linear</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>
          <div class="field" id="decayRateField" style="display:none;">
            <label>Decay rate <span class="val" id="decayRateVal">0.010</span></label>
            <input type="range" id="decayRateSlider" min="0.001" max="0.05" step="0.001" value="0.01">
          </div>
          <div class="field">
            <label>Training speed</label>
            <select id="speedSelect">
              <option value="1">1× (real time)</option>
              <option value="5" selected>5×</option>
              <option value="20">20×</option>
              <option value="100">100× (fast forward)</option>
            </select>
          </div>
          <div class="field">
            <label>Car speed <span class="val" id="carSpeedVal">3.0</span></label>
            <input type="range" id="carSpeedSlider" min="1.5" max="5" step="0.1" value="3">
          </div>
          <div class="field">
            <label>Turn rate <span class="val" id="turnRateVal">0.090</span></label>
            <input type="range" id="turnRateSlider" min="0.03" max="0.15" step="0.005" value="0.09">
          </div>
          <div class="field" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="showSensors" checked style="width:auto;">
            <label style="margin:0;">Show sensor rays</label>
          </div>
        </div>

        <div class="mode-toggle" style="margin-top:16px;">
          <button class="btn primary" id="startBtn" style="display:none;">▶ Start training</button>
          <button class="btn" id="resetCarBtn">↺ Reset car</button>
        </div>
        <button class="btn danger" id="resetQBtn" style="display:none; margin-top:8px; width:100%;">⨯ Reset Q-table &amp; episodes</button>
      </div>
    </div>
  `;

  /* ================= TRACK GEOMETRY ================= */
  const CX = 320, CY = 220;
  function buildTrack(pointsFn, n, halfWidth){
    const points = [];
    for(let i=0;i<n;i++){ points.push(pointsFn(i/n)); }
    const segLen = [], cum = [];
    let total = 0;
    for(let i=0;i<n;i++){
      const a = points[i], b = points[(i+1)%n];
      const l = Math.hypot(b.x-a.x, b.y-a.y);
      cum.push(total);
      segLen.push(l);
      total += l;
    }
    return { points, segLen, cum, totalLength: total, halfWidth };
  }

  const TRACKS = [
    buildTrack(t=>{
      const a = t*Math.PI*2;
      return { x: CX + Math.cos(a)*250, y: CY + Math.sin(a)*160 };
    }, 180, 34),
    buildTrack(t=>{
      const a = t*Math.PI*2;
      return { x: CX + Math.cos(a)*230, y: CY + Math.sin(a)*Math.cos(a)*1.6*230 };
    }, 240, 30),
    buildTrack(t=>{
      const a = t*Math.PI*2;
      const r = 190 + Math.sin(a*5)*38;
      return { x: CX + Math.cos(a)*r, y: CY + Math.sin(a)*r*0.78 };
    }, 240, 30),
  ];

  function nearestPointOnTrack(track, px, py){
    const pts = track.points;
    let best = { dist: Infinity, progress: 0, tangentAngle: 0 };
    for(let i=0;i<pts.length;i++){
      const a = pts[i], b = pts[(i+1)%pts.length];
      const dx = b.x-a.x, dy = b.y-a.y;
      const lenSq = dx*dx+dy*dy || 1e-6;
      let t = ((px-a.x)*dx + (py-a.y)*dy)/lenSq;
      t = Math.max(0, Math.min(1, t));
      const cxp = a.x + t*dx, cyp = a.y + t*dy;
      const dist = Math.hypot(px-cxp, py-cyp);
      if(dist < best.dist){
        best.dist = dist;
        best.progress = track.cum[i] + t*track.segLen[i];
        best.tangentAngle = Math.atan2(dy, dx);
      }
    }
    return best;
  }

  /* ================= AGENT STATE ================= */
  const NUM_ACTIONS = 3; // 0 left, 1 straight, 2 right
  const SENSOR_ANGLES = [-90,-45,0,45,90].map(d=>d*Math.PI/180);
  const SENSOR_RANGE = 110, SENSOR_STEP = 6, SENSOR_BUCKETS = 5, HEADING_BUCKETS = 5;

  function sensorReading(track, car, angleOffset){
    for(let d=SENSOR_STEP; d<=SENSOR_RANGE; d+=SENSOR_STEP){
      const px = car.x + Math.cos(car.angle+angleOffset)*d;
      const py = car.y + Math.sin(car.angle+angleOffset)*d;
      if(nearestPointOnTrack(track, px, py).dist > track.halfWidth) return d/SENSOR_RANGE;
    }
    return 1.0;
  }

  function normalizeAngle(a){
    while(a > Math.PI) a -= Math.PI*2;
    while(a < -Math.PI) a += Math.PI*2;
    return a;
  }

  function getState(track, car){
    const buckets = SENSOR_ANGLES.map(off=>{
      const r = sensorReading(track, car, off);
      return Math.min(SENSOR_BUCKETS-1, Math.floor(r*SENSOR_BUCKETS));
    });
    const np = nearestPointOnTrack(track, car.x, car.y);
    const diff = normalizeAngle(np.tangentAngle - car.angle);
    const hBucket = Math.min(HEADING_BUCKETS-1, Math.floor((diff+Math.PI)/(2*Math.PI)*HEADING_BUCKETS));
    return buckets.join('') + '_' + hBucket;
  }

  let qTable = new Map();
  function getQ(state){
    if(!qTable.has(state)) qTable.set(state, [0,0,0]);
    return qTable.get(state);
  }
  function chooseAction(state, epsilon){
    if(Math.random() < epsilon) return Math.floor(Math.random()*NUM_ACTIONS);
    const q = getQ(state);
    let best = 0;
    for(let i=1;i<NUM_ACTIONS;i++) if(q[i] > q[best]) best = i;
    return best;
  }

  /* ================= SIM STATE ================= */
  let trackIndex = 0;
  let track = TRACKS[trackIndex];
  let car = { x:0, y:0, angle:0 };
  let prevProgress = 0, episProgressAccum = 0, episReward = 0, episSteps = 0;
  let episode = 0, epsilonCurrent = 1, bestReward = -Infinity, rewardHistory = [];
  let mode = 'manual'; // 'manual' | 'train'
  let trainingActive = false, paused = false;
  let manualCrashes = 0;
  let lastAction = 1;
  let crashFlashUntil = 0;
  let countdownActive = false; // Car can't move until countdown completes
  let isCountingDown = false; // Only true while actively counting down
  let countdownTime = 0;
  const COUNTDOWN_DURATION = 3000; // 3 seconds in ms
  let countdownStartTime = 0;

  function spawnCar(track){
    const p0 = track.points[0], p1 = track.points[1];
    car = { x:p0.x, y:p0.y, angle: Math.atan2(p1.y-p0.y, p1.x-p0.x) };
    const np = nearestPointOnTrack(track, car.x, car.y);
    prevProgress = np.progress;
    episProgressAccum = 0;
    episReward = 0;
    episSteps = 0;
  }
  spawnCar(track);

  function readParams(){
    return {
      episodes: +episodesSlider.value,
      maxSteps: 500, // Default value
      alpha: 0.3, // Default value
      gamma: 0.9, // Default value
      epsStart: +epsStartSlider.value,
      epsMin: +epsMinSlider.value,
      decayType: decayTypeSelect.value,
      decayRate: +decayRateSlider.value,
      trainingSpeed: +speedSelect.value,
      speed: +carSpeedSlider.value,
      turnRate: +turnRateSlider.value,
    };
  }

  function updateEpsilon(params){
    if(params.decayType === 'none'){
      epsilonCurrent = params.epsStart;
    } else if(params.decayType === 'linear'){
      epsilonCurrent = Math.max(params.epsMin, params.epsStart - (params.epsStart-params.epsMin)*(episode/params.episodes));
    } else {
      epsilonCurrent = params.epsMin + (params.epsStart-params.epsMin)*Math.exp(-params.decayRate*episode);
    }
  }

  function simulateStep(car, action, params){
    const steer = action===0 ? -params.turnRate : action===2 ? params.turnRate : 0;
    car.angle += steer;
    car.x += Math.cos(car.angle)*params.speed;
    car.y += Math.sin(car.angle)*params.speed;
  }

  function trainStepOnce(params){
    const state = getState(track, car);
    const action = chooseAction(state, epsilonCurrent);
    lastAction = action;
    simulateStep(car, action, params);

    const np = nearestPointOnTrack(track, car.x, car.y);
    let delta = np.progress - prevProgress;
    if(delta < -track.totalLength/2) delta += track.totalLength;
    else if(delta > track.totalLength/2) delta -= track.totalLength;
    prevProgress = np.progress;

    let reward = delta*1.0 - 0.02;
    let done = false;
    if(np.dist > track.halfWidth){
      reward = -50;
      done = true;
    } else {
      episProgressAccum += delta;
      if(episProgressAccum >= track.totalLength){
        reward += 100;
        done = true;
      }
    }
    episReward += reward;
    episSteps++;

    const doneFinal = done || episSteps >= params.maxSteps;
    const nextState = getState(track, car);
    const q = getQ(state);
    const maxNext = doneFinal ? 0 : Math.max(...getQ(nextState));
    q[action] += params.alpha * (reward + params.gamma*maxNext - q[action]);

    if(doneFinal){
      rewardHistory.push(episReward);
      if(episReward > bestReward) bestReward = episReward;
      episode++;
      updateEpsilon(params);
      spawnCar(track);
      if(episode >= params.episodes){
        trainingActive = false;
        startBtn.textContent = '▶ Start training';
      }
    }
  }

  /* ================= MANUAL MODE ================= */
  const keys = { left:false, right:false, up:false, down:false };
  window.addEventListener('keydown', e=>{
    if(!document.getElementById('panel-reinforcement').classList.contains('active')) return;
    if(mode !== 'manual') return;
    if(e.key==='ArrowLeft'||e.key==='a') keys.left = true;
    if(e.key==='ArrowRight'||e.key==='d') keys.right = true;
    if(e.key==='ArrowUp'||e.key==='w') keys.up = true;
    if(e.key==='ArrowDown'||e.key==='s') keys.down = true;
  });
  window.addEventListener('keyup', e=>{
    if(e.key==='ArrowLeft'||e.key==='a') keys.left = false;
    if(e.key==='ArrowRight'||e.key==='d') keys.right = false;
    if(e.key==='ArrowUp'||e.key==='w') keys.up = false;
    if(e.key==='ArrowDown'||e.key==='s') keys.down = false;
  });

  function updateManualCar(params){
    if(countdownActive) return;
    const steer = (keys.right?1:0) - (keys.left?1:0);
    car.angle += steer*params.turnRate;
    let spd = params.speed;
    if(keys.up) spd *= 1.6;
    if(keys.down) spd *= 0.5;
    car.x += Math.cos(car.angle)*spd;
    car.y += Math.sin(car.angle)*spd;
    const np = nearestPointOnTrack(track, car.x, car.y);
    if(np.dist > track.halfWidth){
      manualCrashes++;
      crashFlashUntil = performance.now() + 700;
      spawnCar(track);
      countdownActive = true;
      isCountingDown = true;
      countdownStartTime = performance.now();
      countdownDisplay.style.display = 'block';
      countdownDisplay.textContent = '3';
      stopManualBtn.style.display = 'block';
    }
  }

  /* ================= DRAWING ================= */
  const canvas = document.getElementById('rlCanvas');
  const ctx = canvas.getContext('2d');
  function drawTrack(track){
    const pts = track.points;

    // Build inner and outer edge paths
    const outerPts = [];
    const innerPts = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const p_prev = pts[(i - 1 + pts.length) % pts.length];
      const p_next = pts[(i + 1) % pts.length];

      const dx1 = p.x - p_prev.x;
      const dy1 = p.y - p_prev.y;
      const dx2 = p_next.x - p.x;
      const dy2 = p_next.y - p.y;

      const len1 = Math.sqrt(dx1*dx1 + dy1*dy1) || 1;
      const len2 = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;

      const nx1 = -dy1 / len1;
      const ny1 = dx1 / len1;
      const nx2 = -dy2 / len2;
      const ny2 = dx2 / len2;

      const nx = (nx1 + nx2) / 2;
      const ny = (ny1 + ny2) / 2;
      const len = Math.sqrt(nx*nx + ny*ny) || 1;

      outerPts.push({ x: p.x + (nx/len) * track.halfWidth, y: p.y + (ny/len) * track.halfWidth });
      innerPts.push({ x: p.x - (nx/len) * track.halfWidth, y: p.y - (ny/len) * track.halfWidth });
    }

    // Draw road surface
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) {
      ctx.lineTo(outerPts[i].x, outerPts[i].y);
    }
    ctx.lineTo(outerPts[0].x, outerPts[0].y);
    for (let i = innerPts.length - 1; i >= 0; i--) {
      ctx.lineTo(innerPts[i].x, innerPts[i].y);
    }
    ctx.lineTo(innerPts[innerPts.length - 1].x, innerPts[innerPts.length - 1].y);
    ctx.closePath();
    ctx.fill();

    // Draw outer edge (white line)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) {
      ctx.lineTo(outerPts[i].x, outerPts[i].y);
    }
    ctx.lineTo(outerPts[0].x, outerPts[0].y);
    ctx.stroke();

    // Draw inner edge (white line)
    ctx.beginPath();
    ctx.moveTo(innerPts[0].x, innerPts[0].y);
    for (let i = 1; i < innerPts.length; i++) {
      ctx.lineTo(innerPts[i].x, innerPts[i].y);
    }
    ctx.lineTo(innerPts[0].x, innerPts[0].y);
    ctx.stroke();

    // Draw centerline (yellow dashed)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();
    ctx.setLineDash([]);

  }

  function drawCar(car, color){
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle + Math.PI / 2);

    // Draw car body from top-down view
    ctx.fillStyle = color;
    ctx.fillRect(-8, -14, 16, 28);

    // Draw cabin/windshield (lighter shade)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(-6, -12, 12, 10);

    // Draw headlights
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(-4, -15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -15, 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw taillights
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(-4, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 15, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSensors(track, car){
    SENSOR_ANGLES.forEach(off=>{
      const r = sensorReading(track, car, off);
      const dist = r*SENSOR_RANGE;
      const hit = r < 1.0;
      ctx.strokeStyle = hit ? '#e2694b' : '#4fb3a955';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(car.x, car.y);
      ctx.lineTo(car.x+Math.cos(car.angle+off)*dist, car.y+Math.sin(car.angle+off)*dist);
      ctx.stroke();
    });
  }

  function drawScene(){
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center camera on car with follow-cam effect
    const zoom = 1.2;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-car.x, -car.y);

    drawTrack(track);

    // Handle countdown
    if(isCountingDown){
      const elapsed = performance.now() - countdownStartTime;
      if(elapsed < COUNTDOWN_DURATION){
        const remaining = Math.ceil((COUNTDOWN_DURATION - elapsed) / 1000);
        countdownDisplay.textContent = remaining;
      } else {
        isCountingDown = false;
        countdownActive = false; // Allow movement now
        countdownDisplay.style.display = 'none';
        startManualBtn.style.display = 'none';
        stopManualBtn.style.display = 'block';
      }
    }

    const flashing = performance.now() < crashFlashUntil;
    const color = flashing ? '#e2694b' : (mode==='manual' ? '#e2a72e' : '#4fb3a9');
    drawCar(car, color);

    ctx.restore();
  }

  function drawChart(){
    const c = document.getElementById('rewardChart');
    const cctx = c.getContext('2d');
    const w = c.width, h = c.height;
    cctx.clearRect(0,0,w,h);
    if(rewardHistory.length===0) return;
    const n = rewardHistory.length;
    const bucket = Math.max(1, Math.ceil(n/w));
    const pts = [];
    for(let i=0;i<n;i+=bucket){
      const slice = rewardHistory.slice(i,i+bucket);
      pts.push(slice.reduce((a,b)=>a+b,0)/slice.length);
    }
    const minV = Math.min(...pts, 0), maxV = Math.max(...pts, 1);
    const zeroY = h - ((0-minV)/((maxV-minV)||1))*h;
    cctx.strokeStyle = '#33383f';
    cctx.setLineDash([4,4]);
    cctx.beginPath(); cctx.moveTo(0,zeroY); cctx.lineTo(w,zeroY); cctx.stroke();
    cctx.setLineDash([]);

    cctx.strokeStyle = '#4fb3a9';
    cctx.lineWidth = 1.5;
    cctx.beginPath();
    pts.forEach((v,i)=>{
      const x = i/((pts.length-1)||1)*w;
      const y = h - ((v-minV)/((maxV-minV)||1))*h;
      if(i===0) cctx.moveTo(x,y); else cctx.lineTo(x,y);
    });
    cctx.stroke();
  }

  function updateStatsUI(params){
    const el = document.getElementById('rlStats');
    if(mode==='train'){
      el.innerHTML = `
        <div class="stat"><div class="k">Episode</div><div class="v accent">${episode} / ${params.episodes}</div></div>
        <div class="stat"><div class="k">Epsilon</div><div class="v">${epsilonCurrent.toFixed(3)}</div></div>
        <div class="stat"><div class="k">Reward (this ep.)</div><div class="v">${episReward.toFixed(1)}</div></div>
        <div class="stat"><div class="k">Best reward</div><div class="v accent2">${bestReward===-Infinity?'—':bestReward.toFixed(1)}</div></div>
        <div class="stat"><div class="k">States seen</div><div class="v">${qTable.size}</div></div>
      `;
    } else {
      el.innerHTML = `
        <div class="stat"><div class="k">Mode</div><div class="v accent">Manual</div></div>
        <div class="stat"><div class="k">Crashes</div><div class="v">${manualCrashes}</div></div>
        <div class="stat"><div class="k">Q-table size</div><div class="v">${qTable.size}</div></div>
      `;
    }
  }

  /* ================= UI WIRING ================= */
  const episodesSlider = document.getElementById('episodesSlider');
  const maxStepsSlider = document.getElementById('maxStepsSlider');
  const alphaSlider = document.getElementById('alphaSlider');
  const gammaSlider = document.getElementById('gammaSlider');
  const epsStartSlider = document.getElementById('epsStartSlider');
  const epsMinSlider = document.getElementById('epsMinSlider');
  const decayTypeSelect = document.getElementById('decayTypeSelect');
  const decayRateSlider = document.getElementById('decayRateSlider');
  const decayRateField = document.getElementById('decayRateField');
  const speedSelect = document.getElementById('speedSelect');
  const carSpeedSlider = document.getElementById('carSpeedSlider');
  const turnRateSlider = document.getElementById('turnRateSlider');
  const showSensors = document.getElementById('showSensors');
  const trackSelect = document.getElementById('trackSelect');
  const modeManualBtn = document.getElementById('modeManualBtn');
  const modeTrainBtn = document.getElementById('modeTrainBtn');
  const startBtn = document.getElementById('startBtn');
  const startManualBtn = document.getElementById('startManualBtn');
  const stopManualBtn = document.getElementById('stopManualBtn');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const resetCarBtn = document.getElementById('resetCarBtn');
  const resetQBtn = document.getElementById('resetQBtn');
  const trainControls = document.getElementById('trainControls');
  const manualHint = document.getElementById('manualHint');

  const labelPairs = [
    [episodesSlider,'episodesVal', v=>v],
    [maxStepsSlider,'maxStepsVal', v=>v],
    [alphaSlider,'alphaVal', v=>(+v).toFixed(2)],
    [gammaSlider,'gammaVal', v=>(+v).toFixed(2)],
    [epsStartSlider,'epsStartVal', v=>(+v).toFixed(2)],
    [epsMinSlider,'epsMinVal', v=>(+v).toFixed(2)],
    [decayRateSlider,'decayRateVal', v=>(+v).toFixed(3)],
    [carSpeedSlider,'carSpeedVal', v=>(+v).toFixed(1)],
    [turnRateSlider,'turnRateVal', v=>(+v).toFixed(3)],
  ];
  labelPairs.forEach(([slider,labelId,fmt])=>{
    const label = document.getElementById(labelId);
    slider.addEventListener('input', ()=>{ label.textContent = fmt(slider.value); });
  });
  decayTypeSelect.addEventListener('change', ()=>{
    decayRateField.style.display = decayTypeSelect.value==='exponential' ? '' : 'none';
  });

  trackSelect.addEventListener('change', ()=>{
    trackIndex = +trackSelect.value;
    track = TRACKS[trackIndex];
    spawnCar(track);
  });

  function switchMode(newMode){
    mode = newMode;
    modeManualBtn.classList.toggle('active-toggle', mode==='manual');
    modeTrainBtn.classList.toggle('active-toggle', mode==='train');
    manualHint.style.display = mode==='manual' ? '' : 'none';
    trainControls.style.display = mode==='train' ? '' : 'none';
    startBtn.style.display = mode==='train' ? '' : 'none';
    resetQBtn.style.display = mode==='train' ? '' : 'none';
    startManualBtn.style.display = mode==='manual' ? 'block' : 'none';
    stopManualBtn.style.display = 'none';
    const rewardProgressContainer = document.getElementById('rewardProgressContainer');
    if (rewardProgressContainer) {
      rewardProgressContainer.style.display = mode==='train' ? 'block' : 'none';
    }
    countdownActive = true;
    isCountingDown = false;
    countdownDisplay.style.display = 'none';
  }
  modeManualBtn.addEventListener('click', ()=>switchMode('manual'));
  modeTrainBtn.addEventListener('click', ()=>switchMode('train'));

  // Initialize mode display
  switchMode('manual');

  startBtn.addEventListener('click', ()=>{
    const params = readParams();
    if(!trainingActive){
      trainingActive = true;
      paused = false;
      startBtn.textContent = '⏸ Pause';
      updateEpsilon(params);
    } else {
      paused = !paused;
      startBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    }
  });

  resetCarBtn.addEventListener('click', ()=>{
    spawnCar(track);
    countdownActive = false;
    countdownDisplay.style.display = 'none';
  });

  startManualBtn.addEventListener('click', ()=>{
    countdownActive = true; // Prevent movement during countdown
    isCountingDown = true;
    countdownStartTime = performance.now();
    countdownDisplay.style.display = 'block';
    countdownDisplay.textContent = '3'; // Show 3 immediately
    startManualBtn.style.display = 'none';
  });

  stopManualBtn.addEventListener('click', ()=>{
    countdownActive = true;
    isCountingDown = false;
    countdownDisplay.style.display = 'none';
    startManualBtn.style.display = 'block';
    stopManualBtn.style.display = 'none';
    spawnCar(track);
  });
  resetQBtn.addEventListener('click', ()=>{
    qTable = new Map();
    episode = 0;
    bestReward = -Infinity;
    rewardHistory = [];
    manualCrashes = 0;
    trainingActive = false;
    paused = false;
    startBtn.textContent = '▶ Start training';
    epsilonCurrent = +epsStartSlider.value;
    spawnCar(track);
  });

  /* ================= MAIN LOOP ================= */
  function loop(){
    if(document.getElementById('panel-reinforcement').classList.contains('active')){
      const params = readParams();
      if(mode==='train' && trainingActive && !paused){
        for(let i=0;i<params.trainingSpeed;i++){
          if(!trainingActive) break;
          trainStepOnce(params);
        }
      } else if(mode==='manual'){
        updateManualCar(params);
      }
      drawScene();
      drawChart();
      updateStatsUI(params);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
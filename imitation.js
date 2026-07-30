(function(){
  const root = document.getElementById('sub-imitation');

  root.innerHTML = `
    <div class="code-block">
      <div class="line"><span class="ln">1</span><span class="code comment">// supervised learning: regression to fit a curve through data</span></div>
      <div class="line"><span class="ln">2</span><span class="code comment">// set height points along the track, fit a polynomial to them,</span></div>
      <div class="line"><span class="ln">3</span><span class="code comment">// watch the car drive using the learned curve — see over/underfitting in action.</span></div>
      <div class="line blank"><span class="ln">4</span><span class="code"></span></div>
      <div class="line"><span class="ln">5</span><span class="code"><span class="hl">function</span> <span class="hl2">fitPolynomial</span>(points, order) {</span></div>
      <div class="line"><span class="ln">6</span><span class="code">&nbsp;&nbsp;<span class="hl">return</span> solveNormalEquations(buildVandermonde(points, order));</span></div>
      <div class="line"><span class="ln">7</span><span class="code">&nbsp;&nbsp;<span class="comment">// coefficients let us predict height at any track position</span></span></div>
      <div class="line"><span class="ln">8</span><span class="code">}</span></div>
    </div>

    <div class="card">
      <div class="console-label">Learn by Setting Points</div>

      <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px; margin-bottom:20px; align-items:start;">
        <!-- LEFT: Track visualization -->
        <div>
          <div style="font-size:13px; color:var(--text-dim); margin-bottom:8px; font-weight:500;">Track View</div>
          <canvas id="trackCanvas" width="640" height="300" aria-label="Track with regression curve" style="width:100%; height:300px; display:block; border:1px solid var(--border); border-radius:var(--radius);"></canvas>
        </div>

        <!-- RIGHT: Regression graph -->
        <div>
          <div style="font-size:13px; color:var(--text-dim); margin-bottom:8px; font-weight:500;">Learning Curve</div>
          <canvas id="graphCanvas" width="320" height="300" aria-label="Data points and fitted polynomial" style="width:100%; height:300px; display:block; border:1px solid var(--border); border-radius:var(--radius);"></canvas>
        </div>
      </div>

      <!-- Point setting controls -->
      <div style="background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius); padding:14px; margin-bottom:14px;">
        <div style="font-size:13px; color:var(--text-dim); margin-bottom:12px; font-weight:500;">Add Training Point</div>

        <div class="field">
          <label>Road Position <span class="val" id="posVal">0</span></label>
          <input type="range" id="posSlider" min="0" max="100" value="0" step="1">
        </div>

        <div class="field">
          <label>Road Height <span class="val" id="roadHeightDisplay">0</span></label>
          <input type="text" readonly style="font-family:var(--mono); font-size:12.5px; color:var(--text); background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius); padding:7px 10px; width:100%;" id="roadHeightReadonly" value="0.00">
        </div>

        <div class="field">
          <label>Desired Car Height <span class="val" id="heightVal">0</span></label>
          <input type="range" id="heightSlider" min="-100" max="100" value="0" step="5">
        </div>

        <button class="btn primary" id="addPointBtn" style="width:100%;">+ Add Point</button>
      </div>

      <!-- Regression order selector -->
      <div style="background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius); padding:14px; margin-bottom:14px;">
        <label style="font-size:13px; color:var(--text-dim); margin-bottom:10px; display:block; font-weight:500;">Curve Complexity</label>
        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:6px;">
          <button class="btn order-btn" data-order="1">1</button>
          <button class="btn order-btn" data-order="2">2</button>
          <button class="btn order-btn active-toggle" data-order="3">3</button>
          <button class="btn order-btn" data-order="4">4</button>
          <button class="btn order-btn" data-order="5">5</button>
        </div>
        <div style="font-size:11px; color:var(--text-faint); margin-top:8px;">
          <span id="orderLabel">cubic</span> • watch how higher orders fit the points tighter (overfitting)
        </div>
      </div>

      <!-- Mode toggle -->
      <div class="mode-toggle" style="margin-bottom:14px;">
        <button class="btn" id="driveModeBtn">▶ Drive</button>
        <button class="btn" id="editModeBtn">✎ Edit</button>
        <button class="btn" id="clearBtn">↺ Clear</button>
      </div>

      <!-- Save/Load Drives -->
      <div style="background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius); padding:14px; margin-bottom:14px;">
        <div style="font-size:13px; color:var(--text-dim); margin-bottom:10px; font-weight:500;">Save Your Progress</div>
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          <input type="text" id="driveNameInput" placeholder="Drive name..." style="flex:1; font-family:var(--mono); font-size:12px; padding:7px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-inset);">
          <button class="btn primary" id="saveDriveBtn" style="flex:0 0 auto;">Save</button>
        </div>
        <div style="font-size:13px; color:var(--text-dim); margin-top:12px; margin-bottom:8px; font-weight:500;">Load a Saved Run</div>
        <div style="display:flex; gap:6px;">
          <select id="driveSelect" style="flex:1; font-family:var(--mono); font-size:12px; padding:7px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-inset); color:var(--text);">
            <option value="">-- Select a drive --</option>
          </select>
          <button class="btn" id="loadDriveBtn">Load</button>
          <button class="btn" id="deleteDriveBtn" style="background:#c33;">Delete</button>
        </div>
      </div>

      <!-- Drive controls (shown in drive mode) -->
      <div id="driveControls" style="display:none; background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius); padding:14px;">
        <div class="field">
          <label>Speed <span class="val" id="speedVal">1.0x</span></label>
          <input type="range" id="speedSlider" min="0.3" max="2" value="1" step="0.1">
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn active-toggle" id="playBtn" style="flex:1;">▶ Play</button>
          <button class="btn" id="pauseBtn" style="flex:1;">⏸ Pause</button>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="k">Mode</div><div class="v accent" id="modeDisplay">Editing</div></div>
        <div class="stat"><div class="k">Points Set</div><div class="v" id="pointCount">0</div></div>
        <div class="stat"><div class="k">Order</div><div class="v" id="orderDisplay">3</div></div>
      </div>

      <p class="hint">Set at least 2 points, choose polynomial order, then drive. Higher orders fit tighter but can overshoot between points.</p>
    </div>
  `;

  // ===== Canvas setup =====
  const trackCanvas = document.getElementById('trackCanvas');
  const graphCanvas = document.getElementById('graphCanvas');
  const trackCtx = trackCanvas.getContext('2d');
  const graphCtx = graphCanvas.getContext('2d');

  // ===== State =====
  let points = [];
  let regressionOrder = 3;
  let regressionCoeffs = null;
  let normMin = 0, normMax = 1;
  let mode = 'edit'; // 'edit' or 'drive'
  let isPlaying = false;
  let worldX = 0; // absolute position in world
  let speed = 1;
  let viewportWorldUnits = 2.0;
  let previewCarHeight = 0; // for height slider preview
  const roadSeed = Math.random() * 10000;
  viewportWorldUnits = 1.2;

  // ===== Sin Curve Road Generation =====
  const TRACK_LENGTH = 200;
  const ROAD_WIDTH = 40; // pixels on each side of centerline
  const ROAD_AMPLITUDE = 20;
  const ROAD_FREQUENCY = 0.2;

  function roadCenterlineAt(worldPos) {
    return 40 * Math.sin(worldPos * ROAD_FREQUENCY);
  }

  function roadHeightAt(worldPos) {
    return roadCenterlineAt(worldPos);
  }

  function isOnRoad(worldPos, carHeight) {
      // Check if the car stays within the same white-line band shown on the track
      const roadCenterline = roadCenterlineAt(worldPos);
      const distance = Math.abs(carHeight - roadCenterline);
      const pad = 20;
      const range = 100;
      const roadWidthPixels = 30;
      const worldUnitsPerPixel = range / ((trackCanvas.height / 2) - pad);
      const roadWidthWorldUnits = roadWidthPixels * worldUnitsPerPixel;
      return distance <= roadWidthWorldUnits;
  }

  function screenToWorld(screenX, centerWorldX, canvasWidth, pad, viewportUnits) {
    const pixelsPerUnit = (canvasWidth - 2*pad) / viewportUnits;
    return centerWorldX + (screenX - canvasWidth/2) / pixelsPerUnit;
  }

  function worldToScreen(worldPos, centerWorldX, canvasWidth, pad, viewportUnits) {
    const pixelsPerUnit = (canvasWidth - 2*pad) / viewportUnits;
    return canvasWidth/2 + (worldPos - centerWorldX) * pixelsPerUnit;
  }

  // ===== UI Elements =====
  const posSlider = document.getElementById('posSlider');
  const heightSlider = document.getElementById('heightSlider');
  const posVal = document.getElementById('posVal');
  const heightVal = document.getElementById('heightVal');
  const addPointBtn = document.getElementById('addPointBtn');
  const orderBtns = document.querySelectorAll('.order-btn');
  const orderLabel = document.getElementById('orderLabel');
  const driveModeBtn = document.getElementById('driveModeBtn');
  const editModeBtn = document.getElementById('editModeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const driveControls = document.getElementById('driveControls');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal');
  const modeDisplay = document.getElementById('modeDisplay');
  const pointCountDisplay = document.getElementById('pointCount');
  const orderDisplay = document.getElementById('orderDisplay');

  const orderNames = { 1:'linear', 2:'quadratic', 3:'cubic', 4:'quartic', 5:'quintic' };

  // ===== Event Listeners =====
  posSlider.addEventListener('input', () => {
    worldX = parseFloat(posSlider.value);
    posVal.textContent = worldX.toFixed(1);
    const roadHeight = roadHeightAt(worldX);
    document.getElementById('roadHeightReadonly').value = roadHeight.toFixed(2);
  });

  heightSlider.addEventListener('input', () => {
    const heightValue = parseFloat(heightSlider.value);
    heightVal.textContent = heightValue;
    if (mode === 'edit') {
      previewCarHeight = heightValue;
    }
  });

  addPointBtn.addEventListener('click', () => {
    const desiredHeight = parseFloat(heightSlider.value);
    const roadHeight = roadHeightAt(worldX);

    const existingIdx = points.findIndex(p => Math.abs(p.worldPosition - worldX) < 0.5);
    if (existingIdx >= 0) {
      points[existingIdx].desiredCarHeight = desiredHeight;
    } else {
      points.push({ worldPosition: worldX, roadHeight: roadHeight, desiredCarHeight: desiredHeight });
      points.sort((a, b) => a.worldPosition - b.worldPosition);
    }

    pointCountDisplay.textContent = points.length;
    fitRegression();
  });

  orderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      orderBtns.forEach(b => b.classList.remove('active-toggle'));
      btn.classList.add('active-toggle');
      regressionOrder = parseInt(btn.dataset.order);
      orderDisplay.textContent = regressionOrder;
      orderLabel.textContent = orderNames[regressionOrder];
      fitRegression();
    });
  });

  driveModeBtn.addEventListener('click', () => {
    if (points.length < 2) {
      alert('Add at least 2 points to drive');
      return;
    }
    mode = 'drive';
    if (points.length > 0) {
      worldX = points[0].worldPosition;
    } else {
      worldX = 0;
    }
    isPlaying = true;
    modeDisplay.textContent = 'Driving';
    modeDisplay.style.color = 'var(--accent-2)';

    addPointBtn.disabled = true;
    posSlider.disabled = true;
    heightSlider.disabled = true;
    orderBtns.forEach(b => b.disabled = true);
    driveModeBtn.style.display = 'none';
    editModeBtn.style.display = 'block';
    clearBtn.style.display = 'none';
    driveControls.style.display = 'block';
    playBtn.classList.add('active-toggle');
    pauseBtn.classList.remove('active-toggle');
  });

  editModeBtn.addEventListener('click', () => {
    mode = 'edit';
    isPlaying = false;
    modeDisplay.textContent = 'Editing';
    modeDisplay.style.color = 'var(--accent)';

    addPointBtn.disabled = false;
    posSlider.disabled = false;
    heightSlider.disabled = false;
    orderBtns.forEach(b => b.disabled = false);
    driveModeBtn.style.display = 'block';
    editModeBtn.style.display = 'none';
    clearBtn.style.display = 'block';
    driveControls.style.display = 'none';
  });

  clearBtn.addEventListener('click', () => {
    points = [];
    regressionCoeffs = null;
    pointCountDisplay.textContent = '0';
  });

  playBtn.addEventListener('click', () => {
    isPlaying = true;
    playBtn.classList.add('active-toggle');
    pauseBtn.classList.remove('active-toggle');
  });

  pauseBtn.addEventListener('click', () => {
    isPlaying = false;
    playBtn.classList.remove('active-toggle');
    pauseBtn.classList.add('active-toggle');
  });

  speedSlider.addEventListener('input', () => {
    speed = parseFloat(speedSlider.value);
    speedVal.textContent = speed.toFixed(1) + 'x';
  });

  // ===== Save/Load Drives =====
  const driveNameInput = document.getElementById('driveNameInput');
  const saveDriveBtn = document.getElementById('saveDriveBtn');
  const driveSelect = document.getElementById('driveSelect');
  const loadDriveBtn = document.getElementById('loadDriveBtn');
  const deleteDriveBtn = document.getElementById('deleteDriveBtn');

  const DRIVES_STORAGE_KEY = 'imitation_drives';

  function getSavedDrives() {
    const saved = localStorage.getItem(DRIVES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  function saveDrivesToStorage(drives) {
    localStorage.setItem(DRIVES_STORAGE_KEY, JSON.stringify(drives));
  }

  function updateDriveList() {
    const drives = getSavedDrives();
    driveSelect.innerHTML = '<option value="">-- Select a drive --</option>';
    for (const driveName in drives) {
      const option = document.createElement('option');
      option.value = driveName;
      option.textContent = driveName + ` (${drives[driveName].points.length} points)`;
      driveSelect.appendChild(option);
    }
  }

  saveDriveBtn.addEventListener('click', () => {
    const driveName = driveNameInput.value.trim();
    if (!driveName) {
      alert('Please enter a drive name');
      return;
    }
    if (points.length === 0) {
      alert('Add at least one point before saving');
      return;
    }

    const drives = getSavedDrives();
    drives[driveName] = {
      points: points,
      order: regressionOrder,
      timestamp: new Date().toISOString()
    };
    saveDrivesToStorage(drives);
    driveNameInput.value = '';
    updateDriveList();
    alert(`Drive "${driveName}" saved!`);
  });

  loadDriveBtn.addEventListener('click', () => {
    const driveName = driveSelect.value;
    if (!driveName) {
      alert('Please select a drive to load');
      return;
    }

    const drives = getSavedDrives();
    if (!drives[driveName]) {
      alert('Drive not found');
      return;
    }

    const drive = drives[driveName];
    points = JSON.parse(JSON.stringify(drive.points)); // Deep copy
    regressionOrder = drive.order;

    // Update UI
    orderBtns.forEach(b => {
      b.classList.remove('active-toggle');
      if (parseInt(b.dataset.order) === regressionOrder) {
        b.classList.add('active-toggle');
      }
    });
    orderDisplay.textContent = regressionOrder;
    orderLabel.textContent = orderNames[regressionOrder];
    pointCountDisplay.textContent = points.length;

    fitRegression();
    alert(`Drive "${driveName}" loaded!`);
  });

  deleteDriveBtn.addEventListener('click', () => {
    const driveName = driveSelect.value;
    if (!driveName) {
      alert('Please select a drive to delete');
      return;
    }

    if (!confirm(`Delete drive "${driveName}"?`)) {
      return;
    }

    const drives = getSavedDrives();
    delete drives[driveName];
    saveDrivesToStorage(drives);
    updateDriveList();
    alert(`Drive "${driveName}" deleted!`);
  });

  // Initialize drive list on load
  updateDriveList();

  // ===== Polynomial Regression =====
  function fitRegression() {
    if (points.length < 2) {
      regressionCoeffs = null;
      return;
    }

    const n = points.length;
    const order = Math.min(regressionOrder, n - 1);

    // Compute normalization bounds
    normMin = Math.min(...points.map(p => p.worldPosition));
    normMax = Math.max(...points.map(p => p.worldPosition));
    if (normMin === normMax) normMax = normMin + 1;

    // Build Vandermonde matrix X and y vector
    const X = [];
    const y = [];
    for (let i = 0; i < n; i++) {
      const normalizedX = (points[i].worldPosition - normMin) / (normMax - normMin);
      const row = [];
      for (let j = 0; j <= order; j++) {
        row.push(Math.pow(normalizedX, j));
      }
      X.push(row);
      y.push(points[i].desiredCarHeight);
    }

    // Normal equations: (X^T X) c = X^T y
    const m = order + 1;
    const XTX = [];
    const XTy = [];

    for (let i = 0; i < m; i++) {
      XTX[i] = [];
      for (let j = 0; j < m; j++) {
        XTX[i][j] = 0;
        for (let k = 0; k < n; k++) {
          XTX[i][j] += X[k][i] * X[k][j];
        }
      }
      XTy[i] = 0;
      for (let k = 0; k < n; k++) {
        XTy[i] += X[k][i] * y[k];
      }
    }

    // Gaussian elimination with pivoting
    regressionCoeffs = gaussianElimination(XTX, XTy);
  }

  function gaussianElimination(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);

    // Forward elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
          maxRow = k;
        }
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      if (Math.abs(M[i][i]) < 1e-10) continue;

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j < n + 1; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      if (Math.abs(M[i][i]) > 1e-10) {
        x[i] /= M[i][i];
      }
    }

    return x;
  }

  function predictHeight(worldPos) {
    if (!regressionCoeffs) return 0;
    const normalizedX = (worldPos - normMin) / (normMax - normMin);
    let y = 0;
    for (let i = 0; i < regressionCoeffs.length; i++) {
      y += regressionCoeffs[i] * Math.pow(normalizedX, i);
    }
    return y;
  }

  // ===== Drawing =====
  function drawTrack() {
    const w = trackCanvas.width;
    const h = trackCanvas.height;
    const pad = 20;
    const range = 100;
    const centerWorldX = worldX;
    const pixelsPerUnit = (w - 2*pad) / viewportWorldUnits;

    trackCtx.fillStyle = '#1a1a1a';
    trackCtx.fillRect(0, 0, w, h);

    // Grid
    trackCtx.strokeStyle = '#ffffff';
    trackCtx.lineWidth = 0.5;
    trackCtx.globalAlpha = 0.2;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (h - 2*pad) * i / 4;
      trackCtx.beginPath();
      trackCtx.moveTo(pad, y);
      trackCtx.lineTo(w - pad, y);
      trackCtx.stroke();
    }
    trackCtx.globalAlpha = 1;

    // Road surface - Sin curve track
    trackCtx.fillStyle = '#444444';
    trackCtx.beginPath();

    // Collect points for road band
    const leftPoints = [];
    const rightPoints = [];
    const centerPoints = [];
    const roadWidthPixels = 30;

    for (let screenX = pad; screenX <= w - pad; screenX += 1) {
      const worldPos = screenToWorld(screenX, centerWorldX, w, pad, viewportWorldUnits);
      const roadHeight = roadCenterlineAt(worldPos);
      const screenY = h/2 - (roadHeight / range) * (h/2 - pad);
      leftPoints.push({x: screenX, y: screenY - roadWidthPixels});
      rightPoints.push({x: screenX, y: screenY + roadWidthPixels});
      centerPoints.push({x: screenX, y: screenY});
    }

    // Draw road as filled band
    if (leftPoints.length > 1) {
      trackCtx.fillStyle = '#666666';
      trackCtx.beginPath();
      trackCtx.moveTo(leftPoints[0].x, leftPoints[0].y);
      for (let i = 0; i < leftPoints.length - 1; i++) {
        trackCtx.lineTo(leftPoints[i + 1].x, leftPoints[i + 1].y);
      }
      for (let i = rightPoints.length - 1; i >= 0; i--) {
        trackCtx.lineTo(rightPoints[i].x, rightPoints[i].y);
      }
      trackCtx.closePath();
      trackCtx.fill();
    }

    // Draw left and right edges
    trackCtx.strokeStyle = '#ffffff';
    trackCtx.lineWidth = 4;
    trackCtx.beginPath();
    trackCtx.moveTo(leftPoints[0].x, leftPoints[0].y);
    for (let i = 1; i < leftPoints.length; i++) {
      trackCtx.lineTo(leftPoints[i].x, leftPoints[i].y);
    }
    trackCtx.stroke();

    trackCtx.beginPath();
    trackCtx.moveTo(rightPoints[0].x, rightPoints[0].y);
    for (let i = 1; i < rightPoints.length; i++) {
      trackCtx.lineTo(rightPoints[i].x, rightPoints[i].y);
    }
    trackCtx.stroke();

    // Center yellow dashed line
    trackCtx.strokeStyle = '#ffff00';
    trackCtx.lineWidth = 3;
    trackCtx.setLineDash([8, 8]);
    trackCtx.beginPath();
    trackCtx.moveTo(centerPoints[0].x, centerPoints[0].y);
    for (let i = 1; i < centerPoints.length; i++) {
      trackCtx.lineTo(centerPoints[i].x, centerPoints[i].y);
    }
    trackCtx.stroke();
    trackCtx.setLineDash([]);

    // Finish line at end of track
    const finishWorldX = TRACK_LENGTH;
    const finishScreenX = worldToScreen(finishWorldX, centerWorldX, w, pad, viewportWorldUnits);
    if (finishScreenX >= pad && finishScreenX <= w - pad) {
      trackCtx.strokeStyle = '#ff0000';
      trackCtx.lineWidth = 4;
      trackCtx.setLineDash([8, 8]);
      trackCtx.beginPath();
      trackCtx.moveTo(finishScreenX, pad);
      trackCtx.lineTo(finishScreenX, h - pad);
      trackCtx.stroke();
      trackCtx.setLineDash([]);
    }

    // Regression curve (yellow line)
    if (regressionCoeffs) {
      trackCtx.strokeStyle = '#ffff00';
      trackCtx.lineWidth = 2.5;
      trackCtx.beginPath();
      first = true;
      for (let screenX = pad; screenX <= w - pad; screenX += 2) {
        const worldPos = screenToWorld(screenX, centerWorldX, w, pad, viewportWorldUnits);
        const predictedHeight = predictHeight(worldPos);
        const screenY = h/2 - (predictedHeight / range) * (h/2 - pad);
        if (first) {
          trackCtx.moveTo(screenX, screenY);
          first = false;
        } else {
          trackCtx.lineTo(screenX, screenY);
        }
      }
      trackCtx.stroke();
    }

    // Points (red dots with vertical connectors)
    trackCtx.strokeStyle = '#ff0000';
    trackCtx.lineWidth = 1;
    trackCtx.globalAlpha = 0.5;
    for (const p of points) {
      const screenX = worldToScreen(p.worldPosition, centerWorldX, w, pad, viewportWorldUnits);
      const roadScreenY = h/2 - (p.roadHeight / range) * (h/2 - pad);
      const carScreenY = h/2 - (p.desiredCarHeight / range) * (h/2 - pad);

      // Vertical connector line
      trackCtx.beginPath();
      trackCtx.moveTo(screenX, roadScreenY);
      trackCtx.lineTo(screenX, carScreenY);
      trackCtx.stroke();

      // Dot at desired height
      trackCtx.fillStyle = '#ff0000';
      trackCtx.globalAlpha = 1;
      trackCtx.beginPath();
      trackCtx.arc(screenX, carScreenY, 5, 0, Math.PI*2);
      trackCtx.fill();
      trackCtx.globalAlpha = 0.5;
    }
    trackCtx.globalAlpha = 1;

    // Car (fixed at center)
    const carScreenX = w / 2;

    if (mode === 'edit') {
      // Show preview car at slider height
      const previewScreenY = h/2 - (previewCarHeight / range) * (h/2 - pad);
      trackCtx.fillStyle = '#00ffff';
      trackCtx.globalAlpha = 0.6;
      trackCtx.beginPath();
      trackCtx.roundRect ?
        trackCtx.roundRect(carScreenX - 8, previewScreenY - 5, 16, 10, 2) :
        trackCtx.rect(carScreenX - 8, previewScreenY - 5, 16, 10);
      trackCtx.fill();
      trackCtx.globalAlpha = 1;
    } else {
      // Show car following regression in drive mode
      const carHeight = predictHeight(worldX);
      const carScreenY = h/2 - (carHeight / range) * (h/2 - pad);
      const onRoad = isOnRoad(worldX, carHeight);
      trackCtx.fillStyle = onRoad ? '#00ffff' : '#ff0000';
      trackCtx.beginPath();
      trackCtx.roundRect ?
        trackCtx.roundRect(carScreenX - 8, carScreenY - 5, 16, 10, 2) :
        trackCtx.rect(carScreenX - 8, carScreenY - 5, 16, 10);
      trackCtx.fill();
    }

    // Show crash/completion message
    if (crashMessage) {
      trackCtx.fillStyle = '#ffffff';
      trackCtx.font = 'bold 24px monospace';
      trackCtx.textAlign = 'center';
      trackCtx.fillText(crashMessage, w/2, h/2 - 80);
    }
  }

  function drawGraph() {
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    const pad = 20;
    const range = 100;

    graphCtx.fillStyle = '#0a0a0a';
    graphCtx.fillRect(0, 0, w, h);

    if (points.length === 0) return;

    // Auto-scale X-axis to point range
    const minWorld = Math.min(...points.map(p => p.worldPosition));
    const maxWorld = Math.max(...points.map(p => p.worldPosition));
    const worldRange = Math.max(maxWorld - minWorld, 1);

    // Axes
    graphCtx.strokeStyle = '#ffffff';
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    graphCtx.moveTo(pad, h - pad);
    graphCtx.lineTo(w - pad, h - pad);
    graphCtx.moveTo(pad, pad);
    graphCtx.lineTo(pad, h - pad);
    graphCtx.stroke();

    // Grid
    graphCtx.strokeStyle = '#ffffff';
    graphCtx.lineWidth = 0.5;
    graphCtx.globalAlpha = 0.2;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (h - 2*pad) * i / 4;
      graphCtx.beginPath();
      graphCtx.moveTo(pad, y);
      graphCtx.lineTo(w - pad, y);
      graphCtx.stroke();

      const x = pad + (w - 2*pad) * i / 4;
      graphCtx.beginPath();
      graphCtx.moveTo(x, pad);
      graphCtx.lineTo(x, h - pad);
      graphCtx.stroke();
    }
    graphCtx.globalAlpha = 1;

    // Road terrain (blue curve)
    graphCtx.strokeStyle = '#0099ff';
    graphCtx.lineWidth = 1.5;
    graphCtx.beginPath();
    let first = true;
    for (const p of points) {
      const normalizedX = (p.worldPosition - minWorld) / worldRange;
      const screenX = pad + normalizedX * (w - 2*pad);
      const screenY = h - pad - ((p.roadHeight + range) / (2*range)) * (h - 2*pad);
      if (first) {
        graphCtx.moveTo(screenX, screenY);
        first = false;
      } else {
        graphCtx.lineTo(screenX, screenY);
      }
    }
    graphCtx.stroke();

    // Regression curve (yellow)
    if (regressionCoeffs) {
      graphCtx.strokeStyle = '#ffff00';
      graphCtx.lineWidth = 2.5;
      graphCtx.beginPath();
      first = true;
      for (let i = 0; i <= 100; i++) {
        const normalizedPos = i / 100;
        const worldPos = minWorld + normalizedPos * worldRange;
        const predictedHeight = predictHeight(worldPos);
        const screenX = pad + normalizedPos * (w - 2*pad);
        const screenY = h - pad - ((predictedHeight + range) / (2*range)) * (h - 2*pad);
        if (first) {
          graphCtx.moveTo(screenX, screenY);
          first = false;
        } else {
          graphCtx.lineTo(screenX, screenY);
        }
      }
      graphCtx.stroke();
    }

    // Desired car heights (red dots)
    graphCtx.fillStyle = '#ff0000';
    for (const p of points) {
      const normalizedX = (p.worldPosition - minWorld) / worldRange;
      const screenX = pad + normalizedX * (w - 2*pad);
      const screenY = h - pad - ((p.desiredCarHeight + range) / (2*range)) * (h - 2*pad);
      graphCtx.beginPath();
      graphCtx.arc(screenX, screenY, 4, 0, Math.PI*2);
      graphCtx.fill();
    }
  }

  // ===== Animation =====
  let crashMessage = '';
  let crashMessageTime = 0;

  function animate() {
    if (mode === 'drive' && isPlaying) {
      worldX += 0.1 * speed;

      // Check boundary collision using the car's visible position against the white lines
      const carHeight = predictHeight(worldX);
      if (!isOnRoad(worldX, carHeight)) {
        isPlaying = false;
        crashMessage = 'Off Road - Failed!';
        crashMessageTime = performance.now() + 2000;
      }

      // Check finish line
      if (worldX >= TRACK_LENGTH) {
        isPlaying = false;
        crashMessage = 'Lap Complete!';
        crashMessageTime = performance.now() + 2000;
      }
    }

    // Clear crash message after time
    if (performance.now() > crashMessageTime) {
      crashMessage = '';
    }

    drawTrack();
    drawGraph();
    requestAnimationFrame(animate);
  }

  animate();
})();

(function(){
  const root = document.getElementById('unsupervised-root');

  root.innerHTML = `
    <div style="max-width:760px; margin:0 auto;">
      <div style="background:var(--bg-panel); border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:20px;">
        <canvas id="stage" width="700" height="440" style="width:100%; height:auto; display:block; border:1px solid var(--border); border-radius:var(--radius); background:#f0f1f3; margin-bottom:16px;"></canvas>

        <div style="padding:14px 6px 2px;">
          <div style="color:var(--text-dim); font-size:12px; font-weight:500; margin-bottom:8px;" id="stepN">STEP 1 / 6</div>
          <h2 style="font-size:18px; margin:6px 0 8px; color:var(--text); font-weight:600;" id="stepTitle">Input: Unlabeled Images</h2>
          <p style="font-size:14px; color:var(--text-dim); line-height:1.5; margin:0 0 16px;" id="stepDesc">The model is given a large collection of car images. No labels, just raw pixels.</p>
        </div>

        <div style="display:flex; gap:6px; justify-content:center; padding:12px 0 8px;" id="dots"></div>

        <div style="display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 0;">
          <button id="prevBtn" style="font-family:var(--mono); background:var(--bg-inset); border:1px solid var(--border); color:var(--text-dim); padding:10px 16px; border-radius:var(--radius); font-size:13px; cursor:pointer; transition:all .2s ease; font-weight:500;">◀ Previous</button>
          <button id="playBtn" style="font-family:var(--mono); background:var(--accent); border:none; color:#ffffff; padding:10px 20px; border-radius:var(--radius); font-size:13px; cursor:pointer; transition:all .2s ease; font-weight:500; min-width:90px;">▶ Play</button>
          <button id="nextBtn" style="font-family:var(--mono); background:var(--bg-inset); border:1px solid var(--border); color:var(--text-dim); padding:10px 16px; border-radius:var(--radius); font-size:13px; cursor:pointer; transition:all .2s ease; font-weight:500;">Next ▶</button>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const ICON_SCALE = 0.42;

  const STEPS = [
    { title:"Input: Unlabeled Images",
      desc:"The model is given a large collection of car images. No labels, just raw pixels." },
    { title:"Random Initialization",
      desc:"The model starts with random filters — it doesn't know anything yet." },
    { title:"Learning Low-Level Features",
      desc:"Filters adjust to catch simple patterns that occur often: edges, lines, curves, textures." },
    { title:"Learning Higher-Level Features",
      desc:"Low-level features combine into recognizable parts: wheels, headlights, grilles, whole cars." },
    { title:"Discovering Structure (Clustering)",
      desc:"The model groups similar cars together, based only on the features it has learned." },
    { title:"Result: The Model Understands Patterns",
      desc:"With no labels at all, the model can now recognize structure in car images." },
  ];

  const N = 54;
  const GROUP_COLORS = ["#4a90e2","#00c853","#a78bfa","#fbbf24"];
  const FEATURE_LABELS = ["edges","lines","curves","textures"];
  const PART_LABELS = ["wheels","headlights","grilles","whole cars"];

  function rand(a,b){ return a + Math.random()*(b-a); }

  const particles = [];
  const featureCounts=[0,0,0,0], partCounts=[0,0,0,0], clusterCounts=[0,0,0,0];

  function clusterColor(cluster, seed){
    if(cluster===0){
      const h = 355 + (seed-0.5)*24, s = 58+seed*18, l = 46+seed*12;
      return `hsl(${h},${s}%,${l}%)`;
    }
    if(cluster===1){
      const h = 208 + (seed-0.5)*26, s = 55+seed*22, l = 48+seed*14;
      return `hsl(${h},${s}%,${l}%)`;
    }
    if(cluster===2){
      const h = 210, s = 4+seed*7, l = 80+seed*12;
      return `hsl(${h},${s}%,${l}%)`;
    }
    const h = 220, s = 6+seed*9, l = 13+seed*11;
    return `hsl(${h},${s}%,${l}%)`;
  }

  for(let i=0;i<N;i++){
    const featureType = i % 4;
    const partType = (i + 1) % 4;
    const cluster = Math.floor(i / (N/4)) % 4;
    const seed = (i * 0.6180339887) % 1;

    const p = {
      x: rand(60,W-60), y: rand(60,H-60),
      tx:0, ty:0,
      color: clusterColor(cluster, seed),
      carType: cluster,
      shape: seed,
      featureType, featureIdx: featureCounts[featureType]++,
      partType, partIdx: partCounts[partType]++,
      cluster, clusterIdx: clusterCounts[cluster]++,
      scale: 0.6, tscale: 0.6,
      op: 1
    };
    particles.push(p);
  }

  const gridOrder = Array.from({length:N}, (_,i)=>i);
  for(let i=gridOrder.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [gridOrder[i], gridOrder[j]] = [gridOrder[j], gridOrder[i]];
  }

  function packInRect(rect, count, idx, padFrac){
    padFrac = padFrac || 0.14;
    const padX = rect.w*padFrac, padY = rect.h*padFrac;
    const innerW = rect.w - padX*2, innerH = rect.h - padY*2;
    const cols = Math.max(1, Math.round(Math.sqrt(count * (innerW/innerH))));
    const rows = Math.ceil(count/cols);
    const cw = innerW/Math.max(cols,1), ch = innerH/Math.max(rows,1);
    const c = idx % cols, r = Math.floor(idx/cols);
    return {
      x: rect.x + padX + cw*(c+0.5),
      y: rect.y + padY + ch*(r+0.5)
    };
  }

  function packInRectFixedCols(rect, count, idx, cols, padFrac){
    padFrac = padFrac || 0.06;
    const padX = rect.w*padFrac, padY = rect.h*padFrac;
    const innerW = rect.w - padX*2, innerH = rect.h - padY*2;
    const rows = Math.ceil(count/cols);
    const cw = innerW/cols, ch = innerH/rows;
    const c = idx % cols, r = Math.floor(idx/cols);
    return {
      x: rect.x + padX + cw*(c+0.5),
      y: rect.y + padY + ch*(r+0.5)
    };
  }

  function bandRect(index, numGroups, orientation, marginX, marginY, gap){
    gap = gap===undefined?10:gap;
    if(orientation==='vertical'){
      const bw = (W - marginX*2 - gap*(numGroups-1))/numGroups;
      return { x: marginX + index*(bw+gap), y: marginY, w: bw, h: H - marginY*2 };
    } else {
      const bh = (H - marginY*2 - gap*(numGroups-1))/numGroups;
      return { x: marginX, y: marginY + index*(bh+gap), w: W - marginX*2, h: bh };
    }
  }

  function quadrantRect(index, marginX, marginY, gap){
    marginX = marginX===undefined?54:marginX;
    marginY = marginY===undefined?60:marginY;
    gap = gap===undefined?26:gap;
    const halfW = (W - marginX*2 - gap)/2, halfH = (H - marginY*2 - gap)/2;
    const col = index%2, row = Math.floor(index/2);
    return { x: marginX + col*(halfW+gap), y: marginY + row*(halfH+gap), w: halfW, h: halfH };
  }

  function layoutGrid(){
    const rect = { x:24, y:20, w:W-48, h:H-56 };
    particles.forEach((p,i)=>{
      const pos = packInRectFixedCols(rect, N, gridOrder[i], 9, 0.05);
      p.tx = pos.x; p.ty = pos.y; p.tscale = 0.62;
    });
  }

  function layoutNoise(){ layoutGrid(); }

  function layoutFeatureGroups(){
    particles.forEach(p=>{
      const rect = bandRect(p.featureType, 4, 'vertical', 26, 46, 14);
      const pos = packInRect(rect, featureCounts[p.featureType], p.featureIdx, 0.10);
      p.tx = pos.x; p.ty = pos.y; p.tscale = 0.48;
    });
  }

  function layoutParts(){
    particles.forEach(p=>{
      const rect = bandRect(p.partType, 4, 'horizontal', 30, 34, 12);
      const pos = packInRect(rect, partCounts[p.partType], p.partIdx, 0.16);
      p.tx = pos.x; p.ty = pos.y; p.tscale = 0.5;
    });
  }

  function layoutClusters(){
    particles.forEach(p=>{
      const rect = quadrantRect(p.cluster);
      const pos = packInRect(rect, clusterCounts[p.cluster], p.clusterIdx, 0.16);
      p.tx = pos.x; p.ty = pos.y; p.tscale = 0.6;
    });
  }

  const LAYOUTS = [layoutGrid, layoutNoise, layoutFeatureGroups, layoutParts, layoutClusters, layoutClusters];

  function drawCarIcon(p, mode){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale*ICON_SCALE/0.6, p.scale*ICON_SCALE/0.6);
    ctx.globalAlpha = p.op;

    if(mode === 0){ drawCar(p); }
    else if(mode === 1){ drawNoise(p); }
    else if(mode === 2){ drawFeaturePatch(p); }
    else if(mode === 3){ drawPartIcon(p); }
    else { drawCar(p); }
    ctx.restore();
  }

  function shadow(w){
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.ellipse(0, 12, w, 3.4, 0, 0, 7);
    ctx.fill();
  }

  const CAR_EMOJI = ["🚗","🚙","🚕","🛻"];

  function drawCar(p){
    shadow(16);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0,1,17,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = "32px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(CAR_EMOJI[p.carType] || "🚗", 0, 2);
  }

  function drawNoise(p){
    const s = 22;
    let seed = p.shape*9999;
    function n(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    for(let gy=0; gy<4; gy++){
      for(let gx=0; gx<4; gx++){
        ctx.fillStyle = `hsl(${Math.floor(n()*360)},60%,55%)`;
        ctx.fillRect(-s/2 + gx*(s/4), -s/2 + gy*(s/4), s/4, s/4);
      }
    }
  }

  function drawFeaturePatch(p){
    ctx.fillStyle = "#f0f1f3";
    ctx.strokeStyle = "#e0e1e3";
    ctx.lineWidth = 1;
    ctx.fillRect(-14,-14,28,28);
    ctx.strokeRect(-14,-14,28,28);
    ctx.strokeStyle = GROUP_COLORS[p.featureType];
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const kind = p.featureType;
    if(kind===0){ ctx.moveTo(-10,10); ctx.lineTo(10,-10); }
    else if(kind===1){ ctx.moveTo(0,-11); ctx.lineTo(0,11); }
    else if(kind===2){ ctx.moveTo(-11,4); ctx.quadraticCurveTo(0,-14,11,4); }
    else { for(let i=-10;i<=10;i+=5){ ctx.moveTo(i,-10); ctx.lineTo(i,10);} }
    ctx.stroke();
  }

  function drawPartIcon(p){
    const kind = p.partType;
    ctx.strokeStyle = GROUP_COLORS[kind];
    ctx.fillStyle = GROUP_COLORS[kind];
    ctx.lineWidth = 2;
    if(kind===0){
      ctx.beginPath(); ctx.arc(0,0,10,0,7); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,3,0,7); ctx.fill();
    } else if(kind===1){
      ctx.beginPath(); ctx.ellipse(0,0,10,6,0,0,7); ctx.stroke();
    } else if(kind===2){
      for(let i=-8;i<=8;i+=4){ ctx.beginPath(); ctx.moveTo(-10,i); ctx.lineTo(10,i); ctx.stroke(); }
    } else {
      drawCar(p);
    }
  }

  function drawOverlay(step){
    ctx.save();
    ctx.font = "11px 'JetBrains Mono',monospace";
    ctx.textAlign = "center";

    if(step===0){
      ctx.textAlign="left"; ctx.fillStyle = "#999999";
      ctx.fillText("no labels · just raw data — 54 images", 20, H-14);
    }
    if(step===1){
      ctx.textAlign="left"; ctx.fillStyle="#4a90e2";
      ctx.fillText("I don't know anything yet — random filters", 20, H-14);
    }
    if(step===2){
      for(let g=0; g<4; g++){
        const rect = bandRect(g, 4, 'vertical', 26, 46, 14);
        ctx.fillStyle = GROUP_COLORS[g];
        ctx.fillText(FEATURE_LABELS[g], rect.x + rect.w/2, 28);
      }
    }
    if(step===3){
      for(let g=0; g<4; g++){
        const rect = bandRect(g, 4, 'horizontal', 30, 34, 12);
        ctx.fillStyle = GROUP_COLORS[g];
        ctx.textAlign="left";
        ctx.fillText(PART_LABELS[g], rect.x + 4, rect.y + 12);
      }
    }
    if(step===4 || step===5){
      for(let g=0; g<4; g++){
        const rect = quadrantRect(g);
        ctx.strokeStyle = GROUP_COLORS[g] + "44";
        ctx.lineWidth = 1.6;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.textAlign="left"; ctx.fillStyle="#999999";
      if(step===4) ctx.fillText("grouping similar cars by learned features", 20, H-14);
      if(step===5){
        ctx.fillStyle="#00c853";
        ctx.fillText("✓ edges & shapes   ✓ parts   ✓ combinations   ✓ groups of similar cars", 20, H-14);
      }
    }
    ctx.restore();
  }

  let current = 0;
  let mode = 0;
  const MODE_BY_STEP = [0,1,2,3,4,4];

  function applyStep(i){
    current = i;
    LAYOUTS[i]();
    mode = MODE_BY_STEP[i];
    document.getElementById('stepN').textContent = `STEP ${i+1} / 6`;
    document.getElementById('stepTitle').textContent = STEPS[i].title;
    document.getElementById('stepDesc').textContent = STEPS[i].desc;
    document.querySelectorAll('.dot').forEach((d,di)=> d.classList.toggle('active', di===i));
    document.getElementById('prevBtn').disabled = i===0;
    document.getElementById('nextBtn').disabled = i===STEPS.length-1;
  }

  function tick(){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle = "rgba(0,0,0,.02)";
    for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    particles.forEach(p=>{
      p.x += (p.tx - p.x) * 0.10;
      p.y += (p.ty - p.y) * 0.10;
      p.scale += (p.tscale - p.scale) * 0.13;
      drawCarIcon(p, mode);
    });

    drawOverlay(current);
    requestAnimationFrame(tick);
  }

  const dotsWrap = document.getElementById('dots');
  STEPS.forEach((s,i)=>{
    const d = document.createElement('div');
    d.className = 'dot' + (i===0?' active':'');
    d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--border);cursor:pointer;transition:all .2s ease;';
    d.addEventListener('click', ()=>{ stopPlay(); applyStep(i); });
    dotsWrap.appendChild(d);
  });

  const dotsStyle = document.createElement('style');
  dotsStyle.textContent = `.dot.active { background:var(--accent) !important; transform:scale(1.3); }`;
  document.head.appendChild(dotsStyle);

  document.getElementById('prevBtn').addEventListener('click', ()=>{
    stopPlay();
    if(current>0) applyStep(current-1);
  });
  document.getElementById('nextBtn').addEventListener('click', ()=>{
    stopPlay();
    if(current<STEPS.length-1) applyStep(current+1);
  });

  let playTimer = null;
  const playBtn = document.getElementById('playBtn');
  function stopPlay(){
    if(playTimer){ clearInterval(playTimer); playTimer=null; playBtn.textContent = "▶ Play"; }
  }
  playBtn.addEventListener('click', ()=>{
    if(playTimer){ stopPlay(); return; }
    playBtn.textContent = "⏸ Pause";
    playTimer = setInterval(()=>{
      let next = current + 1;
      if(next >= STEPS.length) next = 0;
      applyStep(next);
    }, 2600);
  });

  applyStep(0);
  requestAnimationFrame(tick);
})();

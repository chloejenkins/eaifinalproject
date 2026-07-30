(function(){
  const root = document.getElementById('sub-classification');

  root.innerHTML = `
    <div class="code-block">
      <div class="line"><span class="ln">1</span><span class="code comment">// classification: give the model thousands of (car features -&gt; label) pairs</span></div>
      <div class="line"><span class="ln">2</span><span class="code comment">// e.g. (length: 4.6m, height: 1.4m, cargo bed: no) -&gt; "sedan"</span></div>
      <div class="line"><span class="ln">3</span><span class="code comment">// the network adjusts its internal weights until its guesses match the labels.</span></div>
      <div class="line blank"><span class="ln">4</span><span class="code"></span></div>
      <div class="line"><span class="ln">5</span><span class="code"><span class="hl">const</span> net = <span class="hl2">new</span> NeuralNet([<span class="hl">3</span>, <span class="hl">4</span>, <span class="hl">4</span>]); <span class="comment">// in -&gt; hidden -&gt; out</span></span></div>
      <div class="line"><span class="ln">6</span><span class="code">net.<span class="hl2">train</span>(labeledCars, epochs);</span></div>
      <div class="line"><span class="ln">7</span><span class="code">net.<span class="hl2">predict</span>(newCar); <span class="comment">// -&gt; { sedan: .05, suv: .82, truck: .10, motorcycle: .03 }</span></span></div>
    </div>

    <div class="card">
      <div class="console-label"><span class="prompt">&gt;</span> drag the sliders to describe a car, watch the network guess its class</div>
      <p class="hint" style="margin-top:-4px;">Note: this network's weights are hand-set for the demo, not learned from data — a real classifier would learn them from many labeled examples like the ones above. The forward pass shown (inputs → hidden layer → probabilities) is exactly how it would work either way.</p>

      <div class="grid-2" style="margin-top:14px;">
        <div>
          <div class="field">
            <label>Length <span class="val" id="lenVal">4.6 m</span></label>
            <input type="range" id="lenSlider" min="2" max="7" step="0.1" value="4.6">
          </div>
          <div class="field">
            <label>Height <span class="val" id="heightVal">1.45 m</span></label>
            <input type="range" id="heightSlider" min="0.9" max="2.4" step="0.05" value="1.45">
          </div>
          <div class="field">
            <label>Has cargo bed <span class="val" id="cargoVal">no</span></label>
            <input type="range" id="cargoSlider" min="0" max="1" step="1" value="0">
          </div>
          <div class="stats">
            <div class="stat"><div class="k">Prediction</div><div class="v accent2" id="predLabel">—</div></div>
          </div>
        </div>
        <div>
          <svg id="netSvg" viewBox="0 0 300 220" width="100%" height="220" aria-label="Neural network activation diagram"></svg>
        </div>
      </div>

      <div id="bars" style="margin-top:16px;"></div>
    </div>
  `;

  const CLASSES = ['sedan','suv','truck','motorcycle'];
  const CLASS_COLOR = { sedan:'#e2a72e', suv:'#4fb3a9', truck:'#e2694b', motorcycle:'#9d8cf0' };

  // hand-set weights, purely illustrative
  const W1 = [ // 4 hidden nodes x 3 inputs
    [ 1.4, -1.8,  0.6],
    [-1.2,  1.6, -0.4],
    [ 0.9,  0.7,  2.1],
    [-1.6, -1.1, -1.8],
  ];
  const B1 = [-0.3, 0.1, -0.6, 1.2];
  const W2 = [ // 4 outputs x 4 hidden
    [ 1.8, -1.2, -0.6,  0.4],  // sedan
    [-0.5,  1.7, -0.3, -0.2],  // suv
    [-1.1, -0.4,  1.9, -0.6],  // truck
    [-1.0, -1.0, -1.4,  2.2],  // motorcycle
  ];
  const B2 = [0.2, 0.0, -0.1, -0.4];

  function sigmoid(x){ return 1/(1+Math.exp(-x)); }
  function softmax(arr){
    const m = Math.max(...arr);
    const ex = arr.map(v=>Math.exp(v-m));
    const s = ex.reduce((a,b)=>a+b,0);
    return ex.map(v=>v/s);
  }

  function forward(lenNorm, heightNorm, cargo){
    const inputs = [lenNorm, heightNorm, cargo];
    const hidden = W1.map((row,i)=> sigmoid(row[0]*inputs[0]+row[1]*inputs[1]+row[2]*inputs[2]+B1[i]) );
    const raw = W2.map((row,i)=> row[0]*hidden[0]+row[1]*hidden[1]+row[2]*hidden[2]+row[3]*hidden[3]+B2[i] );
    const out = softmax(raw);
    return { inputs, hidden, out };
  }

  const lenSlider = document.getElementById('lenSlider');
  const heightSlider = document.getElementById('heightSlider');
  const cargoSlider = document.getElementById('cargoSlider');
  const lenVal = document.getElementById('lenVal');
  const heightVal = document.getElementById('heightVal');
  const cargoVal = document.getElementById('cargoVal');
  const predLabel = document.getElementById('predLabel');
  const bars = document.getElementById('bars');
  const netSvg = document.getElementById('netSvg');

  function render(){
    const len = parseFloat(lenSlider.value);
    const height = parseFloat(heightSlider.value);
    const cargo = parseInt(cargoSlider.value,10);
    lenVal.textContent = len.toFixed(1)+' m';
    heightVal.textContent = height.toFixed(2)+' m';
    cargoVal.textContent = cargo ? 'yes' : 'no';

    const lenNorm = (len-2)/(7-2);
    const heightNorm = (height-0.9)/(2.4-0.9);
    const { inputs, hidden, out } = forward(lenNorm, heightNorm, cargo);

    let bestI = 0;
    out.forEach((v,i)=>{ if(v>out[bestI]) bestI = i; });
    predLabel.textContent = CLASSES[bestI] + ' (' + Math.round(out[bestI]*100) + '%)';
    predLabel.style.color = CLASS_COLOR[CLASSES[bestI]];

    // bars
    bars.innerHTML = CLASSES.map((c,i)=>`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="width:80px;font-size:12px;color:var(--text-dim);">${c}</div>
        <div style="flex:1;background:var(--bg-inset);border:1px solid var(--border);border-radius:3px;height:14px;overflow:hidden;">
          <div style="width:${Math.round(out[i]*100)}%;height:100%;background:${CLASS_COLOR[c]};"></div>
        </div>
        <div style="width:42px;text-align:right;font-size:11.5px;color:var(--text-faint);">${Math.round(out[i]*100)}%</div>
      </div>
    `).join('');

    drawNet(inputs, hidden, out, bestI);
  }

  function drawNet(inputs, hidden, out, bestI){
    const inX = 30, hidX = 150, outX = 270;
    const inYs = [40, 100, 160];
    const hidYs = [25, 78, 131, 184];
    const outYs = [15, 75, 135, 195];

    function node(x,y,val,color){
      const r = 9;
      const op = Math.max(0.15, Math.min(1, val));
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="${op}" stroke="${color}" stroke-width="1.2"/>`;
    }
    function edge(x1,y1,x2,y2,w){
      const op = Math.max(0.06, Math.min(0.55, Math.abs(w)*0.3));
      const color = w>=0 ? '#4fb3a9' : '#e2694b';
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-opacity="${op}" stroke-width="1.4"/>`;
    }

    let svg = '';
    // edges in -> hidden
    for(let i=0;i<3;i++) for(let h=0;h<4;h++) svg += edge(inX,inYs[i],hidX,hidYs[h], W1[h][i]);
    // edges hidden -> out
    for(let h=0;h<4;h++) for(let o=0;o<4;o++) svg += edge(hidX,hidYs[h],outX,outYs[o], W2[o][h]);
    // nodes
    inputs.forEach((v,i)=> svg += node(inX, inYs[i], v, '#e2a72e') );
    hidden.forEach((v,i)=> svg += node(hidX, hidYs[i], v, '#8b8f98') );
    out.forEach((v,i)=> svg += node(outX, outYs[i], v, CLASS_COLOR[CLASSES[i]]) );
    // labels
    svg += `<text x="${inX}" y="8" font-size="9" fill="#8b8f98" text-anchor="middle" font-family="monospace">in</text>`;
    svg += `<text x="${hidX}" y="8" font-size="9" fill="#8b8f98" text-anchor="middle" font-family="monospace">hidden</text>`;
    svg += `<text x="${outX}" y="8" font-size="9" fill="#8b8f98" text-anchor="middle" font-family="monospace">out</text>`;

    netSvg.innerHTML = svg;
  }

  [lenSlider, heightSlider, cargoSlider].forEach(s=> s.addEventListener('input', render) );
  render();
})();
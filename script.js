// ------------------------------------------------------------
// AUDIO CONTEXT (synthesized SFX)
// ------------------------------------------------------------
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playRollSound() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    // whoosh: filtered noise sweep
    const bufferSize = ctx.sampleRate * 0.18;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.12);
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(now);

    // subtle click at start
    const osc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    clickGain.gain.setValueAtTime(0.06, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(clickGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    document.getElementById('soundRoll').classList.add('active');
    setTimeout(() => document.getElementById('soundRoll').classList.remove('active'), 200);
}

function playImpactSound() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    // thud: low sine + noise burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // noise burst
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    source.connect(filter).connect(noiseGain).connect(ctx.destination);
    source.start(now);

    document.getElementById('soundImpact').classList.add('active');
    setTimeout(() => document.getElementById('soundImpact').classList.remove('active'), 200);
}

function playDingSound() {
    const ctx = initAudio();
    const now = ctx.currentTime;
    // bright ding
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, now);
    osc2.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.3);

    document.getElementById('soundDing').classList.add('active');
    setTimeout(() => document.getElementById('soundDing').classList.remove('active'), 350);
}

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
const state = {
    diceCount: 1,
    n: 10,
    k: 3,
    p: 0.5,
    trials: 0,
    successCount: 0,
    lastRolls: [],
    lastSuccesses: null,
    rolling: false,
    successDistribution: {}, // Track frequency of each success count
    autoTrialRunning: false,
    autoTrialProgress: 0,
    autoTrialTotal: 0,
    autoTrialSpeed: 'moderate',
};

// DOM refs
const diceCountInput = document.getElementById('diceCountInput');
const nInput = document.getElementById('nInput');
const kInput = document.getElementById('kInput');
const pInput = document.getElementById('pInput');
const rollBtn = document.getElementById('rollBtn');
const resetBtn = document.getElementById('resetBtn');
const diceContainer = document.getElementById('diceContainer');
const lastRollValue = document.getElementById('lastRollValue');
const exactProbEl = document.getElementById('exactProb');
const exactFormulaEl = document.getElementById('exactFormula');
const simProbEl = document.getElementById('simProb');
const simCountEl = document.getElementById('simCount');
const lastSuccessesEl = document.getElementById('lastSuccesses');
const totalTrialsEl = document.getElementById('totalTrials');
const formulaDisplay = document.getElementById('formulaDisplay');
const algorithmSteps = document.getElementById('algorithmSteps');
const badge = document.getElementById('badge');
const histogram = document.getElementById('histogram');
const algorithmPanel = document.getElementById('algorithmPanel');
const algorithmToggle = document.getElementById('algorithmToggle');
const autoTrialsInput = document.getElementById('autoTrialsInput');
const speedSelect = document.getElementById('speedSelect');
const startAutoTrialBtn = document.getElementById('startAutoTrialBtn');
const stopAutoTrialBtn = document.getElementById('stopAutoTrialBtn');
const autoProgressText = document.getElementById('autoProgressText');

// ------------------------------------------------------------
// MATH HELPERS (mirrors Python binomial_lab.py)
// ------------------------------------------------------------
function nCk(n, k) {
    if (k < 0 || k > n) return 0;
    if (k > n - k) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) {
        res = res * (n - k + i) / i;
    }
    return res;
}

function binomialPMF(n, k, p) {
    return nCk(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function formatNumber(num, digits = 6) {
    if (num === 0) return '0';
    if (num < 0.000001 && num > -0.000001) return num.toExponential(4);
    return Number(num).toFixed(digits).replace(/\.?0+$/, '');
}

// ------------------------------------------------------------
// DICE MANAGEMENT
// ------------------------------------------------------------
function createDice(id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dice-canvas-wrapper';
    
    const dice = document.createElement('div');
    dice.className = 'dice';
    dice.id = `dice-${id}`;
    
    for (let i = 1; i <= 6; i++) {
        const face = document.createElement('div');
        face.className = `dice-face face-${['front', 'back', 'right', 'left', 'top', 'bottom'][i-1]}`;
        face.innerHTML = `<span>${i}</span>`;
        dice.appendChild(face);
    }
    
    wrapper.appendChild(dice);
    return { wrapper, dice };
}

function updateDiceDisplay() {
    const count = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
    diceContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const { wrapper } = createDice(i);
        diceContainer.appendChild(wrapper);
    }
    
    // Update k input maximum when dice count changes
    updateKInputMax();
}

function updateKInputMax() {
    const diceCount = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
    const n = Math.min(100, Math.max(1, parseInt(nInput.value) || 10));
    const maxK = diceCount * n; // Maximum possible successes
    
    kInput.max = maxK;
    
    // If current k value exceeds new max, adjust it
    const currentK = parseInt(kInput.value) || 3;
    if (currentK > maxK) {
        kInput.value = Math.floor(maxK / 2); // Set to middle value as reasonable default
    }
}

function checkAndGlowMatchingDice(newRolls) {
    const allDice = diceContainer.querySelectorAll('.dice');
    
    // Clear previous glows
    allDice.forEach(dice => dice.classList.remove('glow-green'));
    
    // Check if any dice match their previous value
    if (state.lastRolls && state.lastRolls.length === newRolls.length) {
        newRolls.forEach((roll, index) => {
            if (roll === state.lastRolls[index] && allDice[index]) {
                // Add glow effect for matching dice
                allDice[index].classList.add('glow-green');
                
                // Remove glow after 1 second
                setTimeout(() => {
                    if (allDice[index]) {
                        allDice[index].classList.remove('glow-green');
                    }
                }, 1000);
            }
        });
    }
}

// ------------------------------------------------------------
// AUTO TRIAL SIMULATION
// ------------------------------------------------------------
function getSpeedSettings(speed) {
    const settings = {
        'superfast': { delay: 5, showDiceAnimation: true, soundFrequency: 1 },
        'fast': { delay: 15, showDiceAnimation: true, soundFrequency: 2 },
        'moderate': { delay: 100, showDiceAnimation: true, soundFrequency: 5 },
        'slow': { delay: 300, showDiceAnimation: false, soundFrequency: 1 }
    };
    return settings[speed] || settings['moderate'];
}

function startDiceSpinning(speed) {
    const allDice = diceContainer.querySelectorAll('.dice');
    allDice.forEach(dice => {
        dice.classList.add(`spinning-${speed}`);
    });
}

function stopDiceSpinning() {
    const allDice = diceContainer.querySelectorAll('.dice');
    allDice.forEach(dice => {
        dice.classList.remove('spinning-superfast', 'spinning-fast', 'spinning-moderate', 'spinning-slow');
    });
}

function startAutoTrial() {
    if (state.autoTrialRunning) return;
    
    const totalTrials = Math.min(1000, Math.max(10, parseInt(autoTrialsInput.value) || 100));
    const speed = speedSelect.value;
    
    autoTrialsInput.value = totalTrials;
    
    state.autoTrialRunning = true;
    state.autoTrialProgress = 0;
    state.autoTrialTotal = totalTrials;
    state.autoTrialSpeed = speed;
    
    startAutoTrialBtn.disabled = true;
    stopAutoTrialBtn.disabled = false;
    rollBtn.disabled = true;
    resetBtn.disabled = true;
    speedSelect.disabled = true;
    
    // Start dice spinning for fast speeds
    if (['superfast', 'fast', 'moderate'].includes(speed)) {
        startDiceSpinning(speed);
    }
    
    runAutoTrialStep();
}

function runAutoTrialStep() {
    if (!state.autoTrialRunning || state.autoTrialProgress >= state.autoTrialTotal) {
        stopAutoTrial();
        return;
    }
    
    const speedSettings = getSpeedSettings(state.autoTrialSpeed);
    
    // Play sounds based on speed and frequency
    if (['superfast', 'fast', 'moderate'].includes(state.autoTrialSpeed)) {
        // Play impact sound based on speed frequency
        if (state.autoTrialProgress % speedSettings.soundFrequency === 0) {
            playImpactSound();
        }
    }
    
    // Highlight algorithm steps (only for slow speed to avoid overwhelming)
    if (state.autoTrialSpeed === 'slow') {
        highlightAlgorithmStep('sim-loop');
        setTimeout(() => highlightAlgorithmStep('sim-succ-init'), 50);
        setTimeout(() => highlightAlgorithmStep('sim-dice-loop'), 100);
        setTimeout(() => highlightAlgorithmStep('sim-trial-loop'), 150);
        setTimeout(() => highlightAlgorithmStep('sim-check'), 200);
    }
    
    // Run one trial simulation
    const diceCount = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
    const n = Math.min(100, Math.max(1, parseInt(nInput.value) || 10));
    const k = Math.min(n * diceCount, Math.max(0, parseInt(kInput.value) || 3));
    const p = Math.min(0.99, Math.max(0.01, parseFloat(pInput.value) || 0.5));
    
    let totalSuccesses = 0;
    const rolls = []; // Track visual dice for display
    
    // Simulate dice rolls without visual animation for fast speeds
    for (let diceIndex = 0; diceIndex < diceCount; diceIndex++) {
        let diceSuccesses = 0;
        for (let trial = 0; trial < n; trial++) {
            if (Math.random() < p) diceSuccesses++;
        }
        totalSuccesses += diceSuccesses;
        
        // Generate visual dice face for display (even if not animated)
        const visualFace = Math.floor(Math.random() * 6) + 1;
        rolls.push(visualFace);
    }
    
    // Update state with last roll information
    const previousRolls = [...state.lastRolls]; // Store previous rolls for comparison
    state.lastRolls = rolls;
    state.lastSuccesses = totalSuccesses;
    
    // Check for matching dice and apply glow effect (for all speeds except slow)
    if (state.autoTrialSpeed !== 'slow') {
        checkAndGlowMatchingDice(rolls);
    }
    
    // For slow speed, show individual dice animation and play sound
    if (state.autoTrialSpeed === 'slow') {
        const allDice = diceContainer.querySelectorAll('.dice');
        allDice.forEach((dice, index) => {
            // Check if this dice should glow instead of animate
            const shouldGlow = previousRolls && previousRolls[index] === rolls[index];
            
            if (shouldGlow) {
                // Add glow effect instead of animation
                dice.classList.add('glow-green');
                setTimeout(() => {
                    dice.classList.remove('glow-green');
                }, 1000);
            } else {
                // Normal animation
                animateDiceToFace(dice, rolls[index], index * 50);
            }
        });
        
        // Play individual impact sound for each slow trial
        setTimeout(() => playImpactSound(), 200);
    }
    
    // Update statistics
    state.trials += 1;
    state.autoTrialProgress += 1;
    
    // Update distribution
    if (!state.successDistribution[totalSuccesses]) {
        state.successDistribution[totalSuccesses] = 0;
    }
    state.successDistribution[totalSuccesses]++;
    
    // Debug logging
    console.log(`Trial ${state.autoTrialProgress}: totalSuccesses=${totalSuccesses}, k=${k}, match=${totalSuccesses === k}`);
    
    if (totalSuccesses === k) {
        state.successCount += 1;
        console.log(`SUCCESS! Count now: ${state.successCount}`);
    }
    
    // Update progress
    const speedText = state.autoTrialSpeed.charAt(0).toUpperCase() + state.autoTrialSpeed.slice(1);
    autoProgressText.textContent = `${speedText}: ${state.autoTrialProgress}/${state.autoTrialTotal}`;
    
    // Update UI
    updateStats();
    
    // Continue with next trial
    setTimeout(runAutoTrialStep, speedSettings.delay);
}

function stopAutoTrial() {
    state.autoTrialRunning = false;
    
    startAutoTrialBtn.disabled = false;
    stopAutoTrialBtn.disabled = true;
    rollBtn.disabled = false;
    resetBtn.disabled = false;
    speedSelect.disabled = false;
    
    // Stop dice spinning
    stopDiceSpinning();
    
    // Play completion ding sound
    setTimeout(() => {
        playDingSound();
    }, 200);
    
    autoProgressText.textContent = `Completed: ${state.autoTrialProgress} trials`;
    
    // Final highlight (only for slow mode)
    if (state.autoTrialSpeed === 'slow') {
        setTimeout(() => highlightAlgorithmStep('sim-return'), 400);
    }
}

// ------------------------------------------------------------
// ALGORITHM PANEL
// ------------------------------------------------------------
function toggleAlgorithmPanel() {
    algorithmPanel.classList.toggle('open');
}

function highlightAlgorithmStep(stepId) {
    // Remove previous highlights
    const steps = algorithmSteps.querySelectorAll('.step-line');
    steps.forEach(step => {
        step.classList.remove('highlight', 'highlight-success');
    });
    
    // Add highlight to current step
    const currentStep = algorithmSteps.querySelector(`[data-step="${stepId}"]`);
    if (currentStep) {
        currentStep.classList.add('highlight');
        setTimeout(() => {
            currentStep.classList.remove('highlight');
            currentStep.classList.add('highlight-success');
            setTimeout(() => {
                currentStep.classList.remove('highlight-success');
            }, 1000);
        }, 800);
    }
}

// ------------------------------------------------------------
// HISTOGRAM
// ------------------------------------------------------------
function updateHistogram() {
    const { n, k, diceCount, successDistribution } = state;
    const maxPossibleSuccesses = n * diceCount;
    
    if (state.trials === 0) {
        histogram.innerHTML = '<div class="histogram-empty">No trials yet - roll dice to see distribution</div>';
        return;
    }
    
    // Find the range of values that have been observed
    const observedValues = Object.keys(successDistribution).map(Number).sort((a, b) => a - b);
    const minVal = Math.max(0, Math.min(...observedValues) - 1);
    const maxVal = Math.min(maxPossibleSuccesses, Math.max(...observedValues) + 1);
    
    // Create bars for the observed range
    histogram.innerHTML = '';
    const maxCount = Math.max(...Object.values(successDistribution));
    
    for (let successes = minVal; successes <= maxVal; successes++) {
        const count = successDistribution[successes] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        const bar = document.createElement('div');
        bar.className = 'histogram-bar';
        if (successes === k) {
            bar.classList.add('highlighted');
        }
        
        bar.style.height = `${percentage}%`;
        bar.innerHTML = `
            <div class="bar-label">${successes}</div>
            ${count > 0 ? `<div class="bar-count">${count}</div>` : ''}
        `;
        
        histogram.appendChild(bar);
    }
}

// ------------------------------------------------------------
// UPDATE UI
// ------------------------------------------------------------
function updateStats() {
    const { diceCount, n, k, p } = state;

    badge.textContent = `dice = ${diceCount} · n = ${n} · k = ${k} · p = ${p}`;

    // Highlight exact probability calculation
    setTimeout(() => highlightAlgorithmStep('pmf-def'), 100);
    setTimeout(() => highlightAlgorithmStep('nck-def'), 300);
    setTimeout(() => highlightAlgorithmStep('pmf-calc'), 500);

    const exact = binomialPMF(n, k, p);
    exactProbEl.textContent = formatNumber(exact);
    exactFormulaEl.textContent = `C(${n},${k})·${p}^${k}·${(1 - p)}^${n - k}`;
    formulaDisplay.textContent = `C(${n},${k}) · ${p}^${k} · ${(1 - p)}^${n - k} = ${formatNumber(exact)}`;

    if (state.trials > 0) {
        const simP = state.successCount / state.trials;
        simProbEl.textContent = formatNumber(simP);
        simCountEl.textContent = `${state.successCount} / ${state.trials} trials`;
    } else {
        simProbEl.textContent = '—';
        simCountEl.textContent = '0 / 0 trials';
    }
    totalTrialsEl.textContent = state.trials;

    lastSuccessesEl.textContent = state.lastSuccesses !== null ? state.lastSuccesses : '—';
    lastRollValue.textContent = state.lastRolls.length > 0 ? state.lastRolls.join(', ') : '—';

    algorithmSteps.innerHTML = `
<span class="step-line comment" data-step="comment1"># nCk: safe combination</span>
<span class="step-line" data-step="nck-def">def nCk(n, k):</span>
<span class="step-line" data-step="nck-check1">    if k &lt; 0 or k &gt; n: return 0</span>
<span class="step-line" data-step="nck-check2">    if k &gt; n - k: k = n - k</span>
<span class="step-line" data-step="nck-init">    res = 1</span>
<span class="step-line" data-step="nck-loop">    for i in range(1, k + 1):</span>
<span class="step-line" data-step="nck-calc">        res = res * (n - k + i) // i</span>
<span class="step-line" data-step="nck-return">    return res</span>

<span class="step-line comment" data-step="comment2"># exact binomial probability</span>
<span class="step-line" data-step="pmf-def">def binomial_pmf(n, k, p):</span>
<span class="step-line" data-step="pmf-calc">    return nCk(n, k) * (p ** k) * ((1 - p) ** (n - k))</span>

<span class="step-line comment" data-step="comment3"># simulation with ${diceCount} dice (n=${n}, k=${k}, p=${p})</span>
<span class="step-line" data-step="sim-def">def simulate(n, k, p, trials, dice_count):</span>
<span class="step-line" data-step="sim-init">    count = 0</span>
<span class="step-line" data-step="sim-loop">    for _ in range(trials):</span>
<span class="step-line" data-step="sim-succ-init">        succ = 0</span>
<span class="step-line" data-step="sim-dice-loop">        for dice in range(dice_count):</span>
<span class="step-line" data-step="sim-trial-loop">            succ += sum(1 for _ in range(n) if random() &lt; p)</span>
<span class="step-line" data-step="sim-check">        if succ == k: count += 1</span>
<span class="step-line" data-step="sim-return">    return count / trials</span>
    `;
    
    updateHistogram();
}

// ------------------------------------------------------------
// DICE ANIMATION
// ------------------------------------------------------------
function animateDiceToFace(diceElement, face, delay = 0) {
    const orientations = {
        1: { x: 0, y: 0 },
        2: { x: 0, y: 180 },
        3: { x: 0, y: -90 },
        4: { x: 0, y: 90 },
        5: { x: -90, y: 0 },
        6: { x: 90, y: 0 },
    };
    const o = orientations[face] || { x: 0, y: 0 };
    const extraX = 360 * 2;
    const extraY = 360 * 3;

    setTimeout(() => {
        diceElement.style.transition = 'transform 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.1)';
        diceElement.style.transform = `rotateX(${extraX + o.x}deg) rotateY(${extraY + o.y}deg)`;
    }, delay);
}

// ------------------------------------------------------------
// ROLL DICE — multiple physical dice, each doing n binomial trials
// ------------------------------------------------------------
function rollDice() {
    if (state.rolling) return;
    state.rolling = true;
    rollBtn.disabled = true;

    const diceCount = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
    const n = Math.min(100, Math.max(1, parseInt(nInput.value) || 10));
    const k = Math.min(n * diceCount, Math.max(0, parseInt(kInput.value) || 3));
    const p = Math.min(0.99, Math.max(0.01, parseFloat(pInput.value) || 0.5));
    
    state.diceCount = diceCount;
    state.n = n;
    state.k = k;
    state.p = p;
    
    diceCountInput.value = diceCount;
    nInput.value = n;
    kInput.value = k;
    pInput.value = p;

    playRollSound();

    // Highlight simulation algorithm steps
    setTimeout(() => highlightAlgorithmStep('sim-def'), 100);
    setTimeout(() => highlightAlgorithmStep('sim-succ-init'), 300);
    setTimeout(() => highlightAlgorithmStep('sim-dice-loop'), 500);

    // Roll each physical dice
    const rolls = [];
    let totalSuccesses = 0;
    
    for (let diceIndex = 0; diceIndex < diceCount; diceIndex++) {
        // Each dice does n trials 
        let diceSuccesses = 0;
        for (let trial = 0; trial < n; trial++) {
            if (Math.random() < p) diceSuccesses++;
        }
        totalSuccesses += diceSuccesses;
        
        // Visual roll for this dice
        const visualFace = Math.floor(Math.random() * 6) + 1;
        rolls.push(visualFace);
        
        const diceElement = document.getElementById(`dice-${diceIndex}`);
        if (diceElement) {
            // Check if this dice should glow (same as previous roll)
            const shouldGlow = state.lastRolls && state.lastRolls[diceIndex] === visualFace;
            
            if (shouldGlow) {
                // Add glow effect instead of animation
                diceElement.classList.add('glow-green');
                setTimeout(() => {
                    diceElement.classList.remove('glow-green');
                }, 1000);
            } else {
                // Normal animation
                animateDiceToFace(diceElement, visualFace, diceIndex * 100);
            }
        }
    }
    
    // Highlight success check
    setTimeout(() => highlightAlgorithmStep('sim-trial-loop'), 700);
    setTimeout(() => highlightAlgorithmStep('sim-check'), 900);
    
    state.lastRolls = rolls;
    state.lastSuccesses = totalSuccesses;
    state.trials += 1;
    
    // Update distribution tracking
    if (!state.successDistribution[totalSuccesses]) {
        state.successDistribution[totalSuccesses] = 0;
    }
    state.successDistribution[totalSuccesses]++;
    
    // Check if total successes equals k
    if (totalSuccesses === k) state.successCount += 1;

    setTimeout(() => {
        updateStats();
        state.rolling = false;
        rollBtn.disabled = false;
        setTimeout(() => {
            playImpactSound();
            setTimeout(() => {
                playDingSound();
            }, 120);
        }, 400);
    }, 200);
}

// ------------------------------------------------------------
// RESET
// ------------------------------------------------------------
function resetSimulation() {
    if (state.rolling || state.autoTrialRunning) return;
    state.trials = 0;
    state.successCount = 0;
    state.lastRolls = [];
    state.lastSuccesses = null;
    state.successDistribution = {};
    state.autoTrialProgress = 0;
    
    autoProgressText.textContent = 'Ready';
    
    // Reset all dice
    const allDice = diceContainer.querySelectorAll('.dice');
    allDice.forEach(dice => {
        dice.style.transition = 'transform 0.5s ease';
        dice.style.transform = `rotateX(0deg) rotateY(0deg)`;
    });
    
    updateStats();
}

// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------
rollBtn.addEventListener('click', rollDice);
resetBtn.addEventListener('click', resetSimulation);
algorithmToggle.addEventListener('click', toggleAlgorithmPanel);
startAutoTrialBtn.addEventListener('click', startAutoTrial);
stopAutoTrialBtn.addEventListener('click', stopAutoTrial);

diceCountInput.addEventListener('change', () => {
    const count = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
    state.diceCount = count;
    diceCountInput.value = count;
    updateDiceDisplay();
    updateStats();
});

// Add event listener for n input to update k max
nInput.addEventListener('change', () => {
    updateKInputMax();
});

document.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            rollDice();
        }
    });
});

[nInput, kInput, pInput].forEach(inp => {
    inp.addEventListener('change', () => {
        const n = Math.min(100, Math.max(1, parseInt(nInput.value) || 10));
        const diceCount = Math.min(10, Math.max(1, parseInt(diceCountInput.value) || 1));
        const k = Math.min(n * diceCount, Math.max(0, parseInt(kInput.value) || 3));
        const p = Math.min(0.99, Math.max(0.01, parseFloat(pInput.value) || 0.5));
        state.n = n;
        state.k = k;
        state.p = p;
        nInput.value = n;
        kInput.value = k;
        pInput.value = p;
        updateKInputMax(); // Update k max when n changes
        updateStats();
    });
});

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
(function init() {
    diceCountInput.value = 1;
    nInput.value = 10;
    kInput.value = 3;
    pInput.value = 0.5;
    autoTrialsInput.value = 100;
    state.diceCount = 1;
    state.n = 10;
    state.k = 3;
    state.p = 0.5;
    
    updateDiceDisplay();
    updateKInputMax(); // Set correct k maximum on init
    updateStats();

    document.body.addEventListener('click', () => {
        initAudio();
    }, { once: true });
})();
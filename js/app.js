/* Seesaw Simulation - Main Application */

// Audio Context (Web Audio API)
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    try {
        const ctx = initAudio();
        if (ctx.state === 'suspended') ctx.resume();
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        // Audio not supported
    }
}

function playDropSound() {
    // Falling whistle sound (descending pitch)
    playSound(600, 0.15, 'sine', 0.2);
    setTimeout(() => playSound(400, 0.1, 'sine', 0.15), 100);
}

function playLandSound(weight) {
    // Impact sound - heavier = lower pitch, louder
    const basePitch = 200 - (weight * 10);
    const volume = 0.2 + (weight * 0.03);
    playSound(Math.max(80, basePitch), 0.2, 'triangle', Math.min(0.5, volume));
}

function playResetSound() {
    // Quick sweep up
    playSound(300, 0.1, 'square', 0.15);
    setTimeout(() => playSound(500, 0.1, 'square', 0.15), 80);
    setTimeout(() => playSound(700, 0.15, 'square', 0.1), 160);
}

// State
const state = {
    currentAngle: 0,
    leftTorque: 0,
    rightTorque: 0,
    leftWeight: 0,
    rightWeight: 0,
    nextWeight: 0,
    objects: [],
    objectIdCounter: 0,
    plankWidth: CONFIG.PLANK_WIDTH  // Dinamik plank genişliği
};

// Helpers
function generateRandomWeight() {
    return Math.floor(Math.random() * CONFIG.MAX_WEIGHT) + CONFIG.MIN_WEIGHT;
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function getRandomColor() {
    return CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
}

function createRuler() {
    const ruler = document.getElementById('ruler');
    if (!ruler) return;
    
    ruler.innerHTML = '';
    const halfWidth = state.plankWidth / 2;
    
    // Dinamik tick'ler oluştur (her 50px'de bir)
    const ticks = [];
    for (let pos = -Math.floor(halfWidth / 50) * 50; pos <= Math.floor(halfWidth / 50) * 50; pos += 50) {
        ticks.push(pos);
    }
    // Uç noktaları ekle
    if (!ticks.includes(-halfWidth)) ticks.unshift(-halfWidth);
    if (!ticks.includes(halfWidth)) ticks.push(halfWidth);
    
    ticks.forEach(pos => {
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        if (pos === 0) tick.classList.add('center', 'major');
        else if (Math.abs(pos) === halfWidth) tick.classList.add('major');
        tick.innerHTML = `<span>${pos === 0 ? '0' : pos + 'px'}</span>`;
        tick.style.left = (state.plankWidth / 2 + pos) + 'px';
        ruler.appendChild(tick);
    });
    
    // Ruler genişliğini güncelle
    ruler.style.width = state.plankWidth + 'px';
}

// Physics
function calculateTargetAngle() {
    const torqueDiff = state.rightTorque - state.leftTorque;
    return Math.max(-CONFIG.MAX_ANGLE, Math.min(CONFIG.MAX_ANGLE, torqueDiff / CONFIG.TORQUE_DIVISOR));
}

function addTorque(side, weight, distance) {
    const torque = weight * distance;
    if (side === 'left') {
        state.leftTorque += torque;
        state.leftWeight += weight;
    } else {
        state.rightTorque += torque;
        state.rightWeight += weight;
    }
}

function updateAngle(targetAngle) {
    state.currentAngle += (targetAngle - state.currentAngle) * CONFIG.ANIMATION_SPEED;
}

// Storage
function saveState() {
    try {
        const data = {
            currentAngle: state.currentAngle,
            leftTorque: state.leftTorque,
            rightTorque: state.rightTorque,
            leftWeight: state.leftWeight,
            rightWeight: state.rightWeight,
            nextWeight: state.nextWeight,
            objectIdCounter: state.objectIdCounter,
            plankWidth: state.plankWidth,
            objects: state.objects.map(obj => ({
                id: obj.id,
                position: obj.position,
                distance: obj.distance,
                side: obj.side,
                weight: obj.weight,
                size: obj.size,
                color: obj.color,
                torqueApplied: obj.torqueApplied
            }))
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Storage save error:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!saved) return false;
        
        const data = JSON.parse(saved);
        state.currentAngle = data.currentAngle || 0;
        state.leftTorque = data.leftTorque || 0;
        state.rightTorque = data.rightTorque || 0;
        state.leftWeight = data.leftWeight || 0;
        state.rightWeight = data.rightWeight || 0;
        state.nextWeight = data.nextWeight || generateRandomWeight();
        state.objectIdCounter = data.objectIdCounter || 0;
        state.plankWidth = data.plankWidth || CONFIG.PLANK_WIDTH;
        state.objects = data.objects || [];
        return true;
    } catch (e) {
        console.warn('Storage load error:', e);
        return false;
    }
}

function clearStorage() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    } catch (e) {
        console.warn('Storage clear error:', e);
    }
}

// DOM elements
let seesawContainer, seesawPlank, logContainer;
let lastDisplayedAngle = null;

// Renderer
function updateStats() {
    document.getElementById('leftWeight').textContent = state.leftWeight.toFixed(1) + ' kg';
    document.getElementById('rightWeight').textContent = state.rightWeight.toFixed(1) + ' kg';
    document.getElementById('nextWeight').textContent = state.nextWeight + ' kg';
    document.getElementById('angle').textContent = state.currentAngle.toFixed(1) + '°';
    updateTorquePanel();
}

function updateTorquePanel() {
    document.getElementById('leftTorqueDisplay').textContent = state.leftTorque.toFixed(0);
    document.getElementById('rightTorqueDisplay').textContent = state.rightTorque.toFixed(0);
    
    const netTorque = state.rightTorque - state.leftTorque;
    document.getElementById('netTorque').textContent = (netTorque >= 0 ? '+' : '') + netTorque.toFixed(0);
    
    // Balance indicator
    const indicator = document.getElementById('balanceIndicator');
    indicator.className = 'balance-indicator';
    if (netTorque < -50) indicator.classList.add('left');
    else if (netTorque > 50) indicator.classList.add('right');
    
    // Formulas
    const leftObjs = state.objects.filter(o => o.side === 'left' && o.torqueApplied);
    const rightObjs = state.objects.filter(o => o.side === 'right' && o.torqueApplied);
    
    const leftFormula = leftObjs.length > 0 
        ? leftObjs.map(o => `${o.weight}×${o.distance.toFixed(0)}`).join(' + ')
        : '-';
    const rightFormula = rightObjs.length > 0
        ? rightObjs.map(o => `${o.weight}×${o.distance.toFixed(0)}`).join(' + ')
        : '-';
    
    document.getElementById('leftFormula').textContent = leftFormula;
    document.getElementById('rightFormula').textContent = rightFormula;
}

function updatePlankRotation() {
    seesawPlank.style.transform = `translate(-50%, -100%) rotate(${state.currentAngle}deg)`;
}

function updateObjectPosition(obj) {
    if (!obj.element) return;
    
    const centerX = CONFIG.CONTAINER_WIDTH / 2;
    const centerY = CONFIG.CONTAINER_HEIGHT / 2 + CONFIG.PIVOT_OFFSET;
    const angleRad = degreesToRadians(state.currentAngle);
    
    if (obj.falling) {
        obj.y += CONFIG.FALL_SPEED;
        
        // Plank koordinat sistemine göre pozisyon hesapla
        const rotatedX = obj.position * Math.cos(angleRad);
        const rotatedY = obj.position * Math.sin(angleRad);
        const targetY = centerY + rotatedY - obj.size - CONFIG.PLANK_HEIGHT;
        
        if (obj.y >= targetY) {
            obj.y = targetY;
            obj.falling = false;
            obj.bounceVelocity = CONFIG.BOUNCE_INITIAL;
            
            if (!obj.torqueApplied) {
                obj.torqueApplied = true;
                // Tork hesaplaması: plank üzerindeki mesafe (obj.distance)
                addTorque(obj.side, obj.weight, obj.distance);
                updateStats();
                addLogEntry(`✓ ${obj.weight}kg landed on ${obj.side} side at ${obj.distance.toFixed(0)}px`);
                playLandSound(obj.weight);
                saveState();
            }
            updateObjectPosition(obj);
            return;
        }
        
        // Düşerken de plank açısına göre X pozisyonu
        obj.element.style.left = (centerX + rotatedX - obj.size) + 'px';
        obj.element.style.top = obj.y + 'px';
    } else {
        const rotatedX = obj.position * Math.cos(angleRad);
        const rotatedY = obj.position * Math.sin(angleRad);
        
        let bounceOffset = 0;
        if (Math.abs(obj.bounceVelocity) > 0.1) {
            bounceOffset = obj.bounceVelocity;
            obj.bounceVelocity += CONFIG.BOUNCE_DECELERATION;
            if (obj.bounceVelocity > 0) obj.bounceVelocity = 0;
        }
        
        const bounceX = bounceOffset * Math.sin(angleRad);
        const bounceY = bounceOffset * Math.cos(angleRad);
        
        obj.element.style.left = (centerX + rotatedX - obj.size + bounceX) + 'px';
        obj.element.style.top = (centerY + rotatedY - obj.size - CONFIG.PLANK_HEIGHT + bounceY) + 'px';
    }
}

function createObjectElement(data) {
    const el = document.createElement('div');
    el.className = 'object';
    el.style.width = data.size * 2 + 'px';
    el.style.height = data.size * 2 + 'px';
    el.style.background = data.color;
    el.textContent = data.weight + 'kg';
    seesawContainer.appendChild(el);
    return el;
}

function clearAllObjects() {
    state.objects.forEach(obj => {
        if (obj.element && obj.element.parentNode) {
            obj.element.parentNode.removeChild(obj.element);
        }
    });
}

function addLogEntry(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logContainer.insertBefore(entry, logContainer.firstChild);
    while (logContainer.children.length > 10) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function clearLog() {
    logContainer.innerHTML = '';
}

// Animation Loop
function animationLoop() {
    const targetAngle = calculateTargetAngle();
    updateAngle(targetAngle);
    updatePlankRotation();
    
    const rounded = Math.round(state.currentAngle * 10) / 10;
    if (lastDisplayedAngle !== rounded) {
        lastDisplayedAngle = rounded;
        document.getElementById('angle').textContent = rounded.toFixed(1) + '°';
    }
    
    state.objects.forEach(obj => {
        if (obj.element) updateObjectPosition(obj);
    });
    
    requestAnimationFrame(animationLoop);
}

// Preview
let previewLine = null;
let previewObject = null;
let currentPreviewPosition = null;
let currentPreviewColor = null;

function showPreview(positionX) {
    const centerX = CONFIG.CONTAINER_WIDTH / 2;
    const centerY = CONFIG.CONTAINER_HEIGHT / 2 + CONFIG.PIVOT_OFFSET;
    const weight = state.nextWeight;
    const size = CONFIG.BASE_OBJECT_SIZE + (weight * CONFIG.SIZE_PER_KG);
    const angleRad = degreesToRadians(state.currentAngle);
    
    // Plank koordinat sistemine göre pozisyon hesapla
    const rotatedX = positionX * Math.cos(angleRad);
    const rotatedY = positionX * Math.sin(angleRad);
    const targetY = centerY + rotatedY - size - CONFIG.PLANK_HEIGHT;
    
    if (!previewLine) {
        previewLine = document.createElement('div');
        previewLine.className = 'preview-line';
        seesawContainer.appendChild(previewLine);
    }
    
    if (!previewObject) {
        previewObject = document.createElement('div');
        previewObject.className = 'preview-object';
        seesawContainer.appendChild(previewObject);
    }
    
    // Line ve object pozisyonları plank açısına göre
    const lineX = centerX + rotatedX - 1;
    const lineTop = 20;
    const lineHeight = targetY - lineTop;
    
    previewLine.style.left = lineX + 'px';
    previewLine.style.top = lineTop + 'px';
    previewLine.style.height = Math.max(0, lineHeight) + 'px';
    
    previewObject.style.width = size * 2 + 'px';
    previewObject.style.height = size * 2 + 'px';
    previewObject.style.left = (centerX + rotatedX - size) + 'px';
    previewObject.style.top = (lineTop - size) + 'px';
    previewObject.style.background = currentPreviewColor;
    previewObject.textContent = weight + 'kg';
}

function removePreview() {
    if (previewLine && previewLine.parentNode) {
        previewLine.parentNode.removeChild(previewLine);
        previewLine = null;
    }
    if (previewObject && previewObject.parentNode) {
        previewObject.parentNode.removeChild(previewObject);
        previewObject = null;
    }
    currentPreviewPosition = null;
}

// Events
function isOnPlank(relX, relY, angleRad) {
    // Rotate click position to plank's local coordinate system
    const unrotatedX = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
    const unrotatedY = relX * Math.sin(-angleRad) + relY * Math.cos(-angleRad);
    
    // Check X bounds (plank width) - dinamik genişlik kullan
    if (Math.abs(unrotatedX) > state.plankWidth / 2 || Math.abs(unrotatedX) < 10) {
        return null;
    }
    
    // Check Y bounds (plank height + tolerance for clicking above)
    // Plank is at PIVOT_OFFSET below center, and we want clicks slightly above it
    const plankYOffset = CONFIG.PIVOT_OFFSET;
    const tolerance = CONFIG.PLANK_HEIGHT + 40; // Click area above the plank
    
    // unrotatedY should be near the plank level (slightly above or on it)
    if (unrotatedY < plankYOffset - tolerance || unrotatedY > plankYOffset + CONFIG.PLANK_HEIGHT + 20) {
        return null;
    }
    
    return unrotatedX;
}

function handleSeesawClick(event) {
    let positionFromCenter;
    
    if (currentPreviewPosition !== null) {
        positionFromCenter = currentPreviewPosition;
    } else {
        const rect = seesawContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const relX = event.clientX - centerX;
        const relY = event.clientY - centerY;
        const angleRad = degreesToRadians(state.currentAngle);
        
        positionFromCenter = isOnPlank(relX, relY, angleRad);
        
        if (positionFromCenter === null) {
            return;
        }
    }
    
    const side = positionFromCenter < 0 ? 'left' : 'right';
    const distance = Math.abs(positionFromCenter);
    const weight = state.nextWeight;
    const size = CONFIG.BASE_OBJECT_SIZE + (weight * CONFIG.SIZE_PER_KG);
    const color = currentPreviewColor || getRandomColor();
    
    const objData = {
        id: state.objectIdCounter++,
        position: positionFromCenter,
        distance: distance,
        side: side,
        weight: weight,
        size: size,
        color: color,
        element: null,
        falling: true,
        y: -size,
        bounceVelocity: 0,
        torqueApplied: false
    };
    
    objData.element = createObjectElement(objData);
    state.objects.push(objData);
    saveState();
    
    state.nextWeight = generateRandomWeight();
    currentPreviewColor = getRandomColor();
    
    updateStats();
    addLogEntry(`📦 ${weight}kg dropping on ${side} side...`);
    playDropSound();
    removePreview();
}

function handleSeesawHover(event) {
    const rect = seesawContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = event.clientX - centerX;
    const relY = event.clientY - centerY;
    const angleRad = degreesToRadians(state.currentAngle);
    
    const unrotatedX = isOnPlank(relX, relY, angleRad);
    
    if (unrotatedX === null) {
        removePreview();
        return;
    }
    
    currentPreviewPosition = unrotatedX;
    showPreview(unrotatedX);
}

function handleReset() {
    clearAllObjects();
    state.currentAngle = 0;
    state.leftTorque = 0;
    state.rightTorque = 0;
    state.leftWeight = 0;
    state.rightWeight = 0;
    state.objects = [];
    state.objectIdCounter = 0;
    state.nextWeight = generateRandomWeight();
    clearStorage();
    clearLog();
    updateStats();
    updatePlankRotation();
    addLogEntry('🔄 Seesaw has been reset');
    playResetSound();
}

// Init
// Plank Width Control
function getMinPlankWidth() {
    // En uzaktaki nesnenin mesafesine göre minimum genişlik
    if (state.objects.length === 0) return CONFIG.MIN_PLANK_WIDTH;
    
    const maxDistance = Math.max(...state.objects.map(obj => Math.abs(obj.position)));
    // Minimum genişlik = en uzak nesne mesafesi × 2 + 20px buffer
    return Math.max(CONFIG.MIN_PLANK_WIDTH, Math.ceil((maxDistance + 20) * 2));
}

function updatePlankWidth(newWidth) {
    const minWidth = getMinPlankWidth();
    
    // Minimum genişlik kontrolü
    if (newWidth < minWidth) {
        newWidth = minWidth;
        // Slider'ı minimum değere ayarla
        const slider = document.getElementById('plankWidthSlider');
        if (slider) slider.value = newWidth;
    }
    
    state.plankWidth = newWidth;
    
    // Plank CSS güncelle
    seesawPlank.style.width = newWidth + 'px';
    
    // Ruler yeniden oluştur
    createRuler();
    
    // Slider değerini güncelle
    document.getElementById('plankWidthValue').textContent = newWidth + 'px';
    
    // State kaydet
    saveState();
}

function handlePlankSliderChange(event) {
    const newWidth = parseInt(event.target.value);
    updatePlankWidth(newWidth);
}

function init() {
    seesawContainer = document.getElementById('seesawContainer');
    seesawPlank = document.getElementById('seesawPlank');
    logContainer = document.getElementById('log');
    
    // Load saved state or start fresh
    if (loadState() && state.objects.length > 0) {
        state.objects.forEach(obj => {
            obj.element = createObjectElement(obj);
            obj.falling = false;
            obj.bounceVelocity = 0;
        });
        addLogEntry(`📂 Restored ${state.objects.length} object(s) from saved state`);
    } else {
        state.nextWeight = generateRandomWeight();
    }
    
    // Plank genişliğini başlat
    seesawPlank.style.width = state.plankWidth + 'px';
    const slider = document.getElementById('plankWidthSlider');
    if (slider) {
        slider.value = state.plankWidth;
        slider.addEventListener('input', handlePlankSliderChange);
    }
    document.getElementById('plankWidthValue').textContent = state.plankWidth + 'px';
    
    createRuler();
    currentPreviewColor = getRandomColor();
    
    seesawContainer.addEventListener('click', handleSeesawClick);
    seesawContainer.addEventListener('mousemove', handleSeesawHover);
    seesawContainer.addEventListener('mouseleave', removePreview);
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    
    updateStats();
    updatePlankRotation();
    requestAnimationFrame(animationLoop);
}

document.addEventListener('DOMContentLoaded', init);

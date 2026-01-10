/* Seesaw Simulation - Main Application */

// State
const state = {
    currentAngle: 0,
    leftTorque: 0,
    rightTorque: 0,
    leftWeight: 0,
    rightWeight: 0,
    nextWeight: 0,
    objects: [],
    objectIdCounter: 0
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
    const ticks = [-200, -150, -100, -50, 0, 50, 100, 150, 200];
    
    ticks.forEach(pos => {
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        if (pos === 0) tick.classList.add('center', 'major');
        else if (Math.abs(pos) === 200) tick.classList.add('major');
        tick.innerHTML = `<span>${pos === 0 ? '0' : pos + 'px'}</span>`;
        ruler.appendChild(tick);
    });
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
        const rotatedY = obj.position * Math.sin(angleRad);
        const targetY = centerY + rotatedY - obj.size - CONFIG.PLANK_HEIGHT;
        
        if (obj.y >= targetY) {
            obj.y = targetY;
            obj.falling = false;
            obj.bounceVelocity = CONFIG.BOUNCE_INITIAL;
            
            if (!obj.torqueApplied) {
                obj.torqueApplied = true;
                addTorque(obj.side, obj.weight, obj.distance);
                updateStats();
                addLogEntry(`✓ ${obj.weight}kg landed on ${obj.side} side at ${obj.distance.toFixed(0)}px`);
                saveState();
            }
            updateObjectPosition(obj);
            return;
        }
        
        obj.element.style.left = (centerX + obj.position - obj.size) + 'px';
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
    const centerY = CONFIG.CONTAINER_HEIGHT / 2;
    const weight = state.nextWeight;
    const size = CONFIG.BASE_OBJECT_SIZE + (weight * CONFIG.SIZE_PER_KG);
    const angleRad = degreesToRadians(state.currentAngle);
    const targetY = centerY + positionX * Math.sin(angleRad);
    
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
    
    const lineX = centerX + positionX - 1;
    const lineTop = 20;
    const lineHeight = targetY - lineTop - size;
    
    previewLine.style.left = lineX + 'px';
    previewLine.style.top = lineTop + 'px';
    previewLine.style.height = Math.max(0, lineHeight) + 'px';
    
    previewObject.style.width = size * 2 + 'px';
    previewObject.style.height = size * 2 + 'px';
    previewObject.style.left = (centerX + positionX - size) + 'px';
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
        
        positionFromCenter = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
        
        if (Math.abs(positionFromCenter) > CONFIG.PLANK_WIDTH / 2 || Math.abs(positionFromCenter) < 10) {
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
    removePreview();
}

function handleSeesawHover(event) {
    const rect = seesawContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const relX = event.clientX - centerX;
    const relY = event.clientY - centerY;
    const angleRad = degreesToRadians(state.currentAngle);
    
    const unrotatedX = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
    
    if (Math.abs(unrotatedX) > CONFIG.PLANK_WIDTH / 2 || Math.abs(unrotatedX) < 10) {
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
}

// Init
function init() {
    seesawContainer = document.getElementById('seesawContainer');
    seesawPlank = document.getElementById('seesawPlank');
    logContainer = document.getElementById('log');
    
    createRuler();
    
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

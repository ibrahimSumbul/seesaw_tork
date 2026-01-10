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

// DOM elements
let seesawContainer, seesawPlank, logContainer;
let lastDisplayedAngle = null;

// Renderer
function updateStats() {
    document.getElementById('leftWeight').textContent = state.leftWeight.toFixed(1) + ' kg';
    document.getElementById('rightWeight').textContent = state.rightWeight.toFixed(1) + ' kg';
    document.getElementById('nextWeight').textContent = state.nextWeight + ' kg';
    document.getElementById('angle').textContent = state.currentAngle.toFixed(1) + '°';
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

// Init
function init() {
    seesawContainer = document.getElementById('seesawContainer');
    seesawPlank = document.getElementById('seesawPlank');
    logContainer = document.getElementById('log');
    
    state.nextWeight = generateRandomWeight();
    updateStats();
    updatePlankRotation();
    requestAnimationFrame(animationLoop);
}

document.addEventListener('DOMContentLoaded', init);

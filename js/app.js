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

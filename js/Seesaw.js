/* Seesaw Simulation - Seesaw Class */

class Seesaw {
    constructor(id, containerElement, options = {}) {
        this.id = id;
        this.name = options.name || 'Seesaw ' + (id + 1);
        this.container = containerElement;
        
        // DOM elements
        this.plankElement = null;
        this.rulerElement = null;
        this.logElement = null;
        
        // Preview elements
        this.previewLine = null;
        this.previewObject = null;
        this.currentPreviewPosition = null;
        this.currentPreviewColor = null;
        
        // State
        this.state = {
            currentAngle: 0,
            leftTorque: 0,
            rightTorque: 0,
            leftWeight: 0,
            rightWeight: 0,
            nextWeight: 0,
            objects: [],
            objectIdCounter: 0,
            plankWidth: CONFIG.PLANK_WIDTH
        };
        
        this.lastDisplayedAngle = null;
        this.animationId = null;
        this.isActive = false;
        
        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleHover = this.handleHover.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.animationLoop = this.animationLoop.bind(this);
    }

    // Initialization
    init() {
        this.plankElement = this.container.querySelector('.seesaw-plank');
        this.rulerElement = this.container.querySelector('.ruler');
        this.logElement = document.getElementById('log');
        
        this.state.nextWeight = this.generateRandomWeight();
        this.currentPreviewColor = this.getRandomColor();
        
        this.createRuler();
        this.updatePlankWidth(this.state.plankWidth);
        
        return this;
    }

    // Activate/Deactivate
    activate() {
        if (this.isActive) return;
        this.isActive = true;
        
        this.container.addEventListener('click', this.handleClick);
        this.container.addEventListener('mousemove', this.handleHover);
        this.container.addEventListener('mouseleave', this.handleMouseLeave);
        
        this.startAnimation();
        this.updateStats();
        this.updatePlankRotation();
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        
        this.container.removeEventListener('click', this.handleClick);
        this.container.removeEventListener('mousemove', this.handleHover);
        this.container.removeEventListener('mouseleave', this.handleMouseLeave);
        
        this.stopAnimation();
        this.removePreview();
    }

    // Animation
    startAnimation() {
        if (this.animationId) return;
        this.animationLoop();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animationLoop() {
        if (!this.isActive) return;
        
        const targetAngle = this.calculateTargetAngle();
        this.updateAngle(targetAngle);
        this.updatePlankRotation();
        
        const rounded = Math.round(this.state.currentAngle * 10) / 10;
        if (this.lastDisplayedAngle !== rounded) {
            this.lastDisplayedAngle = rounded;
            const angleEl = document.getElementById('angle');
            if (angleEl) angleEl.textContent = rounded.toFixed(1) + '°';
        }
        
        this.state.objects.forEach(obj => {
            if (obj.element) this.updateObjectPosition(obj);
        });
        
        this.animationId = requestAnimationFrame(this.animationLoop);
    }

    // Helpers
    generateRandomWeight() {
        return Math.floor(Math.random() * CONFIG.MAX_WEIGHT) + CONFIG.MIN_WEIGHT;
    }

    degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    getRandomColor() {
        return CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
    }

    // Ruler
    createRuler() {
        if (!this.rulerElement) return;
        
        this.rulerElement.innerHTML = '';
        const halfWidth = this.state.plankWidth / 2;
        
        const ticks = [];
        for (let pos = -Math.floor(halfWidth / 50) * 50; pos <= Math.floor(halfWidth / 50) * 50; pos += 50) {
            ticks.push(pos);
        }
        if (!ticks.includes(-halfWidth)) ticks.unshift(-halfWidth);
        if (!ticks.includes(halfWidth)) ticks.push(halfWidth);
        
        ticks.forEach(pos => {
            const tick = document.createElement('div');
            tick.className = 'ruler-tick';
            if (pos === 0) tick.classList.add('center', 'major');
            else if (Math.abs(pos) === halfWidth) tick.classList.add('major');
            tick.innerHTML = `<span>${pos === 0 ? '0' : pos + 'px'}</span>`;
            tick.style.left = (this.state.plankWidth / 2 + pos) + 'px';
            this.rulerElement.appendChild(tick);
        });
        
        this.rulerElement.style.width = this.state.plankWidth + 'px';
    }

    // Physics
    calculateTargetAngle() {
        const torqueDiff = this.state.rightTorque - this.state.leftTorque;
        return Math.max(-CONFIG.MAX_ANGLE, Math.min(CONFIG.MAX_ANGLE, torqueDiff / CONFIG.TORQUE_DIVISOR));
    }

    addTorque(side, weight, distance) {
        const torque = weight * distance;
        if (side === 'left') {
            this.state.leftTorque += torque;
            this.state.leftWeight += weight;
        } else {
            this.state.rightTorque += torque;
            this.state.rightWeight += weight;
        }
    }

    updateAngle(targetAngle) {
        this.state.currentAngle += (targetAngle - this.state.currentAngle) * CONFIG.ANIMATION_SPEED;
    }

    // Renderer
    updateStats() {
        const leftWeightEl = document.getElementById('leftWeight');
        const rightWeightEl = document.getElementById('rightWeight');
        const nextWeightEl = document.getElementById('nextWeight');
        const angleEl = document.getElementById('angle');
        
        if (leftWeightEl) leftWeightEl.textContent = this.state.leftWeight.toFixed(1) + ' kg';
        if (rightWeightEl) rightWeightEl.textContent = this.state.rightWeight.toFixed(1) + ' kg';
        if (nextWeightEl) nextWeightEl.textContent = this.state.nextWeight + ' kg';
        if (angleEl) angleEl.textContent = this.state.currentAngle.toFixed(1) + '°';
        
        this.updateTorquePanel();
    }

    updateTorquePanel() {
        const leftTorqueEl = document.getElementById('leftTorqueDisplay');
        const rightTorqueEl = document.getElementById('rightTorqueDisplay');
        const netTorqueEl = document.getElementById('netTorque');
        const indicatorEl = document.getElementById('balanceIndicator');
        const leftFormulaEl = document.getElementById('leftFormula');
        const rightFormulaEl = document.getElementById('rightFormula');
        
        if (leftTorqueEl) leftTorqueEl.textContent = this.state.leftTorque.toFixed(0);
        if (rightTorqueEl) rightTorqueEl.textContent = this.state.rightTorque.toFixed(0);
        
        const netTorque = this.state.rightTorque - this.state.leftTorque;
        if (netTorqueEl) netTorqueEl.textContent = (netTorque >= 0 ? '+' : '') + netTorque.toFixed(0);
        
        if (indicatorEl) {
            indicatorEl.className = 'balance-indicator';
            if (netTorque < -50) indicatorEl.classList.add('left');
            else if (netTorque > 50) indicatorEl.classList.add('right');
        }
        
        const leftObjs = this.state.objects.filter(o => o.side === 'left' && o.torqueApplied);
        const rightObjs = this.state.objects.filter(o => o.side === 'right' && o.torqueApplied);
        
        if (leftFormulaEl) {
            leftFormulaEl.textContent = leftObjs.length > 0 
                ? leftObjs.map(o => `${o.weight}×${o.distance.toFixed(0)}`).join(' + ')
                : '-';
        }
        if (rightFormulaEl) {
            rightFormulaEl.textContent = rightObjs.length > 0
                ? rightObjs.map(o => `${o.weight}×${o.distance.toFixed(0)}`).join(' + ')
                : '-';
        }
    }

    updatePlankRotation() {
        if (this.plankElement) {
            this.plankElement.style.transform = `translate(-50%, -100%) rotate(${this.state.currentAngle}deg)`;
        }
    }

    updateObjectPosition(obj) {
        if (!obj.element) return;
        
        const centerX = CONFIG.CONTAINER_WIDTH / 2;
        const centerY = CONFIG.CONTAINER_HEIGHT / 2 + CONFIG.PIVOT_OFFSET;
        const angleRad = this.degreesToRadians(this.state.currentAngle);
        
        if (obj.falling) {
            obj.y += CONFIG.FALL_SPEED;
            
            const rotatedX = obj.position * Math.cos(angleRad);
            const rotatedY = obj.position * Math.sin(angleRad);
            const targetY = centerY + rotatedY - obj.size - CONFIG.PLANK_HEIGHT;
            
            if (obj.y >= targetY) {
                obj.y = targetY;
                obj.falling = false;
                obj.bounceVelocity = CONFIG.BOUNCE_INITIAL;
                
                if (!obj.torqueApplied) {
                    obj.torqueApplied = true;
                    this.addTorque(obj.side, obj.weight, obj.distance);
                    this.updateStats();
                    this.addLogEntry(`✓ ${obj.weight}kg landed on ${obj.side} side at ${obj.distance.toFixed(0)}px`);
                    AudioManager.playLandSound(obj.weight);
                    this.save();
                }
                this.updateObjectPosition(obj);
                return;
            }
            
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

    createObjectElement(data) {
        const el = document.createElement('div');
        el.className = 'object';
        el.style.width = data.size * 2 + 'px';
        el.style.height = data.size * 2 + 'px';
        el.style.background = data.color;
        el.textContent = data.weight + 'kg';
        this.container.appendChild(el);
        return el;
    }

    clearAllObjects() {
        this.state.objects.forEach(obj => {
            if (obj.element && obj.element.parentNode) {
                obj.element.parentNode.removeChild(obj.element);
            }
        });
    }

    addLogEntry(message) {
        if (!this.logElement) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = message;
        this.logElement.insertBefore(entry, this.logElement.firstChild);
        while (this.logElement.children.length > 10) {
            this.logElement.removeChild(this.logElement.lastChild);
        }
    }

    clearLog() {
        if (this.logElement) this.logElement.innerHTML = '';
    }

    // Preview
    showPreview(positionX) {
        const centerX = CONFIG.CONTAINER_WIDTH / 2;
        const centerY = CONFIG.CONTAINER_HEIGHT / 2 + CONFIG.PIVOT_OFFSET;
        const weight = this.state.nextWeight;
        const size = CONFIG.BASE_OBJECT_SIZE + (weight * CONFIG.SIZE_PER_KG);
        const angleRad = this.degreesToRadians(this.state.currentAngle);
        
        const rotatedX = positionX * Math.cos(angleRad);
        const rotatedY = positionX * Math.sin(angleRad);
        const targetY = centerY + rotatedY - size - CONFIG.PLANK_HEIGHT;
        
        if (!this.previewLine) {
            this.previewLine = document.createElement('div');
            this.previewLine.className = 'preview-line';
            this.container.appendChild(this.previewLine);
        }
        
        if (!this.previewObject) {
            this.previewObject = document.createElement('div');
            this.previewObject.className = 'preview-object';
            this.container.appendChild(this.previewObject);
        }
        
        const lineX = centerX + rotatedX - 1;
        const lineTop = 20;
        const lineHeight = targetY - lineTop;
        
        this.previewLine.style.left = lineX + 'px';
        this.previewLine.style.top = lineTop + 'px';
        this.previewLine.style.height = Math.max(0, lineHeight) + 'px';
        
        this.previewObject.style.width = size * 2 + 'px';
        this.previewObject.style.height = size * 2 + 'px';
        this.previewObject.style.left = (centerX + rotatedX - size) + 'px';
        this.previewObject.style.top = (lineTop - size) + 'px';
        this.previewObject.style.background = this.currentPreviewColor;
        this.previewObject.textContent = weight + 'kg';
    }

    removePreview() {
        if (this.previewLine && this.previewLine.parentNode) {
            this.previewLine.parentNode.removeChild(this.previewLine);
            this.previewLine = null;
        }
        if (this.previewObject && this.previewObject.parentNode) {
            this.previewObject.parentNode.removeChild(this.previewObject);
            this.previewObject = null;
        }
        this.currentPreviewPosition = null;
    }

    // Events
    isOnPlank(relX, relY, angleRad) {
        const unrotatedX = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
        const unrotatedY = relX * Math.sin(-angleRad) + relY * Math.cos(-angleRad);
        
        if (Math.abs(unrotatedX) > this.state.plankWidth / 2 || Math.abs(unrotatedX) < 10) {
            return null;
        }
        
        const plankYOffset = CONFIG.PIVOT_OFFSET;
        const tolerance = CONFIG.PLANK_HEIGHT + 40;
        
        if (unrotatedY < plankYOffset - tolerance || unrotatedY > plankYOffset + CONFIG.PLANK_HEIGHT + 20) {
            return null;
        }
        
        return unrotatedX;
    }

    handleClick(event) {
        let positionFromCenter;
        
        if (this.currentPreviewPosition !== null) {
            positionFromCenter = this.currentPreviewPosition;
        } else {
            const rect = this.container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const relX = event.clientX - centerX;
            const relY = event.clientY - centerY;
            const angleRad = this.degreesToRadians(this.state.currentAngle);
            
            positionFromCenter = this.isOnPlank(relX, relY, angleRad);
            
            if (positionFromCenter === null) return;
        }
        
        const side = positionFromCenter < 0 ? 'left' : 'right';
        const distance = Math.abs(positionFromCenter);
        const weight = this.state.nextWeight;
        const size = CONFIG.BASE_OBJECT_SIZE + (weight * CONFIG.SIZE_PER_KG);
        const color = this.currentPreviewColor || this.getRandomColor();
        
        const objData = {
            id: this.state.objectIdCounter++,
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
        
        objData.element = this.createObjectElement(objData);
        this.state.objects.push(objData);
        this.save();
        
        this.state.nextWeight = this.generateRandomWeight();
        this.currentPreviewColor = this.getRandomColor();
        
        this.updateStats();
        this.addLogEntry(`📦 ${weight}kg dropping on ${side} side...`);
        AudioManager.playDropSound();
        this.removePreview();
    }

    handleHover(event) {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const relX = event.clientX - centerX;
        const relY = event.clientY - centerY;
        const angleRad = this.degreesToRadians(this.state.currentAngle);
        
        const unrotatedX = this.isOnPlank(relX, relY, angleRad);
        
        if (unrotatedX === null) {
            this.removePreview();
            return;
        }
        
        this.currentPreviewPosition = unrotatedX;
        this.showPreview(unrotatedX);
    }

    handleMouseLeave() {
        this.removePreview();
    }

    // Plank Width
    getMinPlankWidth() {
        if (this.state.objects.length === 0) return CONFIG.MIN_PLANK_WIDTH;
        const maxDistance = Math.max(...this.state.objects.map(obj => Math.abs(obj.position)));
        return Math.max(CONFIG.MIN_PLANK_WIDTH, Math.ceil((maxDistance + 20) * 2));
    }

    updatePlankWidth(newWidth) {
        const minWidth = this.getMinPlankWidth();
        
        if (newWidth < minWidth) {
            newWidth = minWidth;
        }
        
        this.state.plankWidth = newWidth;
        
        if (this.plankElement) {
            this.plankElement.style.width = newWidth + 'px';
        }
        
        this.createRuler();
        
        const sliderValueEl = document.getElementById('plankWidthValue');
        if (sliderValueEl) sliderValueEl.textContent = newWidth + 'px';
        
        const sliderEl = document.getElementById('plankWidthSlider');
        if (sliderEl) sliderEl.value = newWidth;
        
        this.save();
    }

    // Reset
    reset() {
        this.clearAllObjects();
        this.state.currentAngle = 0;
        this.state.leftTorque = 0;
        this.state.rightTorque = 0;
        this.state.leftWeight = 0;
        this.state.rightWeight = 0;
        this.state.objects = [];
        this.state.objectIdCounter = 0;
        this.state.nextWeight = this.generateRandomWeight();
        this.clearLog();
        this.updateStats();
        this.updatePlankRotation();
        this.addLogEntry('🔄 Seesaw has been reset');
        AudioManager.playResetSound();
        this.save();
    }

    // State Management
    getState() {
        return {
            name: this.name,
            plankWidth: this.state.plankWidth,
            currentAngle: this.state.currentAngle,
            leftTorque: this.state.leftTorque,
            rightTorque: this.state.rightTorque,
            leftWeight: this.state.leftWeight,
            rightWeight: this.state.rightWeight,
            nextWeight: this.state.nextWeight,
            objectIdCounter: this.state.objectIdCounter,
            objects: this.state.objects
        };
    }

    loadState(data) {
        if (!data) return;
        
        this.name = data.name || this.name;
        this.state.plankWidth = data.plankWidth || CONFIG.PLANK_WIDTH;
        this.state.currentAngle = data.currentAngle || 0;
        this.state.leftTorque = data.leftTorque || 0;
        this.state.rightTorque = data.rightTorque || 0;
        this.state.leftWeight = data.leftWeight || 0;
        this.state.rightWeight = data.rightWeight || 0;
        this.state.nextWeight = data.nextWeight || this.generateRandomWeight();
        this.state.objectIdCounter = data.objectIdCounter || 0;
        this.state.objects = data.objects || [];
        
        // Recreate object elements
        this.state.objects.forEach(obj => {
            obj.element = this.createObjectElement(obj);
            obj.falling = false;
            obj.bounceVelocity = 0;
        });
        
        this.updatePlankWidth(this.state.plankWidth);
        this.updateStats();
        this.updatePlankRotation();
    }

    save() {
        Storage.saveSeesaw(this.id, this.getState());
    }

    // Cleanup
    destroy() {
        this.deactivate();
        this.clearAllObjects();
        this.removePreview();
    }
}

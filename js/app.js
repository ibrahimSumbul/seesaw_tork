/* Seesaw Simulation - Main Application (Multi-Seesaw Manager) */

// Audio Manager (Web Audio API)
const AudioManager = {
    audioContext: null,

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    playSound(frequency, duration, type = 'sine', volume = 0.3) {
        try {
            const ctx = this.init();
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
    },

    playDropSound() {
        this.playSound(600, 0.15, 'sine', 0.2);
        setTimeout(() => this.playSound(400, 0.1, 'sine', 0.15), 100);
    },

    playLandSound(weight) {
        const basePitch = 200 - (weight * 10);
        const volume = 0.2 + (weight * 0.03);
        this.playSound(Math.max(80, basePitch), 0.2, 'triangle', Math.min(0.5, volume));
    },

    playResetSound() {
        this.playSound(300, 0.1, 'square', 0.15);
        setTimeout(() => this.playSound(500, 0.1, 'square', 0.15), 80);
        setTimeout(() => this.playSound(700, 0.15, 'square', 0.1), 160);
    }
};

// Seesaw Manager
const SeesawManager = {
    seesaws: [],
    activeSeesawId: 0,
    maxSeesaws: 10,
    containerElement: null,

    init() {
        this.containerElement = document.getElementById('seesawContainer');
        
        // Load from storage
        const savedSeesaws = Storage.loadAll();
        const activeId = Storage.getActiveId();
        
        if (savedSeesaws.length > 0) {
            // Restore seesaws
            savedSeesaws.forEach(data => {
                const seesaw = this.createSeesawInstance(data.id);
                seesaw.loadState(data);
            });
            this.switchTo(activeId);
            this.addLogEntry(`📂 Restored ${savedSeesaws.length} seesaw(s)`);
        } else {
            // Create default seesaw
            this.addSeesaw();
        }
        
        this.renderTabs();
        this.setupEventListeners();
    },

    createSeesawInstance(id) {
        const seesaw = new Seesaw(id, this.containerElement);
        seesaw.init();
        this.seesaws.push(seesaw);
        return seesaw;
    },

    addSeesaw() {
        if (this.seesaws.length >= this.maxSeesaws) {
            alert('Maksimum ' + this.maxSeesaws + ' seesaw ekleyebilirsiniz.');
            return null;
        }
        
        const id = Storage.getNextId();
        const seesaw = this.createSeesawInstance(id);
        seesaw.save();
        
        this.switchTo(id);
        this.renderTabs();
        
        return seesaw;
    },

    removeSeesaw(id) {
        if (this.seesaws.length <= 1) {
            alert('En az bir seesaw olmali.');
            return;
        }
        
        const index = this.seesaws.findIndex(s => s.id === id);
        if (index === -1) return;
        
        const seesaw = this.seesaws[index];
        seesaw.destroy();
        this.seesaws.splice(index, 1);
        
        Storage.deleteSeesaw(id);
        
        // Switch to another seesaw
        if (this.activeSeesawId === id) {
            const newActive = this.seesaws[0];
            this.switchTo(newActive.id);
        }
        
        this.renderTabs();
    },

    switchTo(id) {
        // Deactivate current
        const current = this.getActiveSeesaw();
        if (current) {
            current.deactivate();
            current.clearAllObjects();
        }
        
        // Activate new
        const newSeesaw = this.seesaws.find(s => s.id === id);
        if (!newSeesaw) return;
        
        this.activeSeesawId = id;
        Storage.setActiveId(id);
        
        // Reload objects for the new seesaw
        const savedData = Storage.loadSeesaw(id);
        if (savedData && savedData.objects && savedData.objects.length > 0) {
            newSeesaw.clearAllObjects();
            newSeesaw.loadState(savedData);
        }
        
        newSeesaw.activate();
        this.renderTabs();
        this.updateSlider();
    },

    getActiveSeesaw() {
        return this.seesaws.find(s => s.id === this.activeSeesawId) || null;
    },

    renderTabs() {
        const tabsContainer = document.getElementById('seesawTabs');
        if (!tabsContainer) return;
        
        tabsContainer.innerHTML = '';
        
        this.seesaws.forEach(seesaw => {
            const tab = document.createElement('div');
            tab.className = 'seesaw-tab' + (seesaw.id === this.activeSeesawId ? ' active' : '');
            tab.dataset.id = seesaw.id;
            
            const name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = seesaw.name;
            tab.appendChild(name);
            
            // Close button (not for last seesaw)
            if (this.seesaws.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'tab-close';
                closeBtn.textContent = '×';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.removeSeesaw(seesaw.id);
                };
                tab.appendChild(closeBtn);
            }
            
            tab.onclick = () => this.switchTo(seesaw.id);
            tabsContainer.appendChild(tab);
        });
        
        // Add button
        if (this.seesaws.length < this.maxSeesaws) {
            const addBtn = document.createElement('div');
            addBtn.className = 'seesaw-tab add-tab';
            addBtn.textContent = '+';
            addBtn.title = 'Yeni Seesaw Ekle';
            addBtn.onclick = () => this.addSeesaw();
            tabsContainer.appendChild(addBtn);
        }
    },

    setupEventListeners() {
        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            const seesaw = this.getActiveSeesaw();
            if (seesaw) seesaw.reset();
        });
        
        // Plank width slider
        const slider = document.getElementById('plankWidthSlider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                const seesaw = this.getActiveSeesaw();
                if (seesaw) {
                    seesaw.updatePlankWidth(parseInt(e.target.value));
                }
            });
        }
    },

    updateSlider() {
        const seesaw = this.getActiveSeesaw();
        if (!seesaw) return;
        
        const slider = document.getElementById('plankWidthSlider');
        const sliderValue = document.getElementById('plankWidthValue');
        
        if (slider) slider.value = seesaw.state.plankWidth;
        if (sliderValue) sliderValue.textContent = seesaw.state.plankWidth + 'px';
    },

    addLogEntry(message) {
        const logEl = document.getElementById('log');
        if (!logEl) return;
        
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = message;
        logEl.insertBefore(entry, logEl.firstChild);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    SeesawManager.init();
});

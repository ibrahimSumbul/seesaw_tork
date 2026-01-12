/* Seesaw Simulation - Storage Manager */

const Storage = {
    KEYS: {
        SEESAWS: 'seesawSimulation_seesaws',
        ACTIVE_ID: 'seesawSimulation_activeId'
    },

    // Tüm seesaw'ları kaydet
    saveAll(seesawsData) {
        try {
            localStorage.setItem(this.KEYS.SEESAWS, JSON.stringify(seesawsData));
        } catch (e) {
            console.warn('Storage saveAll error:', e);
        }
    },

    // Tüm seesaw'ları yükle
    loadAll() {
        try {
            const saved = localStorage.getItem(this.KEYS.SEESAWS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Storage loadAll error:', e);
            return [];
        }
    },

    // Tek seesaw kaydet
    saveSeesaw(id, state) {
        const seesaws = this.loadAll();
        const index = seesaws.findIndex(s => s.id === id);
        
        const seesawData = {
            id: id,
            name: state.name || 'Seesaw ' + (id + 1),
            plankWidth: state.plankWidth,
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

        if (index >= 0) {
            seesaws[index] = seesawData;
        } else {
            seesaws.push(seesawData);
        }

        this.saveAll(seesaws);
    },

    // Tek seesaw yükle
    loadSeesaw(id) {
        const seesaws = this.loadAll();
        return seesaws.find(s => s.id === id) || null;
    },

    // Seesaw sil
    deleteSeesaw(id) {
        const seesaws = this.loadAll();
        const filtered = seesaws.filter(s => s.id !== id);
        this.saveAll(filtered);
    },

    // Aktif seesaw ID
    getActiveId() {
        try {
            const id = localStorage.getItem(this.KEYS.ACTIVE_ID);
            return id !== null ? parseInt(id) : 0;
        } catch (e) {
            return 0;
        }
    },

    setActiveId(id) {
        try {
            localStorage.setItem(this.KEYS.ACTIVE_ID, id.toString());
        } catch (e) {
            console.warn('Storage setActiveId error:', e);
        }
    },

    // Tüm verileri temizle
    clearAll() {
        try {
            localStorage.removeItem(this.KEYS.SEESAWS);
            localStorage.removeItem(this.KEYS.ACTIVE_ID);
        } catch (e) {
            console.warn('Storage clearAll error:', e);
        }
    },

    // Sonraki kullanılabilir ID
    getNextId() {
        const seesaws = this.loadAll();
        if (seesaws.length === 0) return 0;
        return Math.max(...seesaws.map(s => s.id)) + 1;
    }
};

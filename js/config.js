/* Seesaw Simulation - Configuration */

const CONFIG = {
    CONTAINER_WIDTH: 1200,
    CONTAINER_HEIGHT: 500,
    PLANK_WIDTH: 400,
    PLANK_HEIGHT: 20,
    MIN_PLANK_WIDTH: 400,
    MAX_PLANK_WIDTH: 1000,
    PIVOT_OFFSET: 10,
    MAX_ANGLE: 30,
    TORQUE_DIVISOR: 10,
    ANIMATION_SPEED: 0.1,
    MIN_WEIGHT: 1,
    MAX_WEIGHT: 10,
    BASE_OBJECT_SIZE: 15,
    SIZE_PER_KG: 2,
    FALL_SPEED: 8,
    BOUNCE_INITIAL: -3,
    BOUNCE_DECELERATION: 0.5,
    COLORS: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'],
    STORAGE_KEY: 'seesawState',
    
    // Responsive
    getContainerWidth() {
        const container = document.getElementById('seesawContainer');
        if (!container) return this.CONTAINER_WIDTH;
        return container.offsetWidth || this.CONTAINER_WIDTH;
    },
    
    getContainerHeight() {
        const container = document.getElementById('seesawContainer');
        if (!container) return this.CONTAINER_HEIGHT;
        return container.offsetHeight || this.CONTAINER_HEIGHT;
    },
    
    isMobile() {
        return window.innerWidth <= 768;
    },
    
    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }
};

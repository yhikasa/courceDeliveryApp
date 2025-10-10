import { LightningElement, api } from 'lwc';

export default class Timer extends LightningElement {
    // Public API
    @api durationSeconds = 60;
    @api autostart = false;
    @api showControls = false;
    @api tickIntervalMs = 1000;
    @api label;

    // State
    remainingMs;
    intervalId = null;
    started = false;
    paused = false;

    connectedCallback() {
        this.resetInternal();
        if (this.autostart) {
            // Slight delay to allow initial render
            setTimeout(() => this.start(), 0);
        }
    }

    disconnectedCallback() {
        this.clearTimer();
    }

    // Computed getters for template
    get formattedTime() {
        const totalSeconds = Math.max(0, Math.floor(this.remainingMs / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const two = (n) => (n < 10 ? `0${n}` : `${n}`);
        return hours > 0 ? `${two(hours)}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`;
    }

    get isIdle() {
        return !this.started || this.remainingMs === this.durationSeconds * 1000;
    }

    get isPaused() {
        return this.paused;
    }

    get startLabel() {
        return this.started && !this.paused ? 'Running' : 'Start';
    }

    // Handlers
    handleStart() {
        this.start();
    }

    handlePause() {
        this.pause();
    }

    handleReset() {
        this.reset();
    }

    // Public methods (can be called via querySelector from parent if needed)
    @api start() {
        if (this.intervalId) {
            return;
        }
        // If already completed, reset before starting
        if (this.remainingMs <= 0) {
            this.resetInternal();
        }

        this.started = true;
        this.paused = false;

        const tick = () => {
            this.remainingMs -= this.tickIntervalMs;
            if (this.remainingMs <= 0) {
                this.remainingMs = 0;
                this.clearTimer();
                this.dispatchEvent(new CustomEvent('complete'));
            }
        };

        // Run immediate tick only if not at initial state
        if (this.remainingMs < this.durationSeconds * 1000) {
            tick();
        }

        this.intervalId = setInterval(tick, this.tickIntervalMs);
    }

    @api pause() {
        this.paused = true;
        this.clearTimer();
    }

    @api reset() {
        this.clearTimer();
        this.resetInternal();
    }

    // Helpers
    resetInternal() {
        this.remainingMs = this.durationSeconds * 1000;
        this.started = false;
        this.paused = false;
    }

    clearTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

import { LightningElement, api } from 'lwc';

export default class Timer extends LightningElement {
    // Public API
    @api durationSeconds = 600;
    @api autostart = false;
    @api showControls = false;
    @api tickIntervalMs = 1000;
    @api label;

    // State
    remainingMs;
    intervalId = null;
    started = false;
    paused = false;

    // Settings state
    isSettingsOpen = false;
    draftDurationSeconds;
    draftMessage = '';
    message = '休憩時間';

    connectedCallback() {
        this.resetInternal();
        if (this.autostart) {
            // Slight delay to allow initial render
            setTimeout(() => this.start(), 0);
        }
        this.showControls = true;
        // initialize drafts from current values
        this.draftDurationSeconds = this.durationSeconds;
        this.draftMessage = this.message;
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

    // used by template to avoid invalid "||" parsing on attribute name
    get isPausedOrIdle() {
        return this.isPaused || this.isIdle;
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

    // Settings open/close
    openSettings = () => {
        this.draftDurationSeconds = this.durationSeconds;
        this.draftMessage = this.message;
        this.isSettingsOpen = true;
    };

    closeSettings = () => {
        this.isSettingsOpen = false;
    };

    handleDurationChange = (event) => {
        const v = Number(event.detail.value);
        this.draftDurationSeconds = isNaN(v) || v < 1 ? 1 : Math.floor(v);
    };

    handleMessageChange = (event) => {
        this.draftMessage = event.detail.value ?? '';
    };

    saveSettings = () => {
        const newDuration = Math.max(1, Number(this.draftDurationSeconds));
        const newMessage = this.draftMessage || '';

        const durationChanged = newDuration !== this.durationSeconds;

        this.durationSeconds = newDuration;
        this.message = newMessage;

        // If duration changed, reset timer to new duration
        if (durationChanged) {
            this.reset();
        }
        this.isSettingsOpen = false;

        // fire event to inform parent about settings change
        this.dispatchEvent(
            new CustomEvent('settingschange', {
                detail: { durationSeconds: this.durationSeconds, message: this.message }
            })
        );
    };

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

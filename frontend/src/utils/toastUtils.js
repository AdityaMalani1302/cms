import { toast } from 'react-toastify';

// Toast deduplication utility
class ToastManager {
  constructor() {
    this.activeToasts = new Set();
    this.lastToastTime = new Map();
    this.minInterval = 1000; // Minimum time between identical toasts (1 second)
  }

  // Generate a simple hash for toast content
  getToastHash(message, type) {
    return `${type}:${message}`.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Check if we should show this toast
  shouldShowToast(message, type) {
    const hash = this.getToastHash(message, type);
    const now = Date.now();
    const lastTime = this.lastToastTime.get(hash);

    // If the same toast was shown recently, skip it
    if (lastTime && (now - lastTime) < this.minInterval) {
      return false;
    }

    // Update the last shown time
    this.lastToastTime.set(hash, now);
    return true;
  }

  // Success toast with deduplication
  success(message, options = {}) {
    if (!message || !this.shouldShowToast(message, 'success')) return;

    const toastId = toast.success(message, {
      toastId: this.getToastHash(message, 'success'), // Prevent duplicates
      containerId: 'main-toast-container',
      ...options
    });

    this.activeToasts.add(toastId);
    return toastId;
  }

  // Error toast with deduplication
  error(message, options = {}) {
    if (!message || !this.shouldShowToast(message, 'error')) return;

    const toastId = toast.error(message, {
      toastId: this.getToastHash(message, 'error'), // Prevent duplicates
      containerId: 'main-toast-container',
      autoClose: 6000, // Longer for errors
      ...options
    });

    this.activeToasts.add(toastId);
    return toastId;
  }

  // Info toast with deduplication
  info(message, options = {}) {
    if (!message || !this.shouldShowToast(message, 'info')) return;

    const toastId = toast.info(message, {
      toastId: this.getToastHash(message, 'info'), // Prevent duplicates
      containerId: 'main-toast-container',
      ...options
    });

    this.activeToasts.add(toastId);
    return toastId;
  }

  // Warning toast with deduplication
  warn(message, options = {}) {
    if (!message || !this.shouldShowToast(message, 'warn')) return;

    const toastId = toast.warn(message, {
      toastId: this.getToastHash(message, 'warn'), // Prevent duplicates
      containerId: 'main-toast-container',
      ...options
    });

    this.activeToasts.add(toastId);
    return toastId;
  }

  // Dismiss specific toast
  dismiss(toastId) {
    if (toastId) {
      toast.dismiss(toastId);
      this.activeToasts.delete(toastId);
    }
  }

  // Dismiss all toasts
  dismissAll() {
    toast.dismiss();
    this.activeToasts.clear();
  }

  // Clear old entries from memory
  cleanup() {
    const now = Date.now();
    const cutoff = now - (this.minInterval * 60); // Keep entries for 1 minute

    for (const [hash, time] of this.lastToastTime.entries()) {
      if (time < cutoff) {
        this.lastToastTime.delete(hash);
      }
    }
  }

  // Get number of active toasts
  getActiveCount() {
    return this.activeToasts.size;
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Cleanup old entries every 30 seconds
setInterval(() => {
  toastManager.cleanup();
}, 30000);

// Export the manager methods for easy usage
export const showToast = {
  success: (message, options) => toastManager.success(message, options),
  error: (message, options) => toastManager.error(message, options),
  info: (message, options) => toastManager.info(message, options),
  warn: (message, options) => toastManager.warn(message, options),
  dismiss: (toastId) => toastManager.dismiss(toastId),
  dismissAll: () => toastManager.dismissAll(),
  getActiveCount: () => toastManager.getActiveCount()
};

// Default export for backwards compatibility
export default showToast;
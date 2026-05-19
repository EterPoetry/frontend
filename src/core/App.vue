<script setup lang="ts">
import { isRouteNavigating } from '@/core/navigation-loading';
import { useBrowserPushRuntime } from '@/modules/notifications/composables/useBrowserPushRuntime';
import { usePaymentsRuntime } from '@/modules/payments/composables/usePaymentsRuntime';

useBrowserPushRuntime();
usePaymentsRuntime();
</script>

<template>
  <router-view />

  <Transition name="app-route-loader">
    <div v-if="isRouteNavigating" class="app-route-loader" aria-live="polite" aria-label="Завантаження">
      <div class="app-route-loader__backdrop" />
      <div class="app-route-loader__waves" aria-hidden="true">
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
        <span class="app-route-loader__bar" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-route-loader {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.app-route-loader__backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-bg-page) 88%, transparent);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

/* ── Wave bars ─────────────────────────────────────────────── */

.app-route-loader__waves {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
}

.app-route-loader__bar {
  display: block;
  width: 4px;
  border-radius: 999px;
  background: var(--color-primary);
  opacity: 0.72;
  transform-origin: center;
  animation: app-loader-wave 1.35s ease-in-out infinite;
}

.app-route-loader__bar:nth-child(1) { height: 12px; }
.app-route-loader__bar:nth-child(2) { height: 22px; animation-delay: 0.08s; }
.app-route-loader__bar:nth-child(3) { height: 34px; animation-delay: 0.16s; }
.app-route-loader__bar:nth-child(4) { height: 44px; animation-delay: 0.24s; }
.app-route-loader__bar:nth-child(5) { height: 34px; animation-delay: 0.32s; }
.app-route-loader__bar:nth-child(6) { height: 22px; animation-delay: 0.40s; }
.app-route-loader__bar:nth-child(7) { height: 12px; animation-delay: 0.48s; }

@keyframes app-loader-wave {
  0%, 100% { transform: scaleY(0.5); opacity: 0.4; }
  50%       { transform: scaleY(1);   opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
  .app-route-loader__bar {
    animation: none;
    opacity: 0.6;
  }
}
</style>

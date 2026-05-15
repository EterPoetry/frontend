<template>
  <article class="post-card-skeleton">
    <div class="post-card-skeleton__main">
      <div class="post-card-skeleton__meta-block">
        <div class="post-card-skeleton__title sk" />

        <div class="post-card-skeleton__meta-row">
          <div class="post-card-skeleton__author-avatar sk" />
          <div class="post-card-skeleton__author-name sk" />
        </div>

        <div class="post-card-skeleton__tags">
          <div class="post-card-skeleton__tag sk" />
          <div class="post-card-skeleton__tag post-card-skeleton__tag--wide sk" />
        </div>
      </div>

      <div class="post-card-skeleton__side">
        <div class="post-card-skeleton__stats">
          <div class="post-card-skeleton__stat sk" />
          <div class="post-card-skeleton__stat sk" />
          <div class="post-card-skeleton__stat sk" />
        </div>

        <div class="post-card-skeleton__actions">
          <div class="post-card-skeleton__duration sk" />
          <div class="post-card-skeleton__play-button sk" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ── Shell ─────────────────────────────────────────────────── */

.post-card-skeleton {
    border: 1px solid var(--color-border-soft);
    border-left: 3px solid transparent;
    border-radius: 4px;
    background: var(--color-bg-card-strong);
}

.post-card-skeleton__main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 32px;
    padding: 28px 30px;
}

/* ── Shimmer base ──────────────────────────────────────────── */

.sk {
    border-radius: 4px;
    background: linear-gradient(
        90deg,
        var(--color-bg-card-muted) 25%,
        var(--color-bg-card-subtle-strong) 50%,
        var(--color-bg-card-muted) 75%
    );
    background-size: 300% 100%;
    animation: sk-sweep 1.6s ease-in-out infinite;
}

/* ── Left side ─────────────────────────────────────────────── */

.post-card-skeleton__meta-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.post-card-skeleton__title {
    height: 16px;
    width: 72%;
}

.post-card-skeleton__title--short {
    width: 48%;
    animation-delay: 0.08s;
}

.post-card-skeleton__meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 1px;
}

.post-card-skeleton__author-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    flex-shrink: 0;
    animation-delay: 0.1s;
}

.post-card-skeleton__author-name {
    height: 14px;
    width: 100px;
    animation-delay: 0.12s;
}

.post-card-skeleton__tags {
    display: flex;
    gap: 16px;
    margin-top: 2px;
}

.post-card-skeleton__tag {
    height: 11px;
    width: 52px;
    animation-delay: 0.16s;
}

.post-card-skeleton__tag--wide {
    width: 76px;
    animation-delay: 0.22s;
}

/* ── Right side ────────────────────────────────────────────── */

.post-card-skeleton__side {
    display: flex;
    align-items: center;
    gap: 32px;
    flex-shrink: 0;
}

.post-card-skeleton__stats {
    display: flex;
    align-items: center;
    gap: 24px;
}

.post-card-skeleton__stat {
    height: 16px;
    width: 36px;
    animation-delay: 0.06s;
}

.post-card-skeleton__stat:nth-child(2) { animation-delay: 0.12s; }
.post-card-skeleton__stat:nth-child(3) { animation-delay: 0.18s; }

.post-card-skeleton__actions {
    display: flex;
    align-items: center;
    gap: 16px;
}

.post-card-skeleton__duration {
    height: 16px;
    width: 32px;
    animation-delay: 0.14s;
}

.post-card-skeleton__play-button {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    flex-shrink: 0;
    animation-delay: 0.2s;
}

/* ── Keyframe ──────────────────────────────────────────────── */

@keyframes sk-sweep {
    0%   { background-position:  100% 0; }
    100% { background-position: -100% 0; }
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 1180px) {
    .post-card-skeleton__main {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
    }

    .post-card-skeleton__side {
        flex-wrap: wrap;
        gap: 12px 24px;
    }
}

@media (max-width: 640px) {
    .post-card-skeleton__main {
        padding: 14px 16px;
        gap: 10px;
    }

    .post-card-skeleton__actions {
        width: 100%;
        justify-content: space-between;
    }
}

@media (prefers-reduced-motion: reduce) {
    .sk {
        animation: none;
        opacity: 0.6;
    }
}
</style>

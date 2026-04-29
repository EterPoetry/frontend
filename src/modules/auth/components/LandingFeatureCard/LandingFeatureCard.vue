<script setup lang="ts">
import './LandingFeatureCard.css';

defineProps<{
  icon?: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <article class="landing-feature-card">
    <span v-if="icon" class="landing-card-icon" aria-hidden="true">
      <svg v-if="icon === 'audio'" viewBox="0 0 24 24" focusable="false">
        <path d="M9 18V6l10-2v12" />
        <circle cx="7" cy="18" r="2.5" />
        <circle cx="17" cy="16" r="2.5" />
      </svg>
      <svg v-else-if="icon === 'text'" viewBox="0 0 24 24" focusable="false">
        <path d="M7 6h10" />
        <path d="M7 11h10" />
        <path d="M7 16h7" />
      </svg>
      <svg v-else-if="icon === 'publish'" viewBox="0 0 24 24" focusable="false">
        <path d="M12 16V5" />
        <path d="m7 10 5-5 5 5" />
        <path d="M5 19h14" />
      </svg>
      <svg v-else-if="icon === 'search'" viewBox="0 0 24 24" focusable="false">
        <circle cx="11" cy="11" r="5" />
        <path d="m15 15 4 4" />
      </svg>
      <svg v-else-if="icon === 'listen-text'" viewBox="0 0 24 24" focusable="false">
        <path d="M5 7h14" />
        <path d="M5 12h9" />
        <path d="M5 17h9" />
        <path d="m16 11 4 2.5-4 2.5v-5Z" />
      </svg>
      <svg v-else-if="icon === 'heart'" viewBox="0 0 24 24" focusable="false">
        <path d="M12 19s-7-4.4-7-9.1A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 2.9C19 14.6 12 19 12 19Z" />
      </svg>
      <svg v-else-if="icon === 'pen'" viewBox="0 0 24 24" focusable="false">
        <path d="M5 19 6.5 14.5 16 5a2.1 2.1 0 0 1 3 3l-9.5 9.5L5 19Z" />
        <path d="m14 7 3 3" />
      </svg>
      <svg v-else-if="icon === 'stage'" viewBox="0 0 24 24" focusable="false">
        <path d="M6 18h12" />
        <path d="M8 18V7h8v11" />
        <path d="M10 10h4" />
      </svg>
      <svg v-else-if="icon === 'book'" viewBox="0 0 24 24" focusable="false">
        <path d="M6 5h7a3 3 0 0 1 3 3v11H9a3 3 0 0 0-3 3V5Z" />
        <path d="M16 8h2v11" />
      </svg>
    </span>
    <h4>{{ title }}</h4>
    <p>{{ description }}</p>
  </article>
</template>

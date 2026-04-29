<script setup lang="ts">
import './LandingStatementCard.css';

defineProps<{
  title: string;
  quote: string;
  tags: string;
}>();
</script>

<template>
  <div class="landing-statement" aria-label="Формат Eter">
    <div class="landing-statement-header">
      <span aria-hidden="true">♫</span>
      <div>
        <strong>{{ title }}</strong>
      </div>
    </div>
    <div class="landing-wave" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
    <blockquote>{{ quote }}</blockquote>
    <div class="landing-statement-footer">
      <span>{{ tags }}</span>
    </div>
  </div>
</template>

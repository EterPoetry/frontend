<script setup lang="ts">
import './ErrorAlert.css';
import {ErrorAlertProperties} from "@/shared/interfaces/error-alert-properties.interface.ts";

defineProps<ErrorAlertProperties>();
</script>

<template>
  <div class="error-alert">
    {{ message }}
  </div>
</template>
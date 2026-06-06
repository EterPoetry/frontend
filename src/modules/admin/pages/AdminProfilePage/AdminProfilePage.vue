<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AdminRouteNames } from '@/modules/admin/enums/admin-route-names.enum';

const router = useRouter();

onMounted(() => {
    void router.replace({ name: AdminRouteNames.DASHBOARD });
});
</script>

<template>
  <div />
</template>

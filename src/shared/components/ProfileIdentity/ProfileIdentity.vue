<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { getAuthorInitial } from '@/modules/posts/utils/post-author.utils';
import './ProfileIdentity.css';

type ProfileIdentitySize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

const props = withDefaults(defineProps<{
    name: string;
    username?: string;
    photo?: string | null;
    to?: RouteLocationRaw;
    isPremium?: boolean;
    premiumLabel?: string;
    size?: ProfileIdentitySize;
    align?: 'start' | 'center';
}>(), {
    username: '',
    photo: null,
    to: undefined,
    isPremium: false,
    premiumLabel: '',
    size: 'md',
    align: 'center',
});

const rootComponent = computed(() => props.to ? RouterLink : 'div');
const usernameLabel = computed(() => props.username ? `@${props.username}` : '');
</script>

<template>
  <component
      :is="rootComponent"
      :to="props.to"
      class="profile-identity"
      :class="[
        `profile-identity--${props.size}`,
        `profile-identity--align-${props.align}`,
        { 'profile-identity--link': !!props.to },
      ]"
  >
    <img
        v-if="props.photo"
        :src="props.photo"
        :alt="props.username || props.name"
        class="profile-identity__avatar"
    />
    <span v-else class="profile-identity__avatar profile-identity__avatar--fallback">
      {{ getAuthorInitial(props.name) }}
    </span>

    <span class="profile-identity__copy">
      <span class="profile-identity__name-row">
        <span class="profile-identity__name">{{ props.name }}</span>
        <span v-if="props.isPremium && props.premiumLabel" class="profile-identity__badge">
          {{ props.premiumLabel }}
        </span>
      </span>

      <span v-if="usernameLabel" class="profile-identity__username">{{ usernameLabel }}</span>
    </span>
  </component>
</template>

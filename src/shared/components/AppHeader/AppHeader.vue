<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import searchIconUrl from '@/shared/assets/icons/ui/search.svg';
import gridIconUrl from '@/shared/assets/icons/ui/grid.svg';
import sortIconUrl from '@/shared/assets/icons/ui/sort.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import bellIconUrl from '@/shared/assets/icons/ui/bell.svg';
import { useTheme } from '@/shared/composables/useTheme';
import { uk } from '@/shared/locales/uk';
import './AppHeader.css';

const search = defineModel<string>('search', { default: '' });
const { theme, toggleTheme } = useTheme();
const route = useRoute();

const sortMenuOpen = ref(false);
const isSearchEnabled = computed(() => route.path === '/app');
const sortOptions = [
    uk.home.sort.latest,
    uk.home.sort.popular,
];

const toggleSortMenu = (): void => {
    sortMenuOpen.value = !sortMenuOpen.value;
};

const selectSortOption = (option: string): void => {
    search.value = search.value;
    sortMenuOpen.value = false;
    void option;
};
</script>

<template>
  <header class="app-header" :class="{ 'app-header--without-search': !isSearchEnabled }">
    <label v-if="isSearchEnabled" class="app-header__search">
      <img :src="searchIconUrl" :alt="uk.home.searchPlaceholder" class="app-header__icon-image" />
      <input
          v-model="search"
          type="text"
          :placeholder="uk.home.searchPlaceholder"
          class="app-header__search-input"
      />
    </label>

    <div v-if="isSearchEnabled" class="app-header__tools">
      <button type="button" class="app-header__icon-btn" :aria-label="uk.home.gridViewLabel">
        <img :src="gridIconUrl" :alt="uk.home.gridViewLabel" class="app-header__icon-image" />
      </button>

      <div class="app-header__sort">
        <button
            type="button"
            class="app-header__icon-btn"
            :aria-label="uk.home.sort.ariaLabel"
            @click="toggleSortMenu"
        >
          <img :src="sortIconUrl" :alt="uk.home.sort.ariaLabel" class="app-header__icon-image" />
        </button>

        <div v-if="sortMenuOpen" class="app-header__sort-menu">
          <button
              v-for="option in sortOptions"
              :key="option"
              type="button"
              class="app-header__sort-option"
              @click="selectSortOption(option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
    </div>

    <div class="app-header__actions">
      <BaseButton
          :label="uk.home.subscribeLabel"
          type="button"
          variant="primary"
          :disabled="false"
      />

      <button type="button" class="app-header__icon-btn" :aria-label="uk.home.notificationsLabel">
        <img :src="bellIconUrl" :alt="uk.home.notificationsLabel" class="app-header__icon-image app-header__icon-image--bell" />
      </button>

      <button type="button" class="app-header__icon-btn" :aria-label="uk.home.themeLabel" @click="toggleTheme">
        <img :src="theme === 'dark' ? sunIconUrl : moonIconUrl" :alt="uk.home.themeLabel" class="app-header__icon-image" />
      </button>
    </div>
  </header>
</template>

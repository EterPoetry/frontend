<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import searchIconUrl from '@/shared/assets/icons/ui/search.svg';
import gridIconUrl from '@/shared/assets/icons/ui/grid.svg';
import sortIconUrl from '@/shared/assets/icons/ui/sort.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import bellIconUrl from '@/shared/assets/icons/ui/bell.svg';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { useAppHeaderControls } from '@/shared/composables/useAppHeaderControls';
import { useTheme } from '@/shared/composables/useTheme';
import { uk } from '@/shared/locales/uk';
import './AppHeader.css';

const search = defineModel<string>('search', { default: '' });
const sortBy = defineModel<string>('sortBy', { default: 'newest' });
const categoryId = defineModel<number | null>('categoryId', { default: null });

const { theme, toggleTheme } = useTheme();
const route = useRoute();
const isSearchEnabled = computed(() => route.meta.searchEnabled === true);
const headerControls = useAppHeaderControls({
    search,
    categoryId,
    sortBy,
});
const {
    categoryMenuOpen,
    categorySearch,
    clearCategory,
    filteredCategories,
    hasActiveFilters,
    isCategoryActive,
    isSortActive,
    resetFilters,
    selectCategory,
    selectSortOption,
    sortMenuOpen,
    sortOptions,
    toggleCategoryMenu,
    toggleSortMenu,
} = headerControls;
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

      <button
          v-if="hasActiveFilters"
          type="button"
          class="app-header__search-reset"
          :aria-label="uk.home.resetFilters"
          @click.prevent="resetFilters"
      >
        <img :src="closeIconUrl" :alt="uk.home.resetFilters" class="app-header__icon-image" />
      </button>
    </label>

    <div v-if="isSearchEnabled" class="app-header__tools">
      <div :ref="headerControls.categoryMenuRef" class="app-header__sort">
        <button
            type="button"
            class="app-header__icon-btn"
            :class="{ 'app-header__icon-btn--active': isCategoryActive }"
            :aria-label="uk.home.categories.filterLabel"
            @click="toggleCategoryMenu"
        >
          <img :src="gridIconUrl" :alt="uk.home.categories.filterLabel" class="app-header__icon-image" />
          <span v-if="isCategoryActive" class="app-header__active-dot" />
        </button>

        <div v-if="categoryMenuOpen" class="app-header__sort-menu app-header__category-menu">
          <label class="app-header__category-search">
            <img :src="searchIconUrl" :alt="uk.home.categories.searchPlaceholder" class="app-header__category-search-icon" />
            <input
                v-model="categorySearch"
                type="text"
                :placeholder="uk.home.categories.searchPlaceholder"
                class="app-header__category-search-input"
                @click.stop
            />
          </label>

          <div class="app-header__category-list">
            <button
                v-if="isCategoryActive && !categorySearch"
                type="button"
                class="app-header__sort-option"
                @click="clearCategory"
            >
              <span class="app-header__sort-option-spacer" />
              {{ uk.home.categories.filterLabel }}
            </button>

            <div v-if="!filteredCategories.length" class="app-header__category-empty">
              {{ uk.home.categories.noResults }}
            </div>

            <button
                v-for="category in filteredCategories"
                :key="category.categoryId"
                type="button"
                class="app-header__sort-option"
                :class="{ 'app-header__sort-option--selected': categoryId === category.categoryId }"
                @click="selectCategory(category)"
            >
              <span
                  v-if="categoryId === category.categoryId"
                  class="app-header__sort-option-check"
                  aria-hidden="true"
              />
              <span v-else class="app-header__sort-option-spacer" />
              {{ category.categoryName }}
            </button>
          </div>
        </div>
      </div>

      <div :ref="headerControls.sortMenuRef" class="app-header__sort">
        <button
            type="button"
            class="app-header__icon-btn"
            :class="{ 'app-header__icon-btn--active': isSortActive }"
            :aria-label="uk.home.sort.ariaLabel"
            @click="toggleSortMenu"
        >
          <img :src="sortIconUrl" :alt="uk.home.sort.ariaLabel" class="app-header__icon-image" />
          <span v-if="isSortActive" class="app-header__active-dot" />
        </button>

        <div v-if="sortMenuOpen" class="app-header__sort-menu">
          <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="app-header__sort-option"
              :class="{ 'app-header__sort-option--selected': sortBy === option.value }"
              @click="selectSortOption(option.value)"
          >
            <span
                v-if="sortBy === option.value"
                class="app-header__sort-option-check"
                aria-hidden="true"
            />
            <span v-else class="app-header__sort-option-spacer" />
            {{ option.label }}
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

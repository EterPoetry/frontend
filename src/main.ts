import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/core/App.vue';
import router from '@/core/router.ts';
import { initializeTheme } from '@/shared/composables/useTheme';
import '@/shared/assets/styles/variables.css';
import '@/shared/assets/styles/fonts.css';

initializeTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

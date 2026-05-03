import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import { toast } from './utils/toast';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.provide('toast', toast);
app.config.globalProperties.$toast = toast;

app.mount('#app');

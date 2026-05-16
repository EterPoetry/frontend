import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import sitemap from 'vite-plugin-sitemap'
import path from 'path'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    if (!env.VITE_API_URL) {
        throw new Error('VITE_API_URL is not defined in the environment variables');
    }

    const hostname = env.VITE_SITE_URL;

    return {
        plugins: [
            vue(),
            sitemap({
                hostname,
                dynamicRoutes: ['/', '/home'],
            }),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            open: true,
        },
    }
})

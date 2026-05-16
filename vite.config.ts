import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    if (!env.VITE_API_URL) {
        throw new Error('VITE_API_URL is not defined in the environment variables');
    }

    return {
        plugins: [
            vue(),
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

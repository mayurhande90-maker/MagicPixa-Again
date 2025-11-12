// FIX: Manually define ImportMeta and ImportMetaEnv to resolve TypeScript errors
// related to `import.meta.env` not being found. This is a workaround for a
// project configuration issue where "vite/client" types are not being resolved.
interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_RAZORPAY_KEY_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
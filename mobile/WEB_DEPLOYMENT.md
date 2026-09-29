# Memento web app

The iPhone and Android web app is published at **https://memento.expo.app** through EAS Hosting. The install manifest and Memento icon are served from `public/`.

## Supabase email links

In Supabase Dashboard, open **Authentication → URL Configuration**. Set the Site URL to `https://memento.expo.app` and add these exact entries under Redirect URLs:

- `https://memento.expo.app/auth/callback`
- `https://memento.expo.app/auth/reset`

The web app uses the Supabase URL and publishable key from the `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variables. Never put a `service_role` key in a client environment variable.

## Build and deploy

From this directory, run:

```sh
npm ci
npm run build:web
npx eas-cli deploy --prod
```

The current Expo project is `@azatkabulov/memento`. Expo's free hosting quota is capped rather than billed as overage.

## Install on a phone

- **iPhone:** Open `https://memento.expo.app` in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** Open the same address in Chrome and choose **Install app** from the browser menu.

The PWA needs an internet connection to load the diary and save moments. The Supabase bucket remains private; the app creates short-lived signed media links after sign-in.

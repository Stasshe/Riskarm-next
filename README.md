open-riskarm

```bash
npm i -g pnpm
```

開発: `pnpm install` -> `pnpm dev`

Firebase 公開設定は実行時に必要。Next.js の prerender/build では Firebase SDK を初期化しない。

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

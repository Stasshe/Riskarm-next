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

# Discord通知API Route(/api/discord-notify)用、サーバー側のみ
DISCORD_WEBHOOK_URL=
APP_SHARED_SECRET=
NEXT_PUBLIC_APP_SHARED_SECRET=
```

デプロイ: Vercel(動的、`output:'export'`不使用)。`firestore.rules`の許可メールアドレスは`allowedEmails()`/`adminEmails()`にハードコード、追加時は`src/lib/auth.tsx`の`ADMIN_EMAILS`も同時更新してデプロイすること。詳細設計は [SPECIFICATION.md](./SPECIFICATION.md)。

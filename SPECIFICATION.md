# Riskarm-next 仕様書

`original/`(Flask+SQLAlchemy+React SPA、JWT認証)の脆弱性診断案件管理ツールを、Next.js 16 App Router + Firestoreクライアント直結 + Firebase Authへ全面リライトしたもの。バックエンドDBサーバー廃止、アクセス制御はFirestore Security Rulesにメールアドレス直書き。Discord通知のみ Vercel API Route 1本を介する。

`original/`は参照専用、`.gitignore`済み(新リポジトリの一部ではない)。

## 確定した設計判断

- **権限モデル**: admin/担当者/レビュアーの権限差を維持。Firestore Rulesで実装(クライアント信用しない)。
- **PDFレポート**: ブラウザ印刷(`window.print()`)。Playwright/サーバー生成なし。
- **画像埋め込み**: `finding.images[]`配列+Markdown内プレースホルダートークン(`riskarm-image:{id}`)。base64をFirestoreドキュメントに直接保存(Storage不使用)、圧縮必須。
- **Discord通知**: Vercel API Route 1本(`/api/discord-notify`)でWebhook中継。DB接続はクライアント直結のまま。
- **画像キャッシュ**: 独自Service Worker実装しない。Firestore SDKの`persistentLocalCache`(IndexedDB)がbase64フィールド含め自動キャッシュするため冗長。
- **認証方式**: Googleログインのみ(`signInWithPopup`+`GoogleAuthProvider`)。
- **データ移行**: 新規スタート。本番データファイルはリポ内になし。

## 1. Firestoreデータモデル

トップレベルコレクション(サブコレクションなし、フラット構成):

```
users/{uid}                 -- doc id = Firebase Auth uid
domains/{domainId}          -- auto-id
findings/{findingId}        -- auto-id (グローバル一覧/ユーザー別一覧クエリのためdomain配下サブコレクションにしない)
findingTemplates/{templateId}
settings/app                -- singleton, doc id固定"app"
```

**users/{uid}**: `email, displayName, isAdmin, createdAt`

**domains/{domainId}**: `name, description, url, startDate, endDate, surveyItems[], deleted, deletedAt, createdAt, updatedAt, findingsCount`

**findings/{findingId}**: `title, domainId, domainName(denorm), domainDeleted(denorm), assignedUserId, assignedUserName(denorm), reviewerUserId, reviewerUserName(denorm), status(NOT_STARTED|WIP|COMPLETED|REVIEWED), notFound, severity(重大|高|中|低|その他), feasibility(高|中|低|不可), severityReason, feasibilityReason, locations[{method,url,parameter}], description, reproductionSteps[], solutions, otherRemarks, references[], riskLevel(自動算出), images[{id,dataUrl,filename,sizeBytes}], deleted, deletedAt, createdAt, updatedAt`

denormalize理由: クライアント直結でjoinレイヤーなし。一覧画面での逐次`getDoc`join回避。domain名/ユーザー名変更時はバッチ更新(≤500件/バッチ)で該当findingsへ伝播([[src/lib/firestore/batch.ts]])。

**findingTemplates/{templateId}**: Finding形状から`domainId/domainName/assignedUser*/reviewerUser*/status/deleted*`除いたもの。ハード削除(元実装通り)。

**settings/app**: `reportTitle, notFoundPrefix, updatedAt`。`discordWebhookUrl`はここに置かない(→Vercel環境変数、理由は§5)。

複合インデックス(`firestore.indexes.json`): `findings`に`(domainId,deleted)` `(assignedUserId,deleted)` `(reviewerUserId,deleted)` `(deleted,domainId)`

## 2. 危険度算出ロジック

`original/app/models/finding.py`から厳密移植(`src/lib/riskMatrix.ts`)、クライアント算出+Rules側で再検証(改ざん防止):

```
severity_levels    = ["重大","高","中","低","その他"]
feasibility_levels = ["高","中","低","不可"]
risk_matrix[feasibility_index][severity_index] = [
  ["緊急","緊急","高","中","その他"],
  ["緊急","高","中","低","その他"],
  ["高","中","低","低","その他"],
  ["中","低","低","低","その他"],
]
```

## 3. firestore.rules

許可メールアドレスはハードコード(`firestore.rules`内 `allowedEmails()`/`adminEmails()`)。変更時は `src/lib/auth.tsx` の `ADMIN_EMAILS` も同時更新すること(自己プロビジョニング時のisAdmin初期値決定に使用、Rules側と不一致だとRulesが`create`を拒否する)。

- `isAllowlisted()`: `request.auth.token.email in allowedEmails()`
- `isAdminUser()`: allowlist済み + `users/{uid}.isAdmin == true`
- **users/{uid}**: read=allowlist済み全員。create=本人のみ、`isAdmin`はハードコード`adminEmails()`と一致必須(自己昇格不可)。update=本人はdisplayNameのみ、admin可全項目。delete=adminのみ。
- **settings/app**: read=allowlist済み全員。write=adminのみ。
- **domains**: read/create=allowlist済み全員(元実装通りadmin制限なし)。update=通常項目は誰でも、`deleted/deletedAt`変更はadminのみ。delete(ハード)=常時不可。
- **findingTemplates**: read/create/update=allowlist済み全員。delete=adminのみ。
- **findings**: read=allowlist済み全員。create=`assignedUserId==自分`必須、`status=='NOT_STARTED'`、riskLevel整合性チェック。update=以下いずれか成立:
  - adminUser
  - 内容編集: 担当者本人のみ、`assignedUserId/reviewerUserId/status/deleted/domainId`不変、riskLevel整合性
  - ステータス遷移(`original/app/views/finding.py`の`update_progress`厳密移植): NOT_STARTED→WIP(担当者)、WIP→COMPLETED(担当者)、COMPLETED→REVIEWED(レビュアー)、REVIEWED→COMPLETED(担当者かレビュアー)、COMPLETED→WIP/WIP→NOT_STARTED(担当者)。変更キーは`status,updatedAt`のみ。
  - レビュアー設定: 担当者本人が`reviewerUserId`設定可(自分をレビュアーに設定不可)
  - `assignedUserId`変更(再割当)はadmin専用
  - ドキュメントサイズ上限チェック(画像バジェットの防衛策)
- 削除/復元/一括登録/設定変更は`isAdminUser()`経由
- Rules単体テスト: `firestore.rules.test.ts`(Firebase Emulator + `@firebase/rules-unit-testing`)

## 4. ルート構成

全ページClient Component(`"use client"`)。サーバー側DBアクセスなし。

```
src/app/
  layout.tsx  page.tsx  login/page.tsx
  (app)/layout.tsx            AuthGate+Sidebar
  (app)/domains/{page,add,bulk-add,[domainId],[domainId]/edit,[domainId]/add-finding}
  (app)/findings/{page,[findingId],[findingId]/edit}
  (app)/templates/{page,add,[templateId],[templateId]/edit}
  (app)/admin/{users,users/create,settings,deleted-items}
  (app)/user/[userId]/{findings,reviews}
  reports/layout.tsx           サイドバーなし、print.cssのみ読込
  reports/finding/[findingId]/page.tsx
  reports/domain/[domainId]/page.tsx
  api/discord-notify/route.ts  唯一のサーバーロジック(Node runtime)
```

データ取得は`onSnapshot`ベースの自前フック(`src/hooks/useCollection.ts`/`useDocument.ts`)でリアルタイム更新。

## 5. Discord API Route

Webhook URLはVercelサーバー環境変数`DISCORD_WEBHOOK_URL`(クライアント非露出)。Firestore `settings`から読む案より、Admin SDK/サービスアカウント依存を増やさない方を優先。Admin設定画面の「Discord Webhook URL」欄は廃止し読み取り専用の説明表示に置換(元実装からの意図的な仕様変更)。

```
POST /api/discord-notify
body: { message: string }
成功: 204。webhook URL未設定時も204(no-op、元実装の空文字時サイレントスキップと同じ)。
失敗: 非2xx + { error }
```

`x-app-secret`ヘッダ(`APP_SHARED_SECRET`環境変数と比較)による軽度スパム抑止。クライアント側は`NEXT_PUBLIC_APP_SHARED_SECRET`を送信するのみで、実質的な認証ではない(クライアント可読)、意図的な許容。

発火箇所: domain/finding/template各種CRUD・状態変更・担当者/レビュアー変更の成功後。ログイン通知は元実装に存在しない新規追加(`AuthProvider`の`onAuthStateChanged`から発火)。

## 6. 画像埋め込み

- `src/lib/imageCompress.ts`: canvas経由でリサイズ(最長辺1280px)+JPEG圧縮(quality 0.6→0.4→0.3で200KB以下を目指す)。超えたらクライアント側で明示エラー(サイレント劣化・切り捨て禁止)。
- 1finding上限: base64合計700KB、画像最大6枚。超過時は具体的な上限値を明示して拒否。
- 保存: `finding.images[]`配列。Markdown本文には`![filename](riskarm-image:{id})`という短いトークンのみ挿入(本文が長大base64で汚染されるのを防ぐ)。
- レンダリング時(`src/lib/markdown.ts`): `riskarm-image:([\w-]+)`を正規表現置換し`images[]`の実データURLに解決。
- Rules側にもドキュメントサイズ上限チェックを追加して防衛。

## 7. Firebase初期化

`src/lib/firebase.ts`: `getFirebaseAuth()`/`getFirebaseDb()`呼び出し時のみブラウザ内で遅延初期化(`requireBrowser()`ガード)。Next.jsのprerender/build時にFirebase Authを起動させないための設計 — モジュールスコープで即時初期化すると、Next.jsが`"use client"`コンポーネントもSSR描画する際にサーバー側で実行されて例外になる。呼び出し側は必ず関数内(useEffect/イベントハンドラ内)で呼ぶこと、モジュールトップレベルでは呼ばない。

環境変数(`NEXT_PUBLIC_FIREBASE_*`: apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId)はクライアント露出前提(Firebase標準、セキュリティはRulesが担保)。Firestoreは`persistentLocalCache({tabManager: persistentMultipleTabManager()})`でオフラインキャッシュ有効化。

## 8. 認証フロー

- `login/page.tsx`: 「Googleでログイン」ボタン1つ→`signInWithPopup`。
- 成功後`AuthProvider`が`users/{uid}`存在確認→なければ`setDoc`で自己プロビジョニング(Rulesがallowlist+admin一致を強制)。`permission-denied`で拒否された場合(非allowlistメール)、明示的にアクセス拒否表示+サインアウト。
- サーバーセッションなし。Firebase Auth標準永続化+SDKの自動トークン更新。`/api/discord-notify`はユーザー識別不要。

## ディレクトリ構成

```
src/
  app/            (§4)
  components/     Button/Input/TextArea/Select/Table/LoadingSpinner/ErrorMessage/
                  CollapsibleText/Sidebar/DomainForm/FindingForm/TemplateForm/
                  FindingReportBlock/ImageUploadWidget/ArrayFieldEditor
  lib/
    firebase.ts  auth.tsx  riskMatrix.ts  csv.ts  markdown.ts
    imageCompress.ts  permissions.ts  discordNotify.ts  uiHelpers.ts
    firestore/domains.ts findings.ts templates.ts settings.ts users.ts batch.ts
  hooks/          useCollection.ts  useDocument.ts
  types/          Domain.ts Finding.ts FindingTemplate.ts Setting.ts UserProfile.ts
firestore.rules
firestore.indexes.json
firebase.json     (emulator設定、rulesテスト用)
```

## 未完了・要作業

- Firebase実プロジェクト作成・Vercel環境変数設定(`NEXT_PUBLIC_FIREBASE_*`, `DISCORD_WEBHOOK_URL`, `APP_SHARED_SECRET`)はユーザー側作業(認証情報を要するため)。
- `firestore.rules.test.ts`はFirebase Emulatorが必要(このサンドボックスはJava未導入で未実行、構造上は健全)。実行環境で`pnpm test:rules`。
- 管理画面「ユーザー作成」ページは廃止(Googleログインで自己プロビジョニングのため)。許可メール追加は`firestore.rules`の`allowedEmails()`/`adminEmails()`と`src/lib/auth.tsx`の`ADMIN_EMAILS`を手動更新+デプロイが必要。

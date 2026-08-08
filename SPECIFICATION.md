original/は脆弱性診断(ペンテスト)案件管理ツール。Flask+SQLAlchemy(バックエンド)+React/Vite SPA(JWT認証)構成。リポジトリルートには既にNext.js 16 + Tailwind 4 + Biomeの空スキャフォールドあり(output:'export'静的書き出し設定済み)。

今回original/を土台に全面リライト。目的: バックエンドサーバー(Flask)廃止、Firestoreクライアント直結+Firebase Authでシンプル化。アクセス制御はFirestore Security Rulesにメールアドレス直書きで実現(動的ユーザー管理UIなし)。

Discord通知機能を残す判断のため、Vercel動的デプロイ(API Route 1本のみ)を採用。DB接続は要件通りクライアント直結を維持、サーバーはDiscord webhook中継のみ。

original/は.gitignore済み(新リポジトリの一部ではない、参照専用)。

確定した設計判断

- 権限モデル: admin/担当者/レビュアーの権限差を維持。Firestore Rulesで実装(クライアント信用しない)。
- PDFレポート: ブラウザ印刷(window.print())。Playwright/サーバー生成なし。既存report.css/report_hyoshi.cssを移植。
- 画像埋め込み: 別配列フィールド(images[])+Markdown内プレースホルダートークン(riskarm-image:{id})方式。base64をFirestoreドキュメントに直接保存(Storage不使用)。圧縮必須。
- Discord通知: 維持。Vercel動的デプロイ+API Route 1本(/api/discord-notify)でWebhook中継。DB接続はクライアント直結のまま(サーバー負荷最小化)。
- 画像キャッシュ: 独自Service Worker実装しない。Firestore SDKのpersistentLocalCache(IndexedDB)がbase64フィールド含め自動キャッシュするため冗長。
- 認証方式: Googleログインのみ(signInWithPopup+GoogleAuthProvider)。パスワード管理不要、token.emailが信頼できる。
- データ移行: 新規スタート。本番データファイルはリポ内になし、移行スクリプト不要。
- 許可メールアドレス: 未確定。プレースホルダーで実装し、後日ユーザーが追記(下記参照)。

1. Firestoreデータモデル

トップレベルコレクション(サブコレクションなし、フラット構成):


original/は脆弱性診断(ペンテスト)案件管理ツール。Flask+SQLAlchemy(バックエンド)+React/Vite SPA(JWT認証)構成。リポジトリルートには既にNext.js 16 + Tailwind 4 + Biomeの空スキャフォールドあり(output:'export'静的書き出し設定済み)。

今回original/を土台に全面リライト。目的: バックエンドサーバー(Flask)廃止、Firestoreクライアント直結+Firebase Authでシンプル化。アクセス制御はFirestore Security Rulesにメールアドレス直書きで実現(動的ユーザー管理UIなし)。

Discord通知機能を残す判断のため、Vercel動的デプロイ(API Route 1本のみ)を採用。DB接続は要件通りクライアント直結を維持、サーバーはDiscord webhook中継のみ。

original/は.gitignore済み(新リポジトリの一部ではない、参照専用)。

確定した設計判断

- 権限モデル: admin/担当者/レビュアーの権限差を維持。Firestore Rulesで実装(クライアント信用しない)。
- PDFレポート: ブラウザ印刷(window.print())。Playwright/サーバー生成なし。既存report.css/report_hyoshi.cssを移植。
- 画像埋め込み: 別配列フィールド(images[])+Markdown内プレースホルダートークbase64をFirestoreドキュメントに直接保存(Storage不使用)。圧縮必須。
- Discord通知: 維持。Vercel動的デプロイ+API Route 1本(/api/discord-notify)でWebhook中継。DB接続はクライアント直結のまま(サーバー負荷最小化)。
- 画像キャッシュ: 独自Service Worker実装しない。Firestore SDKのpersistentLocalCache(IndexedDB)がbase64フィールド含め自動キャッシュするため冗長。
- 認証方式: Googleログインのみ(signInWithPopup+GoogleAuthProvider)。パスワード管理不要、token.emailが信頼できる。
- データ移行: 新規スタート。本番データファイルはリポ内になし、移行スクリプ
- 許可メールアドレス: 未確定。プレースホルダーで実装し、後日ユーザーが追記(下記参照)。

1. Firestoreデータモデル

トップレベルコレクション(サブコレクションなし、フラット構成):

users/{uid}                 -- doc id = Firebase Auth uid
domains/{domainId}          -- auto-id
findings/{findingId}        -- auto-id (domains配下サブコレクションにしない 覧クエリのため)
findingTemplates/{templateId}
settings/app                -- singleton, doc id固定"app"

users/{uid}: email, displayName, isAdmin, createdAt

domains/{domainId}: name, description, url, startDate, endDate, surveyItems[], deleted, deletedAt, createdAt, updatedAt, findingsCount

findings/{findingId}: title, domainId, domainName(denorm), domainDeleted(denorm), assignedUserId, assignedUserName(denorm), reviewerUserId, reviewerUserName(denorm),
status(NOT_STARTED|WIP|COMPLETED|REVIEWED), notFound, severity(重大|高|中| |低|不可), severityReason, feasibilityReason, locations[{method,url,parameter}], description, reproductionSteps[], solutions, otherRemarks, references[], riskLevel(自動算出), images[{id,dataUrl,filename,sizeBytes}], deleted, deletedAt, createdAt, updatedAt

denormalize理由: クライアント直結でjoinレイヤーなし。一覧画面での逐次getDoc ザー名変更時はバッチ更新(≤500件/バッチ)で該当findingsへ伝播。

findingTemplates/{templateId}: Finding形状からdomainId/domainName/assignedUleted*除いたもの。ハード削除(元実装通り)。

settings/app: reportTitle, notFoundPrefix, updatedAt。discordWebhookUrlはここに置かない(→Vercel環境変数、理由は§5)。Admin設定画面に「Discord Webhook URLはVercel環境変数(DISCORD_WEBHOOK_URL)で設定、ここでは変更不可」の表示を出す。

複合インデックス(firestore.indexes.json): findingsに(domainId,deleted) (assignedUserId,deleted) (reviewerUserId,deleted) (deleted,domainId)

2. Rules計算ロジック(危険度)

original/app/models/finding.pyから厳密移植、クライアント算出+Rules側で再検
domains/{domainId}          -- auto-id
findings/{findingId}        -- auto-id (domains配下サブコレクションにしない: グローバル一覧/ユーザー別一覧クエリのため)
findingTemplates/{templateId}
settings/app                -- singleton, doc id固定"app"

users/{uid}: email, displayName, isAdmin, createdAt

domains/{domainId}: name, description, url, startDate, endDate, surveyItems[], deleted, deletedAt, createdAt, updatedAt, findingsCount

findings/{findingId}: title, domainId, domainName(denorm), domainDeleted(denorm), assignedUserId, assignedUserName(denorm), reviewerUserId, reviewerUserName(denorm), status(NOT_STARTED|WIP|COMPLETED|REVIEWED), notFound, severity(重大|高|中|低|その他), feasibility(高|中|低|不可), severityReason, feasibilityReason, locations[{method,url,parameter}], description, reproductionSteps[], solutions, otherRemarks, references[], riskLevel(自動算出), images[{id,dataUrl,filename,sizeBytes}], deleted, deletedAt, createdAt, updatedAt

denormalize理由: クライアント直結でjoinレイヤーなし。一覧画面での逐次getDocjoin回避のため。domain名/ユーザー名変更時はバッチ更新(≤500件/バッチ)で該当findingsへ伝播。

findingTemplates/{templateId}: Finding形状からdomainId/domainName/assignedUser*/reviewerUser*/status/deleted*除いたもの。ハード削除(元実装通り)。

settings/app: reportTitle, notFoundPrefix, updatedAt。discordWebhookUrlはここに置かない(→Vercel環境変数、理由は§5)。Admin設定画面に「Discord Webhook
URLはVercel環境変数(DISCORD_WEBHOOK_URL)で設定、ここでは変更不可」の表示を

複合インデックス(firestore.indexes.json): findingsに(domainId,deleted) (assignedUserId,deleted) (reviewerUserId,deleted) (deleted,domainId)

2. Rules計算ロジック(危険度)

original/app/models/finding.pyから厳密移植、クライアント算出+Rules側で再検証(改ざん防止):

severity_levels    = ["重大","高","中","低","その他"]
feasibility_levels = ["高","中","低","不可"]
risk_matrix[feasibility_index][severity_index] = [
  ["緊急","緊急","高","中","その他"],
  ["緊急","高","中","低","その他"],
  ["高","中","低","低","その他"],
  ["中","低","低","低","その他"],
]

3. firestore.rules 設計

function allowedEmails() { return ['egnm9stasshe@gmail.com' /* TODO: 追加分
function adminEmails()   { return ['egnm9stasshe@gmail.com' /* TODO: 追加分ここに列挙 */]; }
実装時にユーザーから正式リストを受け取り確定させる(未確定のまま実装完了させない)。

- findingTemplates: read/create/update=allowlist済み全員。delete=adminのみ。
- findings: read=allowlist済み全員。create=assignedUserId==自分必須(元実装通り作成者が担当者)、status=='NOT_STARTED'、riskLevel整合性チェック。update=以下いずれか成立で許可:
  - adminUser

3. firestore.rules 設計

function allowedEmails() { return ['egnm9stasshe@gmail.com' /* TODO: 追加分
function adminEmails()   { return ['egnm9stasshe@gmail.com' /* TODO: 追加分ここに列挙 */]; }
実装時にユーザーから正式リストを受け取り確定させる(未確定のまま実装完了させない)。

- isAllowlisted(): request.auth != null && request.auth.token.email in allowedEmails()
- isAdminUser(): allowlist済み + users/{uid}.isAdmin == true
- users/{uid}: read=allowlist済み全員。create=本人のみ、isAdminはハードコードadminEmailsと一致必須(自己昇格不可)。update=本人はdisplayNameのみ、admin可全項目。delete=adminのみ。
- settings/app: read=allowlist済み全員。write=adminのみ。
- domains: read/create=allowlist済み全員(元実装通りadmin制限なし)。update=通常項目は誰でも、deleted/deletedAt変更はadminのみ。delete(ハード)=常時不可。
- findingTemplates: read/create/update=allowlist済み全員。delete=adminのみ
- findings: read=allowlist済み全員。create=assignedUserId==自分必須(元実装通り作成者が担当者)、status=='NOT_STARTED'、riskLevel整合性チェック。update=以下いずれか成立で許可:
  - adminUser
  - 内容編集: 担当者本人のみ、assignedUserId/reviewerUserId/status/deleted/domainId不変、riskLevel整合性
  - ステータス遷移ステートマシン(original/app/views/finding.pyのupdate_progress厳密移植):
      - NOT_STARTED→WIP: 担当者のみ
    - WIP→COMPLETED: 担当者のみ
    - COMPLETED→REVIEWED: レビュアーのみ
    - REVIEWED→COMPLETED: 担当者かレビュアー
    - COMPLETED→WIP / WIP→NOT_STARTED: 担当者のみ
    - 変更キーはstatus,updatedAtのみ
  - レビュアー設定: 担当者本人がreviewerUserId設定可(自分をレビュアーに設定 )
  - assignedUserId変更(担当者再割当)は元実装通りadmin専用、非adminからは不可
  - ドキュメントサイズ上限チェック(request.resource.size() < 900000)を画像バジェットの防衛策としてcreate/update両方に追加
- 削除/復元/一括登録/設定変更はすべてisAdminUser()経由
- Rules単体テスト必須: Firebase Emulator + @firebase/rules-unit-testingで全ル拒否)をカバー

4. Next.js App Routerルート構成

Firestore/Auth SDKに触れる全ページはClient Component("use client")。サーバー側DBアクセスなし(要件通り)。

src/app/
  layout.tsx                 (Server) フォント/AuthProvider
  page.tsx                   (Client) 認証状態でredirect
  login/page.tsx
  (app)/layout.tsx           AuthGate+Sidebar
  (app)/domains/{page,add,bulk-add,[domainId],[domainId]/edit,[domainId]/ad
  (app)/findings/{page,[findingId],[findingId]/edit}
  (app)/templates/{page,add,[templateId],[templateId]/edit}
  (app)/admin/{users,users/create,settings,deleted-items}
  (app)/user/[userId]/{findings,reviews}
  reports/layout.tsx          サイドバーなし、print.cssのみ読込
  reports/finding/[findingId]/page.tsx
  reports/domain/[domainId]/page.tsx
  api/discord-notify/route.ts (Server, Node runtime。唯一のサーバーロジック)

react-router :id → Next [id]フォルダ、useParamsはnext/navigation版に置換。データ取得はonSnapshotベースの自前フック(useCollection/useDocument)でリアルタイム更新(元実装の手動ポーリングからの正当なアップグレード)。

5. Discord API Route

Webhook URLはVercelサーバー環境変数DISCORD_WEBHOOK_URLに保持(NEXT_PUBLIC_*にしない、クライアント非露出)。Firestore settingsから読む案(要Admin SDK+サービスアカウント)より、単一文字列のためにバックエンド依存を増やさない方を優先。既存Admin設定画面の「Discord Webhook URL」欄は廃止し、代わりに読み取り専用の説明表示に置換(元実装からの意図的な仕様変更として明記)。

POST /api/discord-notify
body: { message: string }
成功: 204。webhook URL未設定時も204(no-op、元実装の空文字時サイレントスキップと同じ)。
失敗: 非2xx + { error }

軽度のハードニングとして共有シークレットヘッダ(x-app-secretとVercel環境変数比較)の追加を推奨(元実装は全エンドポイントJWT保護だったため、この1本だけ無認証な点を埋める)。

発火箇所: domain/finding/template各種CRUD・状態変更・担当者/レビュアー変更の成功後にクライアントから呼ぶ。ログイン通知は元実装に存在しない新規追加(AuthProviderのonAuthStateChangedから発火)。

6. 画像埋め込み

- src/lib/imageCompress.ts: canvas経由でリサイズ(最長辺1280px)+JPEG圧縮(quality 0.6→0.4→0.3で200KB以下を目指す)。200KB超えたらクライアント側で明示エラー(サイレント劣化・切り捨て禁止): 「画像の圧縮後サイズが200KBを超えています(現在: {size}KB)。別の画像を使用するか、事前に解像度を下げてください。」
- 1finding上限: base64合計700KB、画像最大6枚。超過時は具体的な上限値を明示して拒否。
- 保存: finding.images[]配列({id,dataUrl,filename,sizeBytes})。Markdown本文には![filename](riskarm-image:{id})という短いトークンのみ挿入(本文が長大base64で汚染されるのを防ぐ、編集画面の可読性維持)。
- レンダリング時(src/lib/markdown.ts): marked.parse前にriskarm-image:([\w-]+)を正規表現置換しimages[]の実データURLに解決。
- Rules側にドキュメントサイズ上限チェックを追加(§3)して防衛。

7. UI移植方針

ほぼそのまま移植(import経路/ルーティングAPIのみ調整): Button/Input/TextArea/Select/Table/LoadingSpinner/ErrorMessage/CollapsibleText.tsx、FindingReportBlock.tsx(危険度マトリクス表示はレポートの核、ピクセル単位で維持)、report.css(791行)/report_hyoshi.css(564行、表紙)をsrc/app/print.cssへコピーしreports/layout.tsxでのみ読込、tailwind.configのダーク工業テーマパレット(dark-bg #1a1a1a / dark-card #2a2a2a / dark-border #444444 / light-text #e0e0e0 / medium-text #b0b0b0 / accent-color #cac292 / success/warning/danger/info)を現行scaffoldのshadcn風HSL変数パレットと差し替え。フォント: Inter(サンセリフ)/Merriweather(セリフ)/Fira Code(モノスペース)はnext/font/googleで自前ホスト化。

書き直し(構造は参考、Firestore/Next.js流儀で再実装): Sidebar.tsx(nav/collapse状態は維持、next/link+新AuthContext使用)、DomainForm/FindingForm(591行)/TemplateForm(468行)(フィールドレイアウト・配列編集UXは維持、送信処理をfetchからaddDoc/updateDoc直呼びに変更、画像アップロードウィジェット・リスクレベルライブプレ →src/lib/auth.tsx(AuthProviderがFirebaseonAuthStateChanged+users/{uid}自己プロビジョニング)、hooks/useApiData.ts→FirestoreネイティブonSnapshotフック。

追加依存: firebase(クライアントSDK)、marked、highlight.js、@types/marked。react-iconsは既存のFa系アイコンと1:1対応のため維持。                                                         
Firebase初期化 src/lib/firebase.ts: NEXT_PUBLIC_FIREBASE_*環境変数群(apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId)。getFirebaseAuth/getFirebaseDb呼び出し時だけブラウザで初期化する。Next.jsのprerender/buildではFirebase Authを起動しない。FirestoreはinitializeFirestoreにpersistentLocalCache({tabManager: persistentMultipleTabManager()})設定してオフラインキャッシュ有効化。

next.config.ts変更: output:'export'静的書き出し分岐・BUILD_MODE/basePathプラミング全削除(Vercel動的デプロイ前提のデフォルト出力に戻す)。

8. 認証フロー
                                                                                                                                                                                       - login/page.tsx: 「Googleでログイン」ボタン1つ→signInWithPopup(auth, new G
- 成功後AuthProviderがusers/{uid}存在確認→なければsetDocで自己プロビジョニング(Rulesがallowlist+admin一致を強制)。Rulesにpermission-deniedで拒否された場合(非allowlistメール)、明示的に「このアカウントはこのシステムへのアクセスを許可されていません」表示+サインかに遷移させない。
- サーバーセッションなし。Firebase Auth標準永続化(IndexedDB)+SDKの自動トークン更新。/api/discord-notifyはユーザー識別不要(§5参照)。
- ログアウト: SidebarボタンからsignOut(auth)。

9. src/ ディレクトリ構成

src/
  app/            (§4のルート構成)
  components/     Button/Input/TextArea/Select/Table/LoadingSpinner/ErrorMessage/
                  CollapsibleText/Sidebar/DomainForm/FindingForm/TemplateFo
                  FindingReportBlock/ImageUploadWidget(新規)
  lib/
    firebase.ts  auth.tsx  riskMatrix.ts  csv.ts  markdown.ts
    imageCompress.ts  permissions.ts  discordNotify.ts  uiHelpers.ts
    firestore/domains.ts findings.ts templates.ts settings.ts users.ts
  hooks/          useCollection.ts  useDocument.ts
  types/          Domain.ts Finding.ts FindingTemplate.ts Setting.ts UserProfile.ts
firestore.rules
firestore.indexes.json
firebase.json     (emulator設定、rulesテスト用)

実装後に必要な作業(このplan.mdとは別)

- SPECIFICATION.mdをプロジェクトルートに新規作成(グローバル指示: 設計変更時必須)。抽象度分離、意図(INTENT)は本plan.mdの「確定した設計判断」セクションを土台に整理。
- 許可メールアドレス(allowedEmails/adminEmails)の正式リストをユーザーから受領後、firestore.rulesに確定反映(現状TODOプレースホルダーのまま実装完了させない)。
- Firebase側の実プロジェクト作成・Vercel環境変数設定(NEXT_PUBLIC_FIREBASE_*ザー側作業(認証情報を要するため)。

検証方法

- firebase emulators:startでFirestore/Authエミュレータ起動、firestore.rules.test.ts(Rules単体テスト)実行: 非allowlist拒否、自己プロビジョニング、admin判定、ステータス遷移各パターン(成功/クロスロール拒否)、riskLevel改ざん拒否。
- pnpm devでNext.js起動、agent-browserで実画面確認:ログイン→ドメイン作成→指摘事項作成→ステータス遷移(担当者/レビュアー役割ごとの制限含む)→画像アップロード(圧縮・上限エラー含む)→レポート印刷プレビュー→管理者機能(削除/復元/設定)一通り。
- /api/discord-notifyはローカルで実webhook URL設定して疎通確認、未設定時204 no-op確認。

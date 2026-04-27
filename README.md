# ノリレク

乗り打ち（グループでのギャンブル）に特化した収支管理アプリ。  
リアルタイム精算 × 継続的な収支管理が特徴。

## 技術スタック

| 分類 | ライブラリ |
|---|---|
| フレームワーク | React Native + Expo SDK 51 |
| 認証 | Firebase Authentication（メール） |
| DB | Firestore（リアルタイム同期） |
| ローカルDB | expo-sqlite |
| ナビゲーション | react-navigation v6（ボトムタブ） |
| CSV共有 | expo-sharing + expo-file-system |

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/tatsuhideimao-afk/norirec.git
cd norirec
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新規プロジェクトを作成（例: `norirec-app`）
3. **Authentication** を有効化 → 「メール/パスワード」を有効にする
4. **Firestore Database** を作成（本番モード or テストモード）
5. プロジェクト設定 → 「アプリを追加」→ Web アプリを追加してFirebase configを取得

### 4. 環境設定

`app.json` の `extra` セクションにFirebase設定を記入してください：

```json
"extra": {
  "firebaseApiKey": "AIzaSy...",
  "firebaseAuthDomain": "norirec-app.firebaseapp.com",
  "firebaseProjectId": "norirec-app",
  "firebaseStorageBucket": "norirec-app.appspot.com",
  "firebaseMessagingSenderId": "123456789",
  "firebaseAppId": "1:123456789:web:abc123"
}
```

### 5. Firestoreセキュリティルールの設定

Firestore Console → ルール に以下を設定：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null
        && resource.data.members.hasAny([{'userId': request.auth.uid, 'role': 'owner'}, {'userId': request.auth.uid, 'role': 'member'}]);
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /records/{recordId} {
      allow read, write: if request.auth != null;
    }
    match /settlements/{settlementId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. アプリの起動

```bash
# Expo Go で起動（開発時）
npx expo start

# iOS シミュレーター
npx expo start --ios

# Android エミュレーター
npx expo start --android
```

## アプリ構成

```
norirec/
├── App.tsx                    # エントリーポイント
├── app.json                   # Expo設定
├── src/
│   ├── constants/
│   │   ├── colors.ts          # カラーパレット
│   │   └── venues.ts          # 競技・場名・メンバー定数
│   ├── firebase/
│   │   ├── config.ts          # Firebase初期化
│   │   ├── auth.ts            # 認証関数
│   │   └── firestore.ts       # Firestore CRUD + リスナー
│   ├── hooks/
│   │   ├── useAuth.ts         # 認証状態
│   │   ├── useGroups.ts       # グループ一覧
│   │   └── useRecords.ts      # レコード一覧・結果待ち
│   ├── navigation/
│   │   └── AppNavigator.tsx   # ボトムタブ + 認証ナビゲーション
│   ├── screens/
│   │   ├── auth/              # ログイン・会員登録
│   │   ├── home/              # ホーム（グループ一覧・精算）
│   │   ├── input/             # 4ステップ入力ウィザード
│   │   ├── result/            # 結果入力（結果待ちレース）
│   │   ├── summary/           # 集計（ノリ/個人/全体）
│   │   └── settings/          # 設定・CSV出力
│   ├── types/
│   │   └── index.ts           # TypeScript型定義
│   └── utils/
│       └── settlement.ts      # 精算計算・集計ユーティリティ
└── assets/                    # アイコン・スプラッシュ
```

## 主な機能（MVP Phase 1）

- **Firebase認証**：メール/パスワードによるアカウント作成・ログイン
- **グループ管理**：グループ作成・6桁招待コードで参加・退出
- **入力ウィザード**：4ステップ（種別→競技/場→日付/レース/金額→確認）
- **結果入力**：結果待ちレースの払戻金入力・予想者記録・勝利コメント
- **リアルタイム同期**：Firestoreリスナーによる即時反映
- **収支集計**：ノリ別・個人別・競技別の収支・ROI・的中率
- **精算機能**：最小取引数での精算額自動計算・LINE共有
- **CSVエクスポート**：全レコードをCSV出力

## データ構造（Firestore）

| コレクション | 主なフィールド |
|---|---|
| `groups` | groupId, groupName, ownerId, members[], inviteCode, planType |
| `records` | recordId, groupId, date, sport, venue, race, invest, recover, buyType, noriMembers[], pending |
| `settlements` | settlementId, groupId, settledAt, transactions[] |

## デザイン

- メインカラー: `#F97316`（オレンジ）
- サブカラー: `#FED7AA`（薄オレンジ背景）
- アクセント: `#EA580C`（濃いオレンジ）
- フラットデザイン・シャドウなし・ボーダー0.5px
- フォント: システムフォント

## ライセンス

Private

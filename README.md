# png6-poster-img

このリポジトリは、PNG6で使用するポスター画像URLを提供するためのリポジトリです。

## features
フォルダー内に4枚まで画像を配置してプッシュすることで、GitHub Actionsが自動的に画像をAtlas化して、GitHub Pagesに画像blobとして取得できるようにデプロイします。
VRChat上のワールドは、Image Loadingを使用してURLから画像を取得し、ポスターとして表示します。

## 使用方法

### 1. セットアップ

1. このリポジトリをフォークまたはクローンします
2. GitHub Pagesを有効にします
   - リポジトリの Settings > Pages
   - Source を "GitHub Actions" に設定

### 2. 画像のアップロード

1. `images` フォルダーに PNG 形式の画像を配置（最大4枚）
2. 変更をコミット・プッシュ
3. GitHub Actions が自動実行され、アトラス画像が生成されます

### 3. 画像URLの取得

生成されたアトラス画像は以下のURLでアクセス可能です：
```
https://[ユーザー名].github.io/[リポジトリ名]/packed-images.png
```

例：`https://yourname.github.io/png6-poster-img/packed-images.png`

## アトラス化仕様

### ソース画像要件

- 画像は`images`フォルダー内に配置されている必要があります
- アップロードされる画像はPNG形式である必要があります
- 画像は4枚までフォルダー内に配置することが可能です

### アトラス化処理

- GitHub Actionsからnode.jsスクリプトを使用して、`images`フォルダー内の画像をアトラス化します
- アトラス化された画像は2024x2048のサイズで生成されます
- 画像の領域を4分割して、それぞれの領域に画像を配置します
- 4分割のなかで中央に9:16のアスペクト比を持つ領域を確保します。その確保した領域の中で画像をfitさせて配置します。
  - 9:16の領域の中で、上下方向中央揃えで配置されて、9:16の画像ではない場合は上下または左右のどちらかに余白ができます
- アトラス化された画像は、`packed-images.png`として生成されます
- アトラス化された画像は、GitHub Pagesを通じてアクセス可能になります

### アトラス画像の配置

```
┌─────────────┬─────────────┐
│   画像1     │   画像2     │  ← 1024x1024 each
│             │             │
├─────────────┼─────────────┤
│   画像3     │   画像4     │
│             │             │
└─────────────┴─────────────┘
```

各セル内では9:16のアスペクト比領域に画像がフィットされます。

## 開発

### ローカル実行

```bash
# 依存関係のインストール
npm install

# アトラス生成の実行
npm run build
```

### ファイル構成

```
png6-poster-img/
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions ワークフロー
├── images/                 # ソース画像フォルダー
├── scripts/
│   └── create-atlas.js     # アトラス生成スクリプト
├── dist/                   # 生成物（自動作成）
│   ├── packed-images.png   # アトラス画像
│   └── index.html          # プレビューページ
├── package.json
└── README.md
```

## VRChatでの使用

VRChatワールドでImage Loadingを使用して画像を読み込む際は、生成されたURLを指定してください：

```csharp
// 例：UdonSharpでの使用
string imageUrl = "https://yourname.github.io/png6-poster-img/packed-images.png";
// Image Loading コンポーネントでこのURLを使用
```

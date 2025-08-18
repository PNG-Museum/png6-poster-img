const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ImageAtlasBuilder {
  constructor() {
    this.ATLAS_WIDTH = 2024;
    this.ATLAS_HEIGHT = 2048;
    this.GRID_COLS = 2;
    this.GRID_ROWS = 2;
    this.CELL_WIDTH = this.ATLAS_WIDTH / this.GRID_COLS;
    this.CELL_HEIGHT = this.ATLAS_HEIGHT / this.GRID_ROWS;

    // 9:16のアスペクト比領域のサイズ
    this.TARGET_ASPECT_RATIO = 9 / 16;
    this.TARGET_HEIGHT = this.CELL_HEIGHT
    this.TARGET_WIDTH = Math.floor(this.TARGET_HEIGHT * this.TARGET_ASPECT_RATIO);
  }

  async loadImages() {
    const imagesDir = path.join(__dirname, '..', 'images');

    try {
      const files = await fs.readdir(imagesDir);
      const imageFiles = files.filter(file =>
        /\.(png|jpg|jpeg)$/i.test(file)
      ).slice(0, 4); // 最大4枚まで

      console.log(`Found ${imageFiles.length} image(s):`, imageFiles);

      const images = [];
      for (const file of imageFiles) {
        const filePath = path.join(imagesDir, file);
        const imageBuffer = await fs.readFile(filePath);
        images.push({
          name: file,
          buffer: imageBuffer
        });
      }

      return images;
    } catch (error) {
      console.error('Error loading images:', error);
      return [];
    }
  }

  async resizeImageToFit(imageBuffer) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    const sourceRatio = metadata.width / metadata.height;
    const targetRatio = this.TARGET_ASPECT_RATIO;

    let resizeWidth, resizeHeight;

    // 画像をトリミングせずに9:16の領域内にフィットさせる
    if (sourceRatio > targetRatio) {
      // 横長画像：幅を基準にリサイズして高さを調整
      resizeWidth = this.TARGET_WIDTH;
      resizeHeight = Math.floor(resizeWidth / sourceRatio);
    } else {
      // 縦長画像：高さを基準にリサイズして幅を調整
      resizeHeight = this.TARGET_HEIGHT;
      resizeWidth = Math.floor(resizeHeight * sourceRatio);
    }

    // 画像をリサイズ（トリミングなし）
    const resizedImage = await image
      .resize(resizeWidth, resizeHeight, {
        fit: 'inside', // 画像全体を保持してフィット
        withoutEnlargement: false // 必要に応じて拡大も許可
      })
      .png()
      .toBuffer();

    return resizedImage;
  }

  async createAtlas(images) {
    // 白背景のアトラス画像を作成
    const atlas = sharp({
      create: {
        width: this.ATLAS_WIDTH,
        height: this.ATLAS_HEIGHT,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    const compositeOperations = [];

    // 各画像を対応するセルに配置
    for (let i = 0; i < Math.min(images.length, 4); i++) {
      const row = Math.floor(i / this.GRID_COLS);
      const col = i % this.GRID_COLS;

      const cellX = col * this.CELL_WIDTH;
      const cellY = row * this.CELL_HEIGHT;

      console.log(`Processing ${images[i].name} for cell (${row}, ${col})`);

      try {
        const resizedImage = await this.resizeImageToFit(images[i].buffer);

        // リサイズされた画像のメタデータを取得
        const resizedMetadata = await sharp(resizedImage).metadata();

        // 9:16領域内での中央配置計算
        const targetAreaX = cellX + Math.floor((this.CELL_WIDTH - this.TARGET_WIDTH) / 2);
        const targetAreaY = cellY + Math.floor((this.CELL_HEIGHT - this.TARGET_HEIGHT) / 2);

        // 9:16領域内で画像を中央配置
        const finalX = targetAreaX + Math.floor((this.TARGET_WIDTH - resizedMetadata.width) / 2);
        const finalY = targetAreaY + Math.floor((this.TARGET_HEIGHT - resizedMetadata.height) / 2);

        console.log(`Placing ${images[i].name} at position (${finalX}, ${finalY}) - size: ${resizedMetadata.width}x${resizedMetadata.height}`);

        compositeOperations.push({
          input: resizedImage,
          left: finalX,
          top: finalY
        });
      } catch (error) {
        console.error(`Error processing image ${images[i].name}:`, error);
      }
    }

    return atlas.composite(compositeOperations).png();
  }

  async build() {
    try {
      console.log('Starting atlas creation...');

      // distディレクトリを作成
      const distDir = path.join(__dirname, '..', 'dist');
      await fs.mkdir(distDir, { recursive: true });

      // 画像を読み込み
      const images = await this.loadImages();

      if (images.length === 0) {
        console.log('No images found. Creating empty atlas...');
        // 空のアトラスを作成
        const emptyAtlas = sharp({
          create: {
            width: this.ATLAS_WIDTH,
            height: this.ATLAS_HEIGHT,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        }).png();

        await emptyAtlas.toFile(path.join(distDir, 'packed-images.png'));
      } else {
        // アトラス画像を作成
        const atlas = await this.createAtlas(images);
        await atlas.toFile(path.join(distDir, 'packed-images.png'));
      }

      // インデックスHTMLファイルを作成（GitHub Pages用）
      const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PNG6 Poster Images</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .atlas-container { 
      text-align: center; 
      margin: 20px 0; 
    }
    .atlas-image { 
      max-width: 100%; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
    }
    .info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>PNG6 Poster Images</h1>
  <div class="info">
    <p>このページは PNG6 で使用するポスター画像を提供します。</p>
    <p>アトラス画像のサイズ: 2024 × 2048</p>
    <p>画像数: ${images.length}/4</p>
  </div>
  
  <div class="atlas-container">
    <h2>Atlas Image</h2>
    <img src="packed-images.png" alt="Atlas Image" class="atlas-image">
  </div>
  
  <div class="info">
    <h3>直接アクセス URL</h3>
    <p><code>https://[ユーザー名].github.io/[リポジトリ名]/packed-images.png</code></p>
  </div>
</body>
</html>`;

      await fs.writeFile(path.join(distDir, 'index.html'), indexHtml);

      console.log(`✅ Atlas creation completed successfully!`);
      console.log(`📊 Images processed: ${images.length}/4`);
      console.log(`📁 Output files created in dist/`);
      console.log(`   - packed-images.png (${this.ATLAS_WIDTH}x${this.ATLAS_HEIGHT})`);
      console.log(`   - index.html`);

    } catch (error) {
      console.error('❌ Error creating atlas:', error);
      process.exit(1);
    }
  }
}

// スクリプトが直接実行された場合に実行
if (require.main === module) {
  const builder = new ImageAtlasBuilder();
  builder.build();
}

module.exports = ImageAtlasBuilder;

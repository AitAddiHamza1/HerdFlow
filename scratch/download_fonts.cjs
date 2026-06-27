const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

function download(url, filename) {
  const destPath = path.join(dir, filename);
  const file = fs.createWriteStream(destPath);
  
  https.get(url, function(response) {
    if (response.statusCode === 301 || response.statusCode === 302) {
      // Follow redirects
      download(response.headers.location, filename);
      return;
    }
    
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${filename}: status code ${response.statusCode}`);
      file.close();
      fs.unlinkSync(destPath);
      return;
    }
    
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename} successfully.`);
    });
  }).on('error', (err) => {
    file.close();
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    console.error(`Error downloading ${filename}:`, err.message);
  });
}

download("https://github.com/googlefonts/tajawal/raw/main/fonts/ttf/Tajawal-Regular.ttf", "Tajawal-Regular.ttf");
download("https://github.com/googlefonts/tajawal/raw/main/fonts/ttf/Tajawal-Bold.ttf", "Tajawal-Bold.ttf");

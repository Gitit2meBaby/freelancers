const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'media');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

async function downloadMedia() {
  let page = 1;
  let fetched;
  do {
    const res = await axios.get(`https://freelancers.com.au/wp-json/wp/v2/media?per_page=100&page=${page}`, {
      auth: { username: 'YOUR_USER', password: 'YOUR_APP_PASSWORD' } // if authentication needed
    });
    fetched = res.data;

    for (const item of fetched) {
      const url = item.source_url;
      const fileName = path.basename(url);
      const filePath = path.join(OUTPUT_DIR, fileName);

      // Skip duplicates
      if (fs.existsSync(filePath)) continue;

      const media = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, media.data);
      console.log(`Downloaded ${fileName}`);
    }

    page++;
  } while (fetched.length > 0);
}

downloadMedia();

import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const res = await axios.get('https://devpost.com/hackathons');
    const $ = cheerio.load(res.data);
    const events = [];
    $('.clearfix.mb-4.hackathon-tile').each((i, el) => {
      events.push({
        title: $(el).find('h3').text().trim(),
        applyLink: $(el).find('a').attr('href')
      });
    });
    console.log("Devpost Events:", events.slice(0, 3));
  } catch (e) {
    console.error("Devpost Error:", e.response ? e.response.status : e.message);
  }
}

test();

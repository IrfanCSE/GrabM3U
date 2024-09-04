const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/generate-m3u', async (req, res) => {
    const pageUrl = req.query.url;

    if (!pageUrl) {
        return res.status(400).send('URL is required');
    }

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        // Find all video download links
        const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg', '.ogg'];
        const videoLinks = [];

        $('a').each((index, element) => {
            let href = $(element).attr('href');
            if (href) {
                const isVideoFile = videoExtensions.some(ext => href.toLowerCase().endsWith(ext));
                if (isVideoFile || href.includes('download')) {
                    href = new URL(href, pageUrl).href;
                    videoLinks.push(href);
                }
            }
        });

        if (videoLinks.length === 0) {
            return res.status(404).send('No video links found.');
        }

        // Generate M3U content
        let m3uContent = '#EXTM3U\n';
        videoLinks.forEach((link, index) => {
            m3uContent += `#EXTINF:-1, Video ${index + 1}\n${link}\n`;
        });

        // Set headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename=playlist.m3u');
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(m3uContent);

    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).send('An error occurred while fetching the page.');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

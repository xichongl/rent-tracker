import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const url = 'https://www.equityapartments.com/boston/west-end/emerson-place-apartments';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Look for all text containing prices to understand structure
    const body = $('body').text();
    const prices = body.match(/\$\s*[\d,]+/g) || [];
    const unique Prices = [...new Set(prices.map(p => p.replace(/[^\d]/g, '')))] .slice(0, 10);
    console.log('\nFound prices:', uniquePrices);
    
    // Find an article or card
    const article = $('article').first();
    if (article.length) {
      cimport puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

carimport * as cheerio from 'cheerio  
const url = 'https://www.equityap ar
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--n, d  const browsit  const page = await browser.newPage();
  
  try {
    console.log('Fetching page...');
    await page.goto(url, co  
  try {
    console.log('Fetching pg(0,     co
     await page.goto(url, { waitUnti
     const content = await page.content();
    const $ = cheerio.load(co;
    ;

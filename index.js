const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const async = require('async');
const UserAgent = require('user-agents');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Enhanced Configuration
const CONFIG = {
    name: 'Ragnarok Hunt Ultra',
    version: '3.0.0',
    port: process.env.PORT || 3000,
    timeout: 20000,
    maxRetries: 5,
    delayBetweenRequests: 800,
    maxConcurrentSearches: 15,
    maxConcurrentAnalysis: 10,
    searchDepth: 12, // Increased from 4 to 12
    cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: 10000,
    deepAnalysis: true
};

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enhanced cache system
const siteCache = new Map();
const domainRepeatCache = new Map();
const blacklistedDomains = new Set();

// Expanded excluded domains with news, blogs, and irrelevant sites
const EXCLUDED_DOMAINS = [
    // Major platforms
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'netflix.com',
    'yahoo.com', 'bing.com', 'microsoft.com', 'apple.com', 'baidu.com',
    'qq.com', 'pinterest.com', 'tiktok.com', 'ebay.com', 'twitch.tv',
    'adobe.com', 'live.com', 'zoom.us', 'office.com', 'github.com',
    'whatsapp.com', 'wordpress.com', 'cloudflare.com', 'blogspot.com', 'tumblr.com',
    
    // News and media sites
    'cnn.com', 'bbc.com', 'reuters.com', 'ap.org', 'nytimes.com',
    'washingtonpost.com', 'theguardian.com', 'wsj.com', 'bloomberg.com',
    'forbes.com', 'techcrunch.com', 'wired.com', 'engadget.com',
    'mashable.com', 'buzzfeed.com', 'huffpost.com', 'vox.com',
    'slate.com', 'npr.org', 'pbs.org', 'cbsnews.com', 'abcnews.go.com',
    'nbcnews.com', 'foxnews.com', 'usatoday.com', 'latimes.com',
    
    // Blogs and content platforms
    'medium.com', 'substack.com', 'ghost.org', 'squarespace.com',
    'wix.com', 'weebly.com', 'jimdo.com', 'webflow.com',
    'blogger.com', 'typepad.com', 'livejournal.com',
    
    // Job sites
    'indeed.com', 'glassdoor.com', 'monster.com', 'careerbuilder.com',
    'ziprecruiter.com', 'simplyhired.com', 'jobs.com',
    
    // Travel and reviews
    'tripadvisor.com', 'booking.com', 'expedia.com', 'hotels.com',
    'airbnb.com', 'kayak.com', 'priceline.com', 'yelp.com',
    'yellowpages.com', 'foursquare.com',
    
    // Educational
    'coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org',
    'mit.edu', 'harvard.edu', 'stanford.edu', 'berkeley.edu',
    
    // Government and organizations
    'gov', 'edu', 'org', 'mil', 'int',
    
    // File sharing and cloud
    'dropbox.com', 'drive.google.com', 'onedrive.com', 'icloud.com',
    'mega.nz', 'mediafire.com', 'rapidshare.com',
    
    // Forums and communities
    'stackoverflow.com', 'stackexchange.com', 'quora.com',
    'discord.com', 'slack.com', 'telegram.org'
];

// Ultra-enhanced payment patterns with machine learning-like scoring
const PAYMENT_PATTERNS = {
    processors: [
        // Major processors
        'stripe', 'paypal', 'square', 'braintree', 'authorize.net', 'worldpay',
        'adyen', 'klarna', 'razorpay', 'mercadopago', 'payu', 'mollie',
        'checkout.com', 'coinbase', 'bitpay', 'payoneer', 'skrill', 'wise',
        
        // E-commerce platforms
        'shopify', 'woocommerce', 'magento', 'prestashop', 'opencart',
        'bigcommerce', 'volusion', 'squarespace', 'wix', 'weebly',
        
        // Regional processors
        'alipay', 'wechatpay', 'unionpay', 'paytm', 'phonepe', 'gpay',
        'apple-pay', 'google-pay', 'samsung-pay', 'venmo', 'zelle',
        'interac', 'ideal', 'sofort', 'giropay', 'bancontact',
        'eps', 'p24', 'multibanco', 'mybank', 'blik',
        
        // Crypto processors
        'coingate', 'coinpayments', 'bitpay', 'coinbase-commerce',
        'nowpayments', 'cryptomus', 'plisio', 'coinremitter',
        
        // Subscription services
        'recurly', 'chargebee', 'zuora', 'paddle', 'fastspring',
        'gumroad', 'sellfy', 'payhip', 'lemonsqueezy'
    ],
    
    highValueKeywords: [
        'payment gateway', 'secure checkout', 'ssl payment', 'encrypted payment',
        'merchant account', 'payment processor', 'credit card processing',
        'online payments', 'accept payments', 'payment solution',
        'checkout process', 'payment integration', 'payment api',
        'recurring billing', 'subscription billing', 'payment forms'
    ],
    
    mediumValueKeywords: [
        'payment', 'checkout', 'billing', 'subscription', 'premium', 'pro',
        'upgrade', 'buy now', 'purchase', 'cart', 'order', 'invoice',
        'credit card', 'debit card', 'paypal', 'bitcoin', 'cryptocurrency',
        'monthly', 'yearly', 'annual', 'trial', 'free trial', 'pricing',
        'add to cart', 'proceed to checkout', 'complete purchase', 'payment method'
    ],
    
    lowValueKeywords: [
        'price', 'cost', 'fee', 'charge', 'money', 'dollar', 'euro',
        'currency', 'transaction', 'financial', 'commerce', 'business'
    ],
    
    advancedSelectors: [
        // Payment forms
        'form[action*="payment"]', 'form[action*="checkout"]', 'form[action*="billing"]',
        'form[action*="subscribe"]', 'form[action*="purchase"]', 'form[action*="order"]',
        
        // Payment containers
        '.payment-form', '.checkout-form', '.billing-form', '.subscription-form',
        '.payment-container', '.checkout-container', '.billing-container',
        '.payment-section', '.checkout-section', '.billing-section',
        
        // Payment IDs
        '#payment', '#checkout', '#billing', '#subscription', '#cart',
        '#payment-form', '#checkout-form', '#billing-form',
        
        // Card inputs
        'input[name*="card"]', 'input[name*="payment"]', 'input[name*="billing"]',
        'input[placeholder*="card"]', 'input[placeholder*="credit"]',
        'input[placeholder*="debit"]', 'input[name*="cvv"]', 'input[name*="cvc"]',
        'input[name*="cvn"]', 'input[name*="expiry"]', 'input[name*="exp"]',
        
        // Processor elements
        '.stripe-element', '.paypal-button', '.square-payment', '.shop-pay',
        '[data-stripe]', '[data-paypal]', '[data-square]', '[data-checkout]',
        '[data-payment]', '[data-billing]', '[data-subscription]',
        
        // E-commerce elements
        '.add-to-cart', '.buy-now', '.checkout-btn', '.payment-btn',
        '.purchase-btn', '.subscribe-btn', '.upgrade-btn'
    ],
    
    urlPatterns: [
        '/payment', '/checkout', '/billing', '/subscribe', '/upgrade',
        '/premium', '/pro', '/buy', '/purchase', '/cart', '/order',
        '/shop', '/store', '/pricing', '/plans', '/membership',
        '/pay', '/invoice', '/receipt', '/transaction', '/gateway'
    ],
    
    // Advanced detection patterns
    scriptPatterns: [
        'stripe.js', 'paypal.js', 'square.js', 'braintree.js',
        'checkout.js', 'payment.js', 'billing.js', 'commerce.js'
    ],
    
    metaPatterns: [
        'payment', 'checkout', 'billing', 'subscription', 'premium',
        'buy', 'purchase', 'order', 'cart', 'shop', 'store'
    ]
};

// 25+ Search Engines with enhanced configurations
const SEARCH_ENGINES = [
    {
        name: 'DuckDuckGo',
        baseUrl: 'https://html.duckduckgo.com/html/',
        url: (keyword, page) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}&s=${page * 30}`,
        headers: { 'Referer': 'https://duckduckgo.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result__url, .result__a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && !href.includes('duckduckgo.com')) {
                    try {
                        const fullUrl = href.startsWith('http') ? href : 'https://' + href;
                        links.push(fullUrl);
                    } catch (e) {}
                }
            });
            return links;
        }
    },
    {
        name: 'Bing',
        baseUrl: 'https://www.bing.com/',
        url: (keyword, page) => `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&first=${page * 10 + 1}`,
        headers: { 'Referer': 'https://www.bing.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.b_algo h2 a, .b_title a, .b_attribution cite').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('bing.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Yandex',
        baseUrl: 'https://yandex.com/',
        url: (keyword, page) => `https://yandex.com/search/?text=${encodeURIComponent(keyword)}&p=${page}`,
        headers: { 'Referer': 'https://yandex.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.serp-item a.link, .organic__url a, .Path-Item').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('yandex.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Searx',
        baseUrl: 'https://searx.org/',
        url: (keyword, page) => `https://searx.org/search?q=${encodeURIComponent(keyword)}&pageno=${page + 1}`,
        headers: { 'Referer': 'https://searx.org/' },
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a, .result-url').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('searx.org')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Startpage',
        baseUrl: 'https://www.startpage.com/',
        url: (keyword, page) => `https://www.startpage.com/sp/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://www.startpage.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.w-gl__result-url, .result-link, .result__url').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('startpage.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Ecosia',
        baseUrl: 'https://www.ecosia.org/',
        url: (keyword, page) => `https://www.ecosia.org/search?q=${encodeURIComponent(keyword)}&p=${page}`,
        headers: { 'Referer': 'https://www.ecosia.org/' },
        extractLinks: ($) => {
            const links = [];
            $('.result a.result-url, .result__title a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('ecosia.org')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Brave',
        baseUrl: 'https://search.brave.com/',
        url: (keyword, page) => `https://search.brave.com/search?q=${encodeURIComponent(keyword)}&offset=${page * 10}`,
        headers: { 'Referer': 'https://search.brave.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.snippet-url, .result-header a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && !href.includes('brave.com')) {
                    try {
                        const fullUrl = href.startsWith('http') ? href : 'https://' + href;
                        links.push(fullUrl);
                    } catch (e) {}
                }
            });
            return links;
        }
    },
    {
        name: 'Qwant',
        baseUrl: 'https://www.qwant.com/',
        url: (keyword, page) => `https://www.qwant.com/?q=${encodeURIComponent(keyword)}&t=web&o=${page * 10}`,
        headers: { 'Referer': 'https://www.qwant.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result__url, .result__title a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('qwant.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Swisscows',
        baseUrl: 'https://swisscows.com/',
        url: (keyword, page) => `https://swisscows.com/web?query=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://swisscows.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.web-result h3 a, .web-result cite').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('swisscows.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'MetaGer',
        baseUrl: 'https://metager.org/',
        url: (keyword, page) => `https://metager.org/meta/meta.ger3?eingabe=${encodeURIComponent(keyword)}&mm=and&time=1&sprueche=off&lang=all&wdth=1280&hght=1024&ff=on&inauthor=&inurl=&intitle=&site=&tld=&filetype=&linkto=&suchen=&page=${page + 1}`,
        headers: { 'Referer': 'https://metager.org/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h2 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('metager.org')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Gibiru',
        baseUrl: 'https://gibiru.com/',
        url: (keyword, page) => `https://gibiru.com/results.html?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://gibiru.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('gibiru.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Mojeek',
        baseUrl: 'https://www.mojeek.com/',
        url: (keyword, page) => `https://www.mojeek.com/search?q=${encodeURIComponent(keyword)}&s=${page * 10}`,
        headers: { 'Referer': 'https://www.mojeek.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.results-url, .results-standard h2 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('mojeek.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Peekier',
        baseUrl: 'https://peekier.com/',
        url: (keyword, page) => `https://peekier.com/search?q=${encodeURIComponent(keyword)}&p=${page + 1}`,
        headers: { 'Referer': 'https://peekier.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('peekier.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Oscobo',
        baseUrl: 'https://oscobo.com/',
        url: (keyword, page) => `https://oscobo.com/search.php?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://oscobo.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('oscobo.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Lukol',
        baseUrl: 'https://www.lukol.com/',
        url: (keyword, page) => `https://www.lukol.com/s.php?q=${encodeURIComponent(keyword)}&p=${page + 1}`,
        headers: { 'Referer': 'https://www.lukol.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('lukol.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Disconnect',
        baseUrl: 'https://search.disconnect.me/',
        url: (keyword, page) => `https://search.disconnect.me/searchTerms/${encodeURIComponent(keyword)}?page=${page + 1}`,
        headers: { 'Referer': 'https://search.disconnect.me/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('disconnect.me')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Fireball',
        baseUrl: 'https://fireball.de/',
        url: (keyword, page) => `https://fireball.de/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://fireball.de/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('fireball.de')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Findx',
        baseUrl: 'https://www.findx.com/',
        url: (keyword, page) => `https://www.findx.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://www.findx.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('findx.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Neeva',
        baseUrl: 'https://neeva.com/',
        url: (keyword, page) => `https://neeva.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://neeva.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('neeva.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Baidu',
        baseUrl: 'https://www.baidu.com/',
        url: (keyword, page) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}&pn=${page * 10}`,
        headers: { 'Referer': 'https://www.baidu.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result a, .c-container h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('baidu.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Sogou',
        baseUrl: 'https://www.sogou.com/',
        url: (keyword, page) => `https://www.sogou.com/web?query=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://www.sogou.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result a, .results h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('sogou.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Naver',
        baseUrl: 'https://search.naver.com/',
        url: (keyword, page) => `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&start=${page * 10 + 1}`,
        headers: { 'Referer': 'https://search.naver.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result a, .total_tit a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('naver.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Seznam',
        baseUrl: 'https://search.seznam.cz/',
        url: (keyword, page) => `https://search.seznam.cz/?q=${encodeURIComponent(keyword)}&count=10&start=${page * 10}`,
        headers: { 'Referer': 'https://search.seznam.cz/' },
        extractLinks: ($) => {
            const links = [];
            $('.result a, .Result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('seznam.cz')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Yippy',
        baseUrl: 'https://yippy.com/',
        url: (keyword, page) => `https://yippy.com/search?query=${encodeURIComponent(keyword)}&page=${page + 1}`,
        headers: { 'Referer': 'https://yippy.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('yippy.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },
    {
        name: 'Yep',
        baseUrl: 'https://yep.com/',
        url: (keyword, page) => `https://yep.com/web?q=${encodeURIComponent(keyword)}&no_correct=false&tab=web&safeSearch=off&page=${page + 1}`,
        headers: { 'Referer': 'https://yep.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result-url, .result h3 a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('yep.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    }
];

// Concurrency control
const searchQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentSearches);

const analysisQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentAnalysis);

// Enhanced cache functions
function getCacheKey(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

function getCachedResult(url) {
    const key = getCacheKey(url);
    const cached = siteCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CONFIG.cacheExpiry) {
        return cached.data;
    }
    return null;
}

function setCachedResult(url, data) {
    const key = getCacheKey(url);
    if (siteCache.size >= CONFIG.maxCacheSize) {
        const firstKey = siteCache.keys().next().value;
        siteCache.delete(firstKey);
    }
    siteCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

function updateDomainRepeatCount(domain) {
    const count = domainRepeatCache.get(domain) || 0;
    domainRepeatCache.set(domain, count + 1);
    
    // Auto-blacklist domains that appear too frequently
    if (count > 10) {
        blacklistedDomains.add(domain);
    }
    
    return count;
}

// Enhanced axios instance
function createAxiosInstance(options = {}) {
    const userAgent = new UserAgent();
    const config = {
        timeout: CONFIG.timeout,
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
            maxSockets: CONFIG.maxConcurrentSearches
        }),
        validateStatus: () => true,
        headers: {
            'User-Agent': userAgent.toString(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,de;q=0.6',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        ...options
    };
    return axios.create(config);
}

// Ultra-enhanced Cloudflare detection
async function checkCloudflare(targetUrl, responseData, headers) {
    try {
        const cloudflareHeaders = [
            'cf-ray', 'cf-cache-status', 'cf-request-id', 'cf-visitor',
            'cf-connecting-ip', 'cf-ipcountry', 'cf-team', 'cf-polished',
            'cf-bgj', 'cf-edge-cache', 'cf-apo-via'
        ];

        const hasCloudflareHeaders = cloudflareHeaders.some(header => 
            headers[header] || headers[header.toLowerCase()]
        );

        const serverHeader = (headers.server || headers.Server || '').toLowerCase();
        const hasCloudflareServer = serverHeader.includes('cloudflare') || 
                                   serverHeader.includes('cf-');

        const content = typeof responseData === 'string' ? responseData.toLowerCase() : '';
        const cloudflareContent = [
            'cloudflare', 'cf-browser-verification', 'cf-challenge-form',
            'ddos protection by cloudflare', 'checking your browser',
            'ray id:', 'cloudflare-nginx', '__cf_bm', 'cf_clearance',
            'just a moment', 'enable javascript and cookies',
            'please wait while we are checking your browser',
            'this process is automatic', 'your browser will redirect',
            'cf-challenge', 'cf-spinner', 'cf-wrapper'
        ];

        const hasCloudflareContent = cloudflareContent.some(pattern => 
            content.includes(pattern)
        );

        const $ = cheerio.load(responseData);
        const hasCloudflareElements = $('.cf-browser-verification, .cf-challenge-form, .cf-spinner').length > 0;

        const confidence = 
            (hasCloudflareHeaders ? 0.9 : 0) +
            (hasCloudflareServer ? 0.8 : 0) +
            (hasCloudflareContent ? 0.7 : 0) +
            (hasCloudflareElements ? 0.6 : 0);

        return {
            detected: confidence >= 0.6,
            headers: hasCloudflareHeaders,
            server: hasCloudflareServer,
            content: hasCloudflareContent,
            elements: hasCloudflareElements,
            rayId: headers['cf-ray'] || headers['CF-RAY'] || 'N/A',
            confidence: Math.min(confidence, 1)
        };
    } catch (error) {
        return { detected: false, confidence: 0 };
    }
}

// Ultra-enhanced CAPTCHA detection
async function checkCaptcha(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();

        // Enhanced CAPTCHA form detection
        const captchaForms = [
            'form[action*="/captcha/"]', 'form[action*="/challenge/"]',
            'form[action*="/verify/"]', 'form[id*="captcha"]',
            'form[class*="captcha"]', 'form[action*="/human/"]',
            'form[action*="/robot/"]', 'form[action*="/security/"]'
        ];

        const hasCaptchaForm = captchaForms.some(selector => $(selector).length > 0);

        // Enhanced CAPTCHA elements
        const captchaElements = [
            '.captcha', '#captcha', '.g-recaptcha', '.h-captcha',
            '.cf-captcha', '.recaptcha', '.hcaptcha', '.turnstile',
            '.funcaptcha', '.arkose', '.geetest', '.mtcaptcha',
            'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
            'iframe[src*="captcha"]', '[data-sitekey]', '[data-callback]',
            '.captcha-container', '.captcha-wrapper', '.verification-container'
        ];

        const hasCaptchaElements = captchaElements.some(selector => $(selector).length > 0);

        // Enhanced CAPTCHA text patterns
        const captchaTexts = [
            'verify you are human', 'prove you are human', 'i am not a robot',
            'captcha', 'recaptcha', 'hcaptcha', 'security check',
            'anti-bot verification', 'human verification', 'please complete',
            'solve the challenge', 'verify your identity', 'are you human',
            'complete the verification', 'security verification',
            'anti-spam verification', 'robot check', 'bot detection'
        ];

        const hasCaptchaText = captchaTexts.some(text => content.includes(text));

        // Enhanced CAPTCHA scripts
        const captchaScripts = [
            'recaptcha', 'hcaptcha', 'captcha', 'cf-challenge',
            'turnstile', 'funcaptcha', 'arkose', 'geetest',
            'mtcaptcha', 'keycaptcha', 'solvemedia'
        ];

        const hasCaptchaScript = captchaScripts.some(script => 
            $(`script[src*="${script}"]`).length > 0 || content.includes(script)
        );

        // Check for CAPTCHA images
        const hasCaptchaImage = $('img[src*="captcha"], img[alt*="captcha"], img[alt*="verification"]').length > 0;

        const confidence = 
            (hasCaptchaForm ? 0.9 : 0) +
            (hasCaptchaElements ? 0.8 : 0) +
            (hasCaptchaText ? 0.6 : 0) +
            (hasCaptchaScript ? 0.7 : 0) +
            (hasCaptchaImage ? 0.5 : 0);

        return {
            detected: confidence >= 0.6,
            form: hasCaptchaForm,
            elements: hasCaptchaElements,
            text: hasCaptchaText,
            script: hasCaptchaScript,
            image: hasCaptchaImage,
            confidence: Math.min(confidence, 1)
        };
    } catch (error) {
        return { detected: false, confidence: 0 };
    }
}

// Ultra-enhanced payment gateway detection with machine learning-like scoring
async function checkPaymentGateway(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();
        const url = targetUrl.toLowerCase();

        let totalScore = 0;
        let detectionDetails = {};

        // URL pattern analysis (High weight)
        const hasPaymentUrl = PAYMENT_PATTERNS.urlPatterns.some(pattern => 
            url.includes(pattern)
        );
        if (hasPaymentUrl) {
            totalScore += 15;
            detectionDetails.paymentUrl = true;
        }

        // Payment processor detection (Very high weight)
        const detectedProcessors = PAYMENT_PATTERNS.processors.filter(processor => 
            content.includes(processor) || 
            $(`script[src*="${processor}"]`).length > 0 ||
            $(`link[href*="${processor}"]`).length > 0 ||
            $(`[class*="${processor}"]`).length > 0 ||
            $(`[id*="${processor}"]`).length > 0
        );

        if (detectedProcessors.length > 0) {
            totalScore += detectedProcessors.length * 12;
            detectionDetails.processors = detectedProcessors;
        }

        // High-value keyword detection (High weight)
        const detectedHighValueKeywords = PAYMENT_PATTERNS.highValueKeywords.filter(keyword => 
            content.includes(keyword)
        );
        totalScore += detectedHighValueKeywords.length * 8;

        // Medium-value keyword detection (Medium weight)
        const detectedMediumValueKeywords = PAYMENT_PATTERNS.mediumValueKeywords.filter(keyword => 
            content.includes(keyword)
        );
        totalScore += detectedMediumValueKeywords.length * 4;

        // Low-value keyword detection (Low weight)
        const detectedLowValueKeywords = PAYMENT_PATTERNS.lowValueKeywords.filter(keyword => 
            content.includes(keyword)
        );
        totalScore += detectedLowValueKeywords.length * 1;

        // Payment form detection (Very high weight)
        const hasPaymentForm = PAYMENT_PATTERNS.advancedSelectors.some(selector => {
            try {
                return $(selector).length > 0;
            } catch (e) {
                return false;
            }
        });

        if (hasPaymentForm) {
            totalScore += 20;
            detectionDetails.paymentForm = true;
        }

        // SSL/TLS certificate detection (Medium weight)
        if (targetUrl.startsWith('https://')) {
            totalScore += 5;
            detectionDetails.hasSSL = true;
        }

        // Meta tag analysis (Medium weight)
        const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const metaContent = (metaKeywords + ' ' + metaDescription).toLowerCase();

        const hasPaymentMeta = PAYMENT_PATTERNS.metaPatterns.some(pattern => 
            metaContent.includes(pattern)
        );

        if (hasPaymentMeta) {
            totalScore += 6;
            detectionDetails.paymentMeta = true;
        }

        // Script analysis (High weight)
        const hasPaymentScript = PAYMENT_PATTERNS.scriptPatterns.some(script => 
            $(`script[src*="${script}"]`).length > 0
        );

        if (hasPaymentScript) {
            totalScore += 10;
            detectionDetails.paymentScript = true;
        }

        // Price detection (Medium weight)
        const pricePatterns = [
            /\$\d+\.?\d*/g, /€\d+\.?\d*/g, /£\d+\.?\d*/g,
            /\d+\s*USD/gi, /\d+\s*EUR/gi, /\d+\s*GBP/gi,
            /price:\s*\$?\d+/gi, /cost:\s*\$?\d+/gi,
            /total:\s*\$?\d+/gi, /amount:\s*\$?\d+/gi
        ];

        const hasPricing = pricePatterns.some(pattern => pattern.test(content));
        if (hasPricing) {
            totalScore += 8;
            detectionDetails.hasPricing = true;
        }

        // E-commerce indicators (Medium weight)
        const ecommerceIndicators = [
            'add to cart', 'shopping cart', 'checkout now', 'buy now',
            'proceed to checkout', 'complete order', 'place order',
            'shopping bag', 'view cart', 'update cart', 'remove from cart'
        ];

        const hasEcommerce = ecommerceIndicators.some(indicator => 
            content.includes(indicator)
        );

        if (hasEcommerce) {
            totalScore += 10;
            detectionDetails.hasEcommerce = true;
        }

        // Advanced payment field detection (Very high weight)
        const paymentFields = [
            'input[name*="card"]', 'input[name*="cvv"]', 'input[name*="cvc"]',
            'input[name*="expiry"]', 'input[name*="exp"]', 'input[name*="billing"]',
            'input[placeholder*="card number"]', 'input[placeholder*="cvv"]',
            'input[placeholder*="expiry"]', 'input[type="tel"][maxlength="19"]'
        ];

        const hasPaymentFields = paymentFields.some(selector => {
            try {
                return $(selector).length > 0;
            } catch (e) {
                return false;
            }
        });

        if (hasPaymentFields) {
            totalScore += 25;
            detectionDetails.hasPaymentFields = true;
        }

        // Subscription indicators (High weight)
        const subscriptionIndicators = [
            'monthly subscription', 'yearly subscription', 'recurring payment',
            'cancel subscription', 'manage subscription', 'billing cycle',
            'subscription plan', 'auto-renewal'
        ];

        const hasSubscription = subscriptionIndicators.some(indicator => 
            content.includes(indicator)
        );

        if (hasSubscription) {
            totalScore += 12;
            detectionDetails.hasSubscription = true;
        }

        // False positive reduction
        // Reduce score for news/blog indicators
        const newsIndicators = [
            'breaking news', 'latest news', 'news article', 'blog post',
            'published on', 'author:', 'journalist', 'reporter',
            'news category', 'read more', 'comments section'
        ];

        const hasNewsIndicators = newsIndicators.some(indicator => 
            content.includes(indicator)
        );

        if (hasNewsIndicators) {
            totalScore -= 15;
            detectionDetails.isNews = true;
        }

        // Reduce score for educational content
        const educationalIndicators = [
            'tutorial', 'lesson', 'course', 'learn', 'education',
            'student', 'teacher', 'university', 'college', 'academic'
        ];

        const hasEducationalIndicators = educationalIndicators.some(indicator => 
            content.includes(indicator)
        );

        if (hasEducationalIndicators) {
            totalScore -= 10;
            detectionDetails.isEducational = true;
        }

        // Ensure minimum score
        totalScore = Math.max(0, totalScore);

        // Calculate confidence
        const confidence = Math.min(totalScore / 100, 1);

        return {
            detected: totalScore >= 30, // Increased threshold for better accuracy
            score: totalScore,
            confidence: confidence,
            details: detectionDetails,
            processors: detectedProcessors,
            highValueKeywords: detectedHighValueKeywords,
            mediumValueKeywords: detectedMediumValueKeywords,
            lowValueKeywords: detectedLowValueKeywords
        };
    } catch (error) {
        return { detected: false, score: 0, confidence: 0 };
    }
}

// Utility functions
function getMainUrl(targetUrl) {
    try {
        const url = new URL(targetUrl);
        return url.hostname.replace(/^www\./, '');
    } catch (error) {
        return targetUrl;
    }
}

function shouldExcludeDomain(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        
        // Check blacklisted domains
        if (blacklistedDomains.has(hostname)) {
            return true;
        }
        
        // Check excluded domains
        const isExcluded = EXCLUDED_DOMAINS.some(domain => 
            hostname.includes(domain) || hostname.endsWith(domain)
        );
        
        return isExcluded;
    } catch (error) {
        return false;
    }
}

function calculateRelevanceScore(url, keyword, title = '', description = '', content = '') {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase();
        const search = urlObj.search.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        const keywordParts = keywordLower.split(/\s+/).filter(part => part.length > 2);

        let relevanceScore = 0;

        // Keyword part matching
        keywordParts.forEach(part => {
            if (hostname.includes(part)) relevanceScore += 6;
            if (path.includes(part)) relevanceScore += 4;
            if (search.includes(part)) relevanceScore += 3;
            if (title.toLowerCase().includes(part)) relevanceScore += 5;
            if (description.toLowerCase().includes(part)) relevanceScore += 3;
            if (content.toLowerCase().includes(part)) relevanceScore += 2;
        });

        // Full keyword matching
        if (hostname.includes(keywordLower)) relevanceScore += 8;
        if (title.toLowerCase().includes(keywordLower)) relevanceScore += 6;
        if (path.includes(keywordLower)) relevanceScore += 4;

        // Payment-related domain bonus
        const paymentDomains = ['pay', 'payment', 'checkout', 'billing', 'shop', 'store'];
        if (paymentDomains.some(domain => hostname.includes(domain))) {
            relevanceScore += 5;
        }

        return Math.min(relevanceScore, 30);
    } catch (error) {
        return 0;
    }
}

// Enhanced parallel search with better error handling
async function getUrlsParallel(keyword, numResults, socket) {
    socket.emit('search_status', { 
        message: `Starting ultra-parallel search for "${keyword}" across ${SEARCH_ENGINES.length} engines`,
        type: 'info'
    });

    const allUrls = new Set();
    const seenDomains = new Map();
    const engineResults = new Map();
    const engineErrors = new Map();

    return new Promise((resolve) => {
        const searchTasks = SEARCH_ENGINES.map(engine => ({
            fn: async () => {
                const engineUrls = [];
                let consecutiveFailures = 0;
                let totalRequests = 0;

                socket.emit('search_engine_start', { engine: engine.name });

                for (let page = 0; page < CONFIG.searchDepth && consecutiveFailures < 3; page++) {
                    try {
                        const searchUrl = engine.url(keyword, page);
                        const axiosInstance = createAxiosInstance({ 
                            headers: { ...engine.headers },
                            timeout: 15000
                        });

                        totalRequests++;
                        const response = await axiosInstance.get(searchUrl);

                        if (response.status !== 200) {
                            consecutiveFailures++;
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            continue;
                        }

                        const $ = cheerio.load(response.data);
                        const extractedLinks = engine.extractLinks($);

                        let pageResults = 0;
                        for (const link of extractedLinks) {
                            if (shouldExcludeDomain(link)) continue;

                            const domain = getMainUrl(link);
                            const domainCount = seenDomains.get(domain) || 0;
                            
                            // Skip if domain appears too frequently
                            if (domainCount >= 5) continue;

                            // Update domain repeat count
                            updateDomainRepeatCount(domain);

                            if (!allUrls.has(link)) {
                                allUrls.add(link);
                                engineUrls.push(link);
                                seenDomains.set(domain, domainCount + 1);
                                pageResults++;

                                socket.emit('url_found', { 
                                    url: link,
                                    engine: engine.name,
                                    domain: domain,
                                    total: allUrls.size,
                                    target: numResults,
                                    page: page + 1
                                });
                            }

                            if (allUrls.size >= numResults * 2) break;
                        }

                        if (pageResults === 0) {
                            consecutiveFailures++;
                        } else {
                            consecutiveFailures = 0;
                        }

                        // Progressive delay
                        const delay = 1000 + Math.random() * 2000 + (page * 500);
                        await new Promise(resolve => setTimeout(resolve, delay));

                    } catch (error) {
                        console.error(`Error with ${engine.name} page ${page}:`, error.message);
                        consecutiveFailures++;
                        engineErrors.set(engine.name, (engineErrors.get(engine.name) || 0) + 1);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }

                    if (allUrls.size >= numResults * 2) break;
                }

                engineResults.set(engine.name, {
                    results: engineUrls.length,
                    requests: totalRequests,
                    errors: engineErrors.get(engine.name) || 0
                });

                socket.emit('search_engine_complete', { 
                    engine: engine.name, 
                    results: engineUrls.length,
                    requests: totalRequests,
                    errors: engineErrors.get(engine.name) || 0
                });

                return engineUrls;
            }
        }));

        // Execute all search tasks
        let completedTasks = 0;
        searchTasks.forEach(task => {
            searchQueue.push(task, (err, result) => {
                if (err) console.error('Search task error:', err);
                completedTasks++;
                
                if (completedTasks === searchTasks.length) {
                    const finalUrls = Array.from(allUrls).slice(0, numResults);
                    
                    socket.emit('search_complete', { 
                        total: finalUrls.length,
                        engineResults: Object.fromEntries(engineResults),
                        uniqueDomains: seenDomains.size,
                        blacklistedDomains: blacklistedDomains.size,
                        message: `Ultra-search completed: ${finalUrls.length} URLs found from ${seenDomains.size} unique domains`
                    });
                    
                    resolve(finalUrls);
                }
            });
        });
    });
}

// Enhanced site analysis with caching
async function analyzeSite(targetUrl, keyword, socket, index, total) {
    const startTime = Date.now();
    
    try {
        // Check cache first
        const cachedResult = getCachedResult(targetUrl);
        if (cachedResult) {
            socket.emit('site_analyzed', { ...cachedResult, fromCache: true });
            return cachedResult;
        }

        socket.emit('analysis_progress', {
            current: index + 1,
            total: total,
            url: targetUrl,
            domain: getMainUrl(targetUrl),
            message: `Analyzing ${getMainUrl(targetUrl)}...`
        });

        const axiosInstance = createAxiosInstance({
            timeout: 18000,
            maxRedirects: 5
        });

        const response = await axiosInstance.get(targetUrl);
        const endTime = Date.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);

        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parallel analysis
        const [cloudflareAnalysis, captchaAnalysis, paymentAnalysis] = await Promise.all([
            checkCloudflare(targetUrl, response.data, response.headers),
            checkCaptcha(targetUrl, response.data),
            checkPaymentGateway(targetUrl, response.data)
        ]);

        const $ = cheerio.load(response.data);
        const pageTitle = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const bodyText = $('body').text().substring(0, 5000) || '';

        const relevanceScore = calculateRelevanceScore(
            targetUrl, keyword, pageTitle, metaDescription, bodyText
        );

        const serverTech = response.headers.server || 'Unknown';
        const contentType = response.headers['content-type'] || 'Unknown';
        const responseSize = response.headers['content-length'] || 'Unknown';

        const securityHeaders = {
            hsts: !!response.headers['strict-transport-security'],
            csp: !!response.headers['content-security-policy'],
            xframe: !!response.headers['x-frame-options'],
            xss: !!response.headers['x-xss-protection']
        };

        const result = {
            url: targetUrl,
            mainUrl: getMainUrl(targetUrl),
            timeElapsed: parseFloat(timeElapsed),
            status: response.status,
            statusText: response.statusText,
            title: pageTitle,
            description: metaDescription,
            server: serverTech,
            contentType: contentType,
            responseSize: responseSize,
            securityHeaders: securityHeaders,
            cloudflare: cloudflareAnalysis,
            captcha: captchaAnalysis,
            payment: paymentAnalysis,
            isClean: !cloudflareAnalysis.detected && !captchaAnalysis.detected,
            relevanceScore: relevanceScore,
            timestamp: new Date().toISOString(),
            category: categorizeWebsite($, bodyText.toLowerCase()),
            language: detectLanguage(pageTitle + ' ' + metaDescription),
            hasSSL: targetUrl.startsWith('https://'),
            redirectCount: response.request._redirectCount || 0,
            fromCache: false
        };

        // Cache the result
        setCachedResult(targetUrl, result);

        socket.emit('site_analyzed', result);
        return result;

    } catch (error) {
        const endTime = Date.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);

        const result = {
            url: targetUrl,
            mainUrl: getMainUrl(targetUrl),
            timeElapsed: parseFloat(timeElapsed),
            status: 'Error',
            statusText: error.message,
            error: error.message,
            cloudflare: { detected: false, confidence: 0 },
            captcha: { detected: false, confidence: 0 },
            payment: { detected: false, confidence: 0 },
            isClean: false,
            relevanceScore: 0,
            timestamp: new Date().toISOString(),
            category: 'unknown',
            hasSSL: targetUrl.startsWith('https://'),
            redirectCount: 0,
            fromCache: false
        };

        socket.emit('site_analyzed', result);
        return result;
    }
}

// Enhanced categorization
function categorizeWebsite($, content) {
    const categories = {
        ecommerce: ['shop', 'store', 'buy', 'cart', 'checkout', 'product', 'purchase', 'order'],
        payment: ['payment', 'billing', 'invoice', 'subscription', 'gateway', 'processor'],
        blog: ['blog', 'post', 'article', 'news', 'journal', 'diary', 'entry'],
        business: ['company', 'corporate', 'business', 'services', 'about us', 'contact'],
        portfolio: ['portfolio', 'gallery', 'work', 'projects', 'showcase'],
        forum: ['forum', 'discussion', 'community', 'board', 'thread'],
        educational: ['learn', 'course', 'education', 'tutorial', 'university', 'school'],
        social: ['social', 'network', 'connect', 'profile', 'friends', 'community'],
        news: ['news', 'breaking', 'latest', 'update', 'report', 'journalism'],
        government: ['government', 'official', 'public', 'municipal', 'federal', 'state']
    };

    const scores = {};
    
    for (const [category, keywords] of Object.entries(categories)) {
        scores[category] = keywords.reduce((score, keyword) => {
            const occurrences = (content.match(new RegExp(keyword, 'gi')) || []).length;
            return score + occurrences;
        }, 0);
    }

    const maxScore = Math.max(...Object.values(scores));
    const bestCategory = Object.keys(scores).find(key => scores[key] === maxScore);

    return maxScore > 0 ? bestCategory : 'general';
}

// Enhanced language detection
function detectLanguage(text) {
    const languages = {
        en: /\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|have|has|had)\b/gi,
        es: /\b(el|la|y|o|pero|en|con|por|para|de|que|es|son|era|fueron|tiene|ha|había)\b/gi,
        fr: /\b(le|la|et|ou|mais|dans|avec|par|pour|de|que|est|sont|était|ont|a|avait)\b/gi,
        de: /\b(der|die|das|und|oder|aber|in|mit|für|von|zu|ist|sind|war|haben|hat|hatte)\b/gi,
        it: /\b(il|la|e|o|ma|in|con|per|di|che|è|sono|era|hanno|ha|aveva)\b/gi,
        pt: /\b(o|a|e|ou|mas|em|com|por|para|de|que|é|são|era|têm|tem|tinha)\b/gi
    };

    let maxMatches = 0;
    let detectedLang = 'unknown';

    for (const [lang, pattern] of Object.entries(languages)) {
        const matches = (text.match(pattern) || []).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            detectedLang = lang;
        }
    }

    return detectedLang;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/results', (req, res) => {
    res.render('results');
});

app.get('/api/engines', (req, res) => {
    res.json(SEARCH_ENGINES.map(engine => ({
        name: engine.name,
        baseUrl: engine.baseUrl
    })));
});

app.get('/api/stats', (req, res) => {
    res.json({
        cacheSize: siteCache.size,
        blacklistedDomains: blacklistedDomains.size,
        domainRepeatCache: domainRepeatCache.size,
        searchEngines: SEARCH_ENGINES.length,
        config: CONFIG
    });
});

// Socket.IO connections
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('start_hunt', async (data) => {
        const { keyword, numResults } = data;
        
        try {
            socket.emit('hunt_started', { 
                keyword, 
                numResults,
                searchEngines: SEARCH_ENGINES.length,
                searchDepth: CONFIG.searchDepth,
                message: `Ragnarok Hunt Ultra initiated - Searching across ${SEARCH_ENGINES.length} engines with ${CONFIG.searchDepth} pages depth...`
            });

            const urls = await getUrlsParallel(keyword, parseInt(numResults), socket);

            if (urls.length === 0) {
                socket.emit('hunt_error', { error: 'No URLs found with any search engine' });
                return;
            }

            // Parallel site analysis
            const results = [];
            let completedAnalysis = 0;

            const analysisTasks = urls.map((url, index) => ({
                fn: async () => {
                    const result = await analyzeSite(url, keyword, socket, index, urls.length);
                    results.push(result);
                    completedAnalysis++;
                    
                    if (completedAnalysis === urls.length) {
                        // Sort by payment confidence and relevance
                        results.sort((a, b) => {
                            const aScore = (a.payment?.confidence || 0) * 10 + a.relevanceScore;
                            const bScore = (b.payment?.confidence || 0) * 10 + b.relevanceScore;
                            return bScore - aScore;
                        });

                        const summary = {
                            total: results.length,
                            clean: results.filter(r => r.isClean).length,
                            cloudflare: results.filter(r => r.cloudflare?.detected).length,
                            captcha: results.filter(r => r.captcha?.detected).length,
                            payment: results.filter(r => r.payment?.detected).length,
                            highRelevance: results.filter(r => r.relevanceScore >= 15).length,
                            highPaymentConfidence: results.filter(r => r.payment?.confidence >= 0.7).length,
                            averageTime: results.reduce((sum, r) => sum + r.timeElapsed, 0) / results.length,
                            categories: getCategorySummary(results),
                            avgRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length,
                            avgPaymentConfidence: results.reduce((sum, r) => sum + (r.payment?.confidence || 0), 0) / results.length,
                            fromCache: results.filter(r => r.fromCache).length,
                            uniqueDomains: new Set(results.map(r => r.mainUrl)).size
                        };

                        socket.emit('hunt_complete', { results, summary });
                    }

                    return result;
                }
            }));

            // Add analysis tasks to queue
            analysisTasks.forEach(task => {
                analysisQueue.push(task, (err, result) => {
                    if (err) console.error('Analysis task error:', err);
                });
            });

        } catch (error) {
            console.error('Hunt error:', error);
            socket.emit('hunt_error', { error: error.message });
        }
    });

    socket.on('clear_cache', () => {
        siteCache.clear();
        domainRepeatCache.clear();
        blacklistedDomains.clear();
        socket.emit('cache_cleared', { message: 'Cache cleared successfully' });
    });

    socket.on('disconnect', () => {
        console.log(`Disconnection: ${socket.id}`);
    });
});

function getCategorySummary(results) {
    const categories = {};
    results.forEach(result => {
        const cat = result.category || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    return categories;
}

// Cleanup function
function cleanup() {
    console.log('Performing cleanup...');
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of siteCache.entries()) {
        if (now - value.timestamp > CONFIG.cacheExpiry) {
            siteCache.delete(key);
        }
    }
    
    // Reset domain repeat cache if too large
    if (domainRepeatCache.size > 1000) {
        domainRepeatCache.clear();
    }
    
    console.log(`Cache size: ${siteCache.size}, Blacklisted domains: ${blacklistedDomains.size}`);
}

// Periodic cleanup
setInterval(cleanup, 60 * 60 * 1000); // Every hour

// Start server
server.listen(CONFIG.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           RAGNAROK HUNT ULTRA v${CONFIG.version}                           ║
║                      Enhanced Multi-Engine Payment Gateway Hunter                ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${CONFIG.port}                                        ║
║  Search engines: ${SEARCH_ENGINES.length}                                                        ║
║  Search depth: ${CONFIG.searchDepth} pages per engine                                     ║
║  Concurrent searches: ${CONFIG.maxConcurrentSearches}                                                 ║
║  Concurrent analysis: ${CONFIG.maxConcurrentAnalysis}                                                 ║
║  Cache enabled: ${CONFIG.maxCacheSize} entries                                            ║
║  Ultra-enhanced detection: ACTIVE                                                ║
║  False positive reduction: ACTIVE                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

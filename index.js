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
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MILITARY-GRADE CONFIGURATION
const CONFIG = {
    name: 'Ragnarok Hunt Military',
    version: '4.0.0-CLASSIFIED',
    port: process.env.PORT || 3000,
    timeout: 25000,
    maxRetries: 7,
    delayBetweenRequests: 500, // Increased speed
    maxConcurrentSearches: 25, // Military-grade concurrency
    maxConcurrentAnalysis: 15,
    searchDepth: 20, // Deep military reconnaissance
    cacheExpiry: 12 * 60 * 60 * 1000, //',
    'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'netflix.com',
    'yahoo.com', 'bing.com', 'microsoft.com', 'apple.com', 'baidu.com',
    'qq.com', 'pinterest.com', 'tiktok.com', 'ebay.com', 'twitch.tv',
    'adobe.com', 'live.com', 'zoom.us', 'office.com', 'github.com',
    'whatsapp.com', 'wordpress.com', 'cloudflare.com', 'blogspot.com', 'tumblr.com',
    
    // News & media conglomerates
    'cnn.com', 'bbc.com', 'reuters.com', 'ap.org', 'nytimes.com',
    'washingtonpost.com', 'theguardian.com', 'wsj.com', 'bloomberg.com',
    'forbes.com', 'techcrunch.com', 'wired.com', 'engadget.com',
    'mashable.com', 'buzzfeed.com', 'huffpost.com', 'vox.com',
    'slate.com', 'npr.org', 'pbs.org', 'cbsnews.com', 'abcnews.go.com',
    'nbcnews.com', 'foxnews.com', 'usatoday.com', 'latimes.com',
    'dailymail.co.uk', 'thesun.co.uk', 'mirror.co.uk', 'express.co.uk',
    
    // Educational institutions
    'coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org',
    'mit.edu', 'harvard.edu', 'stanford.edu', 'berkeley.edu',
    'oxford.ac.uk', 'cambridge.ac.uk', 'caltech.edu', 'yale.edu',
    
    // Government & military (ironically)
    '.gov', '.edu', '.mil', '.int', 'whitehouse.gov', 'pentagon.mil',
    
    // File sharing & cloud storage
    'dropbox.com', 'drive.google.com', 'onedrive.com', 'icloud.com',
    'mega.nz', 'mediafire.com', 'rapidshare.com', 'scribd.com',
    
    // Forums & Q&A platforms
    'stackoverflow.com', 'stackexchange.com', 'quora.com',
    'discord.com', 'slack.com', 'telegram.org', '4chan.org',
    
    // Streaming & entertainment
    'spotify.com', 'soundcloud.com', 'pandora.com', 'hulu.com',
    'disneyplus.com', 'hbo.com', 'paramount.com', 'peacocktv.com',
    
    // Travel & hospitality
    'tripadvisor.com', 'booking.com', 'expedia.com', 'hotels.com',
    'airbnb.com', 'kayak.com', 'priceline.com', 'yelp.com',
    
    // Job & career sites
    'indeed.com', 'glassdoor.com', 'monster.com', 'careerbuilder.com',
    'ziprecruiter.com', 'simplyhired.com', 'jobs.com', 'workday.com',
    
    // Dating & social
    'tinder.com', 'bumble.com', 'match.com', 'eharmony.com',
    'okcupid.com', 'pof.com', 'badoo.com', 'zoosk.com'
];

// MILITARY-GRADE PAYMENT DETECTION PATTERNS
const PAYMENT_PATTERNS = {
    processors: [
        // Tier 1 - Major processors
        'stripe', 'paypal', 'square', 'braintree', 'authorize.net', 'worldpay',
        'adyen', 'klarna', 'razorpay', 'mercadopago', 'payu', 'mollie',
        'checkout.com', 'coinbase', 'bitpay', 'payoneer', 'skrill', 'wise',
        
        // Tier 2 - E-commerce platforms
        'shopify', 'woocommerce', 'magento', 'prestashop', 'opencart',
        'bigcommerce', 'volusion', 'squarespace', 'wix', 'weebly',
        'shopware', 'oxid', 'zen-cart', 'oscommerce', 'ubercart',
        
        // Tier 3 - Regional & specialized
        'alipay', 'wechatpay', 'unionpay', 'paytm', 'phonepe', 'gpay',
        'apple-pay', 'google-pay', 'samsung-pay', 'venmo', 'zelle',
        'interac', 'ideal', 'sofort', 'giropay', 'bancontact',
        'eps', 'p24', 'multibanco', 'mybank', 'blik', 'trustly',
        
        // Tier 4 - Crypto & alternative
        'coingate', 'coinpayments', 'bitpay', 'coinbase-commerce',
        'nowpayments', 'cryptomus', 'plisio', 'coinremitter',
        'btcpay', 'opennode', 'lightning', 'blockonomics',
        
        // Tier 5 - Subscription & billing
        'recurly', 'chargebee', 'zuora', 'paddle', 'fastspring',
        'gumroad', 'sellfy', 'payhip', 'lemonsqueezy', 'chargify'
    ],
    
    militaryKeywords: [
        // Ultra-high value indicators
        'payment gateway integration', 'secure payment processing', 'ssl encrypted payments',
        'pci compliant payment', 'merchant services api', 'payment processor sdk',
        'checkout api integration', 'payment form validation', 'tokenized payments',
        'recurring billing system', 'subscription management', 'payment orchestration'
    ],
    
    highValueKeywords: [
        'payment gateway', 'secure checkout', 'ssl payment', 'encrypted payment',
        'merchant account', 'payment processor', 'credit card processing',
        'online payments', 'accept payments', 'payment solution',
        'checkout process', 'payment integration', 'payment api',
        'recurring billing', 'subscription billing', 'payment forms'
    ],
    
    advancedSelectors: [
        // Military-grade selectors
        'form[action*="payment"]', 'form[action*="checkout"]', 'form[action*="billing"]',
        'form[action*="subscribe"]', 'form[action*="purchase"]', 'form[action*="order"]',
        'form[data-stripe-key]', 'form[data-paypal-client-id]', 'form[data-square-application-id]',
        
        // Advanced payment containers
        '.payment-form', '.checkout-form', '.billing-form', '.subscription-form',
        '.payment-container', '.checkout-container', '.billing-container',
        '.stripe-payment', '.paypal-checkout', '.square-payment-form',
        
        // Credit card inputs (military precision)
        'input[name*="card"]', 'input[placeholder*="card number"]', 'input[autocomplete="cc-number"]',
        'input[name*="cvv"]', 'input[name*="cvc"]', 'input[autocomplete="cc-csc"]',
        'input[name*="expiry"]', 'input[autocomplete="cc-exp"]', 'input[autocomplete="cc-exp-month"]',
        
        // Payment buttons & elements
        '.stripe-button', '.paypal-button', '.apple-pay-button', '.google-pay-button',
        '[data-stripe]', '[data-paypal]', '[data-square]', '[data-checkout]',
        '.buy-now', '.add-to-cart', '.checkout-btn', '.payment-btn'
    ]
};

// 40+ MILITARY-GRADE SEARCH ENGINES
const SEARCH_ENGINES = [
    // Tier 1 - Major search engines with advanced operators
    {
        name: 'Google',
        baseUrl: 'https://www.google.com/',
        url: (keyword, page, operators = {}) => {
            let query = keyword;
            if (operators.inurl) query += ` inurl:${operators.inurl}`;
            if (operators.intext) query += ` intext:"${operators.intext}"`;
            if (operators.intitle) query += ` intitle:"${operators.intitle}"`;
            if (operators.site) query += ` site:${operators.site}`;
            if (operators.filetype) query += ` filetype:${operators.filetype}`;
            if (operators.exact) query = `"${keyword}"`;
            return `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${page * 10}&num=20&filter=0`;
        },
        headers: { 
            'Referer': 'https://www.google.com/',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        extractLinks: ($) => {
            const links = [];
            $('a[href*="/url?q="]').each((i, element) => {
                const href = $(element).attr('href');
                if (href) {
                    const match = href.match(/\/url\?q=([^&]+)/);
                    if (match) {
                        try {
                            const url = decodeURIComponent(match[1]);
                            if (url.startsWith('http') && !url.includes('google.com')) {
                                links.push(url);
                            }
                        } catch (e) {}
                    }
                }
            });
            // Alternative selector for direct links
            $('a[href^="http"]:not([href*="google.com"])').each((i, element) => {
                const href = $(element).attr('href');
                if (href && !links.includes(href)) {
                    links.push(href);
                }
            });
            return links;
        },
        military: true,
        priority: 1
    },
    
    {
        name: 'Bing',
        baseUrl: 'https://www.bing.com/',
        url: (keyword, page, operators = {}) => {
            let query = keyword;
            if (operators.inurl) query += ` inurl:${operators.inurl}`;
            if (operators.intext) query += ` "${operators.intext}"`;
            if (operators.site) query += ` site:${operators.site}`;
            return `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${page * 10 + 1}&count=20`;
        },
        headers: { 'Referer': 'https://www.bing.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.b_algo h2 a, .b_title a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('bing.com')) {
                    links.push(href);
                }
            });
            return links;
        },
        military: true,
        priority: 2
    },

    {
        name: 'DuckDuckGo',
        baseUrl: 'https://html.duckduckgo.com/',
        url: (keyword, page, operators = {}) => {
            let query = keyword;
            if (operators.site) query += ` site:${operators.site}`;
            if (operators.inurl) query += ` inurl:${operators.inurl}`;
            return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${page * 30}`;
        },
        headers: { 'Referer': 'https://duckduckgo.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result__url, .result__a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && !href.includes('duckduckgo.com')) {
                    try {
                        const fullUrl = href.startsWith('http') ? href : 'https://' + href.replace(/^\/\//, '');
                        if (fullUrl.startsWith('http')) links.push(fullUrl);
                    } catch (e) {}
                }
            });
            return links;
        },
        military: true,
        priority: 3
    },

    {
        name: 'Yandex',
        baseUrl: 'https://yandex.com/',
        url: (keyword, page) => `https://yandex.com/search/?text=${encodeURIComponent(keyword)}&p=${page}&lr=213`,
        headers: { 'Referer': 'https://yandex.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.serp-item .organic__url a, .Path-Item').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('yandex.')) {
                    links.push(href);
                }
            });
            return links;
        },
        military: true,
        priority: 4
    },

    {
        name: 'Baidu',
        baseUrl: 'https://www.baidu.com/',
        url: (keyword, page) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}&pn=${page * 10}&rn=20`,
        headers: { 'Referer': 'https://www.baidu.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.c-container h3 a, .result a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('baidu.com')) {
                    links.push(href);
                }
            });
            return links;
        },
        military: true,
        priority: 5
    },

    // Tier 2 - Privacy-focused engines
    {
        name: 'Startpage',
        baseUrl: 'https://www.startpage.com/',
        url: (keyword, page) => `https://www.startpage.com/sp/search?q=${encodeURIComponent(keyword)}&page=${page + 1}&prfh=disable_family_filterEEE1N1Ndisable_video_family_filterEEE1N1N`,
        headers: { 'Referer': 'https://www.startpage.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.w-gl__result-url, .result-link').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && href.startsWith('http') && !href.includes('startpage.com')) {
                    links.push(href);
                }
            });
            return links;
        },
        priority: 6
    },

    {
        name: 'Searx',
        baseUrl: 'https://searx.org/',
        url: (keyword, page) => `https://searx.org/search?q=${encodeURIComponent(keyword)}&pageno=${page + 1}&categories=general`,
        headers: { 'Referer': 'https://searx.org/' },
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('searx.')) {
                    links.push(href);
                }
            });
            return links;
        },
        priority: 7
    },

    {
        name: 'Brave Search',
        baseUrl: 'https://search.brave.com/',
        url: (keyword, page) => `https://search.brave.com/search?q=${encodeURIComponent(keyword)}&offset=${page * 20}&source=web`,
        headers: { 'Referer': 'https://search.brave.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.snippet-url, .result-header a').each((i, element) => {
                const href = $(element).attr('href') || $(element).text().trim();
                if (href && !href.includes('brave.com')) {
                    try {
                        const fullUrl = href.startsWith('http') ? href : 'https://' + href;
                        if (fullUrl.startsWith('http')) links.push(fullUrl);
                    } catchresult h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('gibiru.com')) {
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
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
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
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
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
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('lukol.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // Advanced specialized engines
    {
        name: 'Yippy',
        baseUrl: 'https://yippy.com/',
        url: (keyword, page) => `https://yippy.com/search?query=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('yippy.com')) {
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
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('disconnect.me')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // Regional powerhouses
    {
        name: 'Fireball',
        baseUrl: 'https://fireball.de/',
        url: (keyword, page) => `https://fireball.de/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('fireball.de')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Searchalot',
        baseUrl: 'https://www.searchalot.com/',
        url: (keyword, page) => `https://www.searchalot.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('searchalot.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // More international engines
    {
        name: 'Excite',
        baseUrl: 'https://www.excite.com/',
        url: (keyword, page) => `https://www.excite.com/search/web?q=${encodeURIComponent(keyword)}&start=${page * 10}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('excite.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Infospace',
        baseUrl: 'https://www.infospace.com/',
        url: (keyword, page) => `https://www.infospace.com/search/web?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('infospace.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // Academic and specialized
    {
        name: 'Wolfram Alpha',
        baseUrl: 'https://www.wolframalpha.com/',
        url: (keyword, page) => `https://www.wolframalpha.com/input/?i=${encodeURIComponent(keyword)}`,
        extractLinks: ($) => {
            const links = [];
            $('a[href^="http"]:not([href*="wolfram"])').each((i, element) => {
                const href = $(element).attr('href');
                if (href) links.push(href);
            });
            return links;
        }
    },

    // Specialized tech engines
    {
        name: 'Wiby',
        baseUrl: 'https://wiby.me/',
        url: (keyword, page) => `https://wiby.me/?q=${encodeURIComponent(keyword)}`,
        extractLinks: ($) => {
            const links = [];
            $('.result a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('wiby.me')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // More privacy engines
    {
        name: 'Privatelee',
        baseUrl: 'https://privatelee.com/',
        url: (keyword, page) => `https://privatelee.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('privatelee.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // Additional international coverage
    {
        name: 'Goo',
        baseUrl: 'https://search.goo.ne.jp/',
        url: (keyword, page) => `https://search.goo.ne.jp/web.jsp?MT=${encodeURIComponent(keyword)}&from=${page * 10}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('goo.ne.jp')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Searchencrypt',
        baseUrl: 'https://www.searchencrypt.com/',
        url: (keyword, page) => `https://www.searchencrypt.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('searchencrypt.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // More specialized engines to reach 40+
    {
        name: 'Entireweb',
        baseUrl: 'https://www.entireweb.com/',
        url: (keyword, page) => `https://www.entireweb.com/search?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('entireweb.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Gigablast',
        baseUrl: 'https://www.gigablast.com/',
        url: (keyword, page) => `https://www.gigablast.com/search?q=${encodeURIComponent(keyword)}&s=${page * 10}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('gigablast.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Exalead',
        baseUrl: 'https://www.exalead.com/',
        url: (keyword, page) => `https://www.exalead.com/search/web/results/?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('exalead.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    // Final engines to complete military arsenal
    {
        name: 'Dogpile',
        baseUrl: 'https://www.dogpile.com/',
        url: (keyword, page) => `https://www.dogpile.com/search/web?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.web-bing__result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('dogpile.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    },

    {
        name: 'Metacrawler',
        baseUrl: 'https://www.metacrawler.com/',
        url: (keyword, page) => `https://www.metacrawler.com/search/web?q=${encodeURIComponent(keyword)}&page=${page + 1}`,
        extractLinks: ($) => {
            const links = [];
            $('.web-bing__result h3 a').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http') && !href.includes('metacrawler.com')) {
                    links.push(href);
                }
            });
            return links;
        }
    }
];

// MILITARY-GRADE CONCURRENCY CONTROL
const searchQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentSearches);

const analysisQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentAnalysis);

// ADVANCED SEARCH OPERATORS SYSTEM
class AdvancedSearchOperators {
    static generateQueries(keyword, targetType = 'payment') {
        const operators = {
            payment: [
                { inurl: 'payment', intext: 'checkout' },
                { inurl: 'billing', intext: 'credit card' },
                { inurl: 'subscribe', intext: 'monthly' },
                { inurl: 'checkout', intext: 'secure payment' },
                { intext: 'stripe', inurl: 'payment' },
                { intext: 'paypal', inurl: 'checkout' },
                { intitle: 'payment gateway' },
                { intitle: 'secure checkout' },
                { site: '', intext: 'payment processor' },
                { filetype: 'html', intext: 'payment form' }
            ],
            ecommerce: [
                { inurl: 'shop', intext: 'add to cart' },
                { inurl: 'store', intext: 'buy now' },
                { inurl: 'cart', intext: 'checkout' },
                { intitle: 'online store' },
                { intext: 'shopping cart', inurl: 'products' }
            ]
        };
        
        return operators[targetType] || operators.payment;
    }
}

// MILITARY-GRADE IRRELEVANT SITE DETECTION
function isSiteIrrelevant(url, title = '', description = '', content = '') {
    const irrelevantIndicators = [
        // News & blog patterns
        /\b(news|breaking|latest|update|article|blog|post|journalist|reporter)\b/i,
        /\b(published|author|date|comments|share|like|tweet)\b/i,
        
        // Educational patterns
        /\b(university|college|school|student|teacher|course|lesson|tutorial)\b/i,
        /\b(academic|research|study|paper|thesis|dissertation)\b/i,
        
        // Government patterns
        /\b(government|official|public|federal|state|municipal|agency)\b/i,
        
        // Social media patterns
        /\b(social|network|profile|friend|follow|connect|share)\b/i,
        
        // Forum patterns
        /\b(forum|discussion|community|board|thread|reply|post)\b/i
    ];
    
    const combinedText = (url + ' ' + title + ' ' + description + ' ' + content).toLowerCase();
    
    // Check for multiple irrelevant indicators
    const matches = irrelevantIndicators.filter(pattern => pattern.test(combinedText)).length;
    
    return matches >= 2; // Military threshold
}

// ENHANCED CACHE SYSTEM
function getCacheKey(url) {
    return crypto.createHash('sha256').update(url).digest('hex');
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
        // Military-grade LRU eviction
        const oldestKey = siteCache.keys().next().value;
        siteCache.delete(oldestKey);
    }
    siteCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// MILITARY-GRADE AXIOS INSTANCE
function createMilitaryAxiosInstance(options = {}) {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    const config = {
        timeout: CONFIG.timeout,
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
            maxSockets: CONFIG.maxConcurrentSearches,
            timeout: CONFIG.timeout
        }),
        validateStatus: () => true,
        maxRedirects: 7,
        headers: {
            'User-Agent': userAgent.toString(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,de;q=0.6,ja;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        },
        ...options
    };
    return axios.create(config);
}

// ULTRA-ENHANCED PAYMENT DETECTION (MILITARY AI)
async function militaryPaymentDetection(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();
        const url = targetUrl.toLowerCase();

        let militaryScore = 0;
        let confidence = 0;
        let detectionDetails = {
            militaryClassification: 'UNKNOWN',
            threatLevel: 0,
            paymentInfrastructure: [],
            securityMeasures: [],
            ecommerceIndicators: []
        };

        // TIER 1: MILITARY-GRADE PAYMENT PROCESSOR DETECTION
        const detectedProcessors = PAYMENT_PATTERNS.processors.filter(processor => {
            const variations = [
                processor,
                processor.replace('-', ''),
                processor.replace('_', ''),
                processor + '.js',
                processor + '.com'
            ];
            
            return variations.some(variant => 
                content.includes(variant) ||
                $(`script[src*="${variant}"]`).length > 0 ||
                $(`[class*="${variant}"]`).length > 0 ||
                $(`[id*="${variant}"]`).length > 0 ||
                $(`[data-${variant}]`).length > 0
            );
        });

        if (detectedProcessors.length > 0) {
            militaryScore += detectedProcessors.length * 20;
            detectionDetails.paymentInfrastructure = detectedProcessors;
            detectionDetails.militaryClassification = 'PAYMENT_PROCESSOR_DETECTED';
        }

        // TIER 2: ADVANCED PAYMENT FORM ANALYSIS
        const militarySelectors = [
            // Credit card inputs with military precision
            'input[autocomplete="cc-number"]',
            'input[autocomplete="cc-exp"]',
            'input[autocomplete="cc-csc"]',
            'input[autocomplete="cc-name"]',
            'input[data-stripe="number"]',
            'input[data-paypal="true"]',
            'input[pattern*="[0-9]"][maxlength="19"]', // Credit card pattern
            
            // Payment forms
            'form[action*="payment"]',
            'form[action*="checkout"]',
            'form[action*="billing"]',
            'form[data-stripe-key]',
            'form[data-paypal-client-id]',
            
            // Advanced payment containers
            '.stripe-element',
            '.paypal-button-container',
            '.square-payment-form',
            '.payment-request-button'
        ];

        const paymentFormScore = militarySelectors.reduce((score, selector) => {
            try {
                const elements = $(selector);
                if (elements.length > 0) {
                    return score + (elements.length * 5);
                }
                return score;
            } catch (e) {
                return score;
            }
        }, 0);

        militaryScore += Math.min(paymentFormScore, 50);

        // TIER 3: MILITARY KEYWORD ANALYSIS
        const militaryKeywordAnalysis = PAYMENT_PATTERNS.militaryKeywords.reduce((score, keyword) => {
            const occurrences = (content.match(new RegExp(keyword.replace(/\s+/g, '\\s+'), 'gi')) || []).length;
            return score + (occurrences * 15);
        }, 0);

        militaryScore += Math.min(militaryKeywordAnalysis, 75);

        // TIER 4: URL INTELLIGENCE ANALYSIS
        const paymentUrlPatterns = [
            /\/payment\//i, /\/checkout\//i, /\/billing\//i, /\/subscribe\//i,
            /\/cart\//i, /\/order\//i, /\/buy\//i, /\/purchase\//i,
            /payment\./, /checkout\./, /billing\./, /shop\./
        ];

        const urlIntelligence = paymentUrlPatterns.reduce((score, pattern) => {
            return score + (pattern.test(url) ? 10 : 0);
        }, 0);

        militaryScore += urlIntelligence;

        // TIER 5: SECURITY INFRASTRUCTURE ANALYSIS
        const securityIndicators = [
            'ssl', 'https', 'secure', 'encrypted', 'pci compliant',
            'security', 'protected', 'verified', 'trusted'
        ];

        const securityScore = securityIndicators.reduce((score, indicator) => {
            return score + (content.includes(indicator) ? 3 : 0);
        }, 0);

        militaryScore += securityScore;
        detectionDetails.securityMeasures = securityIndicators.filter(ind => content.includes(ind));

        // TIER 6: E-COMMERCE INFRASTRUCTURE
        const ecommercePatterns = [
            'add to cart', 'shopping cart', 'buy now', 'add to basket',
            'proceed to checkout', 'complete order', 'place order',
            'quantity', 'price', 'total', 'subtotal', 'shipping'
        ];

        const ecommerceScore = ecommercePatterns.reduce((score, pattern) => {
            return score + (content.includes(pattern) ? 4 : 0);
        }, 0);

        militaryScore += Math.min(ecommerceScore, 40);
        detectionDetails.ecommerceIndicators = ecommercePatterns.filter(p => content.includes(p));

        // MILITARY FALSE POSITIVE REDUCTION
        const falsePositiveIndicators = [
            'news', 'article', 'blog', 'post', 'published', 'author',
            'tutorial', 'course', 'lesson', 'education', 'university',
            'government', 'official', 'public', 'academic', 'research'
        ];

        const falsePositiveScore = falsePositiveIndicators.reduce((score, indicator) => {
            const occurrences = (content.match(new RegExp(indicator, 'gi')) || []).length;
            return score + (occurrences * 3);
        }, 0);

        militaryScore = Math.max(0, militaryScore - falsePositiveScore);

        // MILITARY CLASSIFICATION SYSTEM
        confidence = Math.min(militaryScore / 150, 1);
        
        if (militaryScore >= 100) {
            detectionDetails.militaryClassification = 'HIGH_VALUE_TARGET';
            detectionDetails.threatLevel = 5;
        } else if (militaryScore >= 70) {
            detectionDetails.militaryClassification = 'CONFIRMED_PAYMENT_GATEWAY';
            detectionDetails.threatLevel = 4;
        } else if (militaryScore >= 50) {
            detectionDetails.militaryClassification = 'PROBABLE_PAYMENT_SYSTEM';
            detectionDetails.threatLevel = 3;
        } else if (militaryScore >= 30) {
            detectionDetails.militaryClassification = 'POSSIBLE_PAYMENT_FEATURE';
            detectionDetails.threatLevel = 2;
        } else {
            detectionDetails.militaryClassification = 'NON_PAYMENT_TARGET';
            detectionDetails.threatLevel = 1;
        }

        return {
            detected: militaryScore >= 50,
            score: militaryScore,
            confidence: confidence,
            details: detectionDetails,
            processors: detectedProcessors,
            militaryGrade: true
        };

    } catch (error) {
        return { 
            detected: false, 
            score: 0, 
            confidence: 0,
            militaryGrade: true,
            error: error.message
        };
    }
}

// ENHANCED PARALLEL SEARCH WITH MILITARY OPERATORS
async function militaryParallelSearch(keyword, numResults, socket, operators = {}) {
    socket.emit('search_status', { 
        message: `🎯 INITIATING MILITARY-GRADE SEARCH: ${SEARCH_ENGINES.length} engines deploying`,
        type: 'military'
    });

    const allUrls = new Set();
    const seenDomains = new Map();
    const engineResults = new Map();
    const militaryIntel = new Map();

    // Generate advanced search queries
    const searchQueries = AdvancedSearchOperators.generateQueries(keyword);

    return new Promise((resolve) => {
        const searchTasks = [];

        // Primary search with original keyword
        SEARCH_ENGINES.forEach(engine => {
            searchTasks.push({
                fn: async () => {
                    return await executeMilitarySearch(engine, keyword, operators, socket, allUrls, seenDomains, engineResults, numResults);
                }
            });
        });

        // Advanced operator searches (military intelligence)
        if (CONFIG.advancedOperators) {
            searchQueries.slice(0, 5).forEach((queryOps, index) => {
                SEARCH_ENGINES.slice(0, 10).forEach(engine => { // Use top 10 engines for advanced queries
                    searchTasks.push({
                        fn: async () => {
                            return await executeMilitarySearch(engine, keyword, queryOps, socket, allUrls, seenDomains, engineResults, numResults, `ADV-${index}`);
                        }
                    });
                });
            });
        }

        let completedTasks = 0;
        const totalTasks = searchTasks.length;

        searchTasks.forEach(task => {
            searchQueue.push(task, (err, result) => {
                if (err) console.error('Military search task error:', err);
                completedTasks++;
                
                socket.emit('military_progress', {
                    completed: completedTasks,
                    total: totalTasks,
                    found: allUrls.size
                });
                
                if (completedTasks === totalTasks) {
                    const finalUrls = Array.from(allUrls).slice(0, numResults);
                    
                    socket.emit('search_complete', { 
                        total: finalUrls.length,
                        engineResults: Object.fromEntries(engineResults),
                        uniqueDomains: seenDomains.size,
                        militaryIntel: Object.fromEntries(militaryIntel),
                        message: `🎯 MILITARY OPERATION COMPLETE: ${finalUrls.length} targets acquired`
                    });
                    
                    resolve(finalUrls);
                }
            });
        });
    });
}

// EXECUTE MILITARY SEARCH OPERATION
async function executeMilitarySearch(engine, keyword, operators, socket, allUrls, seenDomains, engineResults, numResults, prefix = '') {
    const engineUrls = [];
    let consecutiveFailures = 0;
    let totalRequests = 0;

    socket.emit('search_engine_start', { 
        engine: `${prefix}${engine.name}`,
        military: true 
    });

    for (let page = 0; page < CONFIG.searchDepth && consecutiveFailures < 2; page++) {
        try {
            const searchUrl = engine.url(keyword, page, operators);
            const axiosInstance = createMilitaryAxiosInstance({ 
                headers: { ...engine.headers },
                timeout: 20000
            });

            totalRequests++;
            const response = await axiosInstance.get(searchUrl);

            if (response.status !== 200) {
                consecutiveFailures++;
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }

            const $ = cheerio.load(response.data);
            const extractedLinks = engine.extractLinks($);

            let pageResults = 0;
            for (const link of extractedLinks) {
                if (shouldExcludeDomain(link)) continue;

                const domain = getMainUrl(link);
                const domainCount = seenDomains.get(domain) || 0;
                
                if (domainCount >= 3) continue; // Military efficiency

                if (!allUrls.has(link)) {
                    allUrls.add(link);
                    engineUrls.push(link);
                    seenDomains.set(domain, domainCount + 1);
                    pageResults++;

                    socket.emit('url_found', { 
                        url: link,
                        engine: `${prefix}${engine.name}`,
                        domain: domain,
                        total: allUrls.size,
                        target: numResults,
                        page: page + 1,
                        military: true
                    });
                }

                if (allUrls.size >= numResults * 1.5) break;
            }

            if (pageResults === 0) {
                consecutiveFailures++;
            } else {
                consecutiveFailures = 0;
            }

            // Military-grade progressive delay
            const delay = CONFIG.delayBetweenRequests + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            console.error(`Military error with ${engine.name} page ${page}:`, error.message);
            consecutiveFailures++;
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (allUrls.size >= numResults * 1.5) break;
    }

    engineResults.set(`${prefix}${engine.name}`, {
        results: engineUrls.length,
        requests: totalRequests,
        military: true
    });

    socket.emit('search_engine_complete', { 
        engine: `${prefix}${engine.name}`,
        results: engineUrls.length,
        requests: totalRequests,
        military: true
    });

    return engineUrls;
}

// MILITARY SITE ANALYSIS
async function militarySiteAnalysis(targetUrl, keyword, socket, index, total) {
    const startTime = Date.now();
    
    try {
        const cachedResult = getCachedResult(targetUrl);
        if (cachedResult) {
            socket.emit('site_analyzed', { 
                ...cachedResult, 
                fromCache: true,
                military: true 
            });
            return cachedResult;
        }

        socket.emit('analysis_progress', {
            current: index + 1,
            total: total,
            url: targetUrl,
            domain: getMainUrl(targetUrl),
            message: `🎯 ANALYZING TARGET: ${getMainUrl(targetUrl)}`,
            military: true
        });

        const axiosInstance = createMilitaryAxiosInstance({
            timeout: 22000,
            maxRedirects: 8
        });

        const response = await axiosInstance.get(targetUrl);
        const endTime = Date.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);

        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // MILITARY PARALLEL ANALYSIS
        const [cloudflareAnalysis, captchaAnalysis, paymentAnalysis] = await Promise.all([
            checkCloudflare(targetUrl, response.data, response.headers),
            checkCaptcha(targetUrl, response.data),
            militaryPaymentDetection(targetUrl, response.data)
        ]);

        const $ = cheerio.load(response.data);
        const pageTitle = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const bodyText = $('body').text().substring(0, 8000) || '';

        // Check if site is irrelevant using military AI
        const isIrrelevant = isSiteIrrelevant(targetUrl, pageTitle, metaDescription, bodyText);

        const relevanceScore = calculateRelevanceScore(
            targetUrl, keyword, pageTitle, metaDescription, bodyText
        );

        const result = {
            url: targetUrl,
            mainUrl: getMainUrl(targetUrl),
            timeElapsed: parseFloat(timeElapsed),
            status: response.status,
            statusText: response.statusText,
            title: pageTitle,
            description: metaDescription,
            server: response.headers.server || 'Unknown',
            contentType: response.headers['content-type'] || 'Unknown',
            responseSize: response.headers['content-length'] || 'Unknown',
            cloudflare: cloudflareAnalysis,
            captcha: captchaAnalysis,
            payment: paymentAnalysis,
            isClean: !cloudflareAnalysis.detected && !captchaAnalysis.detected,
            isIrrelevant: isIrrelevant,
            relevanceScore: relevanceScore,
            timestamp: new Date().toISOString(),
            category: categorizeWebsite($, bodyText.toLowerCase()),
            language: detectLanguage(pageTitle + ' ' + metaDescription),
            hasSSL: targetUrl.startsWith('https://'),
            redirectCount: response.request._redirectCount || 0,
            fromCache: false,
            militaryGrade: true,
            threatLevel: paymentAnalysis.details?.threatLevel || 0,
            classification: paymentAnalysis.details?.militaryClassification || 'UNKNOWN'
        };

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
            isIrrelevant: true,
            relevanceScore: 0,
            timestamp: new Date().toISOString(),
            category: 'error',
            hasSSL: targetUrl.startsWith('https://'),
            redirectCount: 0,
            fromCache: false,
            militaryGrade: true,
            threatLevel: 0,
            classification: 'ERROR'
        };

        socket.emit('site_analyzed', result);
        return result;
    }
}

// UTILITY FUNCTIONS (Enhanced)
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
        
        if (blacklistedDomains.has(hostname)) return true;
        
        return EXCLUDED_DOMAINS.some(domain => 
            hostname.includes(domain) || hostname.endsWith(domain)
        );
    } catch (error) {
        return false;
    }
}

function calculateRelevanceScore(url, keyword, title = '', description = '', content = '') {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase();
        const keywordLower = keyword.toLowerCase();
        const keywordParts = keywordLower.split(/\s+/).filter(part => part.length > 2);

        let relevanceScore = 0;

        keywordParts.forEach(part => {
            if (hostname.includes(part)) relevanceScore += 8;
            if (path.includes(part)) relevanceScore += 6;
            if (title.toLowerCase().includes(part)) relevanceScore += 7;
            if (description.toLowerCase().includes(part)) relevanceScore += 4;
            if (content.toLowerCase().includes(part)) relevanceScore += 2;
        });

        if (hostname.includes(keywordLower)) relevanceScore += 10;
        if (title.toLowerCase().includes(keywordLower)) relevanceScore += 8;
        if (path.includes(keywordLower)) relevanceScore += 6;

        const paymentDomains = ['pay', 'payment', 'checkout', 'billing', 'shop', 'store', 'buy'];
        if (paymentDomains.some(domain => hostname.includes(domain))) {
            relevanceScore += 8;
        }

        return Math.min(relevanceScore, 50);
    } catch (error) {
        return 0;
    }
}

// Enhanced categorization and language detection
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

// Enhanced Cloudflare and CAPTCHA detection (keeping original functions but enhanced)
async function checkCloudflare(targetUrl, responseData, headers) {
    try {
        const cloudflareHeaders = [
            'cf-ray', 'cf-cache-status', 'cf-request-id', 'cf-visitor',
            'cf-connecting-ip', 'cf-ipcountry', 'cf-team', 'cf-polished',
            'cf-bgj', 'cf-edge-cache', 'cf-apo-via', 'cf-cache-status'
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
            confidence: Math.min(confidence, 1),
            militaryGrade: true
        };
    } catch (error) {
        return { detected: false, confidence: 0, militaryGrade: true };
    }
}

async function checkCaptcha(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();

        const captchaForms = [
            'form[action*="/captcha/"]', 'form[action*="/challenge/"]',
            'form[action*="/verify/"]', 'form[id*="captcha"]',
            'form[class*="captcha"]', 'form[action*="/human/"]',
            'form[action*="/robot/"]', 'form[action*="/security/"]'
        ];

        const hasCaptchaForm = captchaForms.some(selector => $(selector).length > 0);

        const captchaElements = [
            '.captcha', '#captcha', '.g-recaptcha', '.h-captcha',
            '.cf-captcha', '.recaptcha', '.hcaptcha', '.turnstile',
            '.funcaptcha', '.arkose', '.geetest', '.mtcaptcha',
            'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
            'iframe[src*="captcha"]', '[data-sitekey]', '[data-callback]',
            '.captcha-container', '.captcha-wrapper', '.verification-container'
        ];

        const hasCaptchaElements = captchaElements.some(selector => $(selector).length > 0);

        const captchaTexts = [
            'verify you are human', 'prove you are human', 'i am not a robot',
            'captcha', 'recaptcha', 'hcaptcha', 'security check',
            'anti-bot verification', 'human verification', 'please complete',
            'solve the challenge', 'verify your identity', 'are you human',
            'complete the verification', 'security verification',
            'anti-spam verification', 'robot check', 'bot detection'
        ];

        const hasCaptchaText = captchaTexts.some(text => content.includes(text));

        const captchaScripts = [
            'recaptcha', 'hcaptcha', 'captcha', 'cf-challenge',
            'turnstile', 'funcaptcha', 'arkose', 'geetest',
            'mtcaptcha', 'keycaptcha', 'solvemedia'
        ];

        const hasCaptchaScript = captchaScripts.some(script => 
            $(`script[src*="${script}"]`).length > 0 || content.includes(script)
        );

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
            confidence: Math.min(confidence, 1),
            militaryGrade: true
        };
    } catch (error) {
        return { detected: false, confidence: 0, militaryGrade: true };
    }
}

// ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/engines', (req, res) => {
    res.json({
        engines: SEARCH_ENGINES.map(engine => ({
            name: engine.name,
            baseUrl: engine.baseUrl,
            military: engine.military || false,
            priority: engine.priority || 999
        })),
        total: SEARCH_ENGINES.length,
        militaryGrade: true
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        cacheSize: siteCache.size,
        blacklistedDomains: blacklistedDomains.size,
        domainRepeatCache: domainRepeatCache.size,
        searchEngines: SEARCH_ENGINES.length,
        militaryEngines: SEARCH_ENGINES.filter(e => e.military).length,
        config: CONFIG,
        militaryGrade: true,
        classification: 'OPERATIONAL'
    });
});

// SOCKET.IO MILITARY OPERATIONS
io.on('connection', (socket) => {
    console.log(`🎯 MILITARY CONNECTION ESTABLISHED: ${socket.id}`);

    socket.on('start_hunt', async (data) => {
        const { keyword, numResults, operators = {} } = data;
        
        try {
            socket.emit('hunt_started', { 
                keyword, 
                numResults,
                searchEngines: SEARCH_ENGINES.length,
                searchDepth: CONFIG.searchDepth,
                militaryGrade: true,
                classification: 'OPERATION_INITIATED',
                message: `🎯 MILITARY OPERATION INITIATED: ${SEARCH_ENGINES.length} engines deploying with ${CONFIG.searchDepth} pages depth`
            });

            const urls = await militaryParallelSearch(keyword, parseInt(numResults), socket, operators);

            if (urls.length === 0) {
                socket.emit('hunt_error', { 
                    error: 'NO TARGETS ACQUIRED - All reconnaissance missions failed',
                    militaryGrade: true 
                });
                return;
            }

            // MILITARY ANALYSIS PHASE
            const results = [];
            let completedAnalysis = 0;

            const analysisTasks = urls.map((url, index) => ({
                fn: async () => {
                    const result = await militarySiteAnalysis(url, keyword, socket, index, urls.length);
                    results.push(result);
                    completedAnalysis++;
                    
                    if (completedAnalysis === urls.length) {
                        // Military sorting by threat level and confidence
                        results.sort((a, b) => {
                            const aScore = (a.payment?.confidence || 0) * 10 + 
                                          (a.threatLevel || 0) * 5 + 
                                          a.relevanceScore;
                            const bScore = (b.payment?.confidence || 0) * 10 + 
                                          (b.threatLevel || 0) * 5 + 
                                          b.relevanceScore;
                            return bScore - aScore;
                        });

                        const summary = {
                            total: results.length,
                            clean: results.filter(r => r.isClean).length,
                            cloudflare: results.filter(r => r.cloudflare?.detected).length,
                            captcha: results.filter(r => r.captcha?.detected).length,
                            payment: results.filter(r => r.payment?.detected).length,
                            highValueTargets: results.filter(r => r.threatLevel >= 4).length,
                            irrelevantSites: results.filter(r => r.isIrrelevant).length,
                            averageTime: results.reduce((sum, r) => sum + r.timeElapsed, 0) / results.length,
                            avgPaymentConfidence: results.reduce((sum, r) => sum + (r.payment?.confidence || 0), 0) / results.length,
                            fromCache: results.filter(r => r.fromCache).length,
                            uniqueDomains: new Set(results.map(r => r.mainUrl)).size,
                            militaryGrade: true,
                            classification: 'OPERATION_COMPLETE'
                        };

                        socket.emit('hunt_complete', { 
                            results, 
                            summary,
                            militaryGrade: true 
                        });
                    }

                    return result;
                }
            }));

            analysisTasks.forEach(task => {
                analysisQueue.push(task, (err, result) => {
                    if (err) console.error('Military analysis error:', err);
                });
            });

        } catch (error) {
            console.error('Military operation error:', error);
            socket.emit('hunt_error', { 
                error: `OPERATION FAILED: ${error.message}`,
                militaryGrade: true 
            });
        }
    });

    socket.on('clear_cache', () => {
        siteCache.clear();
        domainRepeatCache.clear();
        blacklistedDomains.clear();
        socket.emit('cache_cleared', { 
            message: '🎯 MILITARY CACHE PURGED - All intelligence data cleared',
            militaryGrade: true 
        });
    });

    socket.on('disconnect', () => {
        console.log(`🎯 MILITARY CONNECTION TERMINATED: ${socket.id}`);
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

// MILITARY CLEANUP OPERATIONS
function militaryCleanup() {
    console.log('🎯 EXECUTING MILITARY CLEANUP PROTOCOL...');
    
    const now = Date.now();
    let purged = 0;
    
    for (const [key, value] of siteCache.entries()) {
        if (now - value.timestamp > CONFIG.cacheExpiry) {
            siteCache.delete(key);
            purged++;
        }
    }
    
    if (domainRepeatCache.size > 5000) {
        domainRepeatCache.clear();
        console.log('🎯 DOMAIN INTELLIGENCE CACHE RESET');
    }
    
    console.log(`🎯 CLEANUP COMPLETE: ${purged} entries purged, Cache: ${siteCache.size}, Blacklisted: ${blacklistedDomains.size}`);
}

setInterval(militaryCleanup, 30 * 60 * 1000); // Every 30 minutes

// START MILITARY SERVER
server.listen(CONFIG.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                        🎯 RAGNAROK HUNT MILITARY v${CONFIG.version}                        ║
║                         CLASSIFIED PAYMENT GATEWAY HUNTER                        ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║  🎯 MILITARY SERVER OPERATIONAL: http://localhost:${CONFIG.port}                           ║
║  🎯 SEARCH ENGINES DEPLOYED: ${SEARCH_ENGINES.length} (Including Google)                          ║
║  🎯 SEARCH DEPTH: ${CONFIG.searchDepth} pages per engine (DEEP RECONNAISSANCE)               ║
║  🎯 CONCURRENT OPERATIONS: ${CONFIG.maxConcurrentSearches} searches, ${CONFIG.maxConcurrentAnalysis} analysis           ║
║  🎯 CACHE CAPACITY: ${CONFIG.maxCacheSize} entries (MILITARY GRADE)                        ║
║  🎯 ADVANCED OPERATORS: ACTIVE (inurl:, intext:, site:, etc.)                    ║
║  🎯 IRRELEVANT SITE FILTERING: ACTIVE (AI-POWERED)                               ║
║  🎯 FALSE POSITIVE REDUCTION: ACTIVE (MILITARY PRECISION)                        ║
║  🎯 CLASSIFICATION SYSTEM: 5-TIER THREAT ASSESSMENT                              ║
║                                                                                   ║
║                        🎯 OPERATION STATUS: READY FOR DEPLOYMENT 🎯                        ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
    `);
});

// GRACEFUL MILITARY SHUTDOWN
process.on('SIGTERM', () => {
    console.log('🎯 SIGTERM RECEIVED - INITIATING GRACEFUL SHUTDOWN...');
    server.close(() => {
        console.log('🎯 MILITARY SERVER OFFLINE');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🎯 SIGINT RECEIVED - INITIATING EMERGENCY SHUTDOWN...');
    server.close(() => {
        console.log('🎯 MILITARY SERVER OFFLINE');
        process.exit(0);
    });
});

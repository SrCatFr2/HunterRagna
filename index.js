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
    name: 'Ragnarok Hunt',
    version: '2.1.0',
    port: process.env.PORT || 3000,
    timeout: 15000,
    maxRetries: 3,
    delayBetweenRequests: 1000,
    maxConcurrentSearches: 6,
    maxConcurrentAnalysis: 4,
    searchDepth: 4
};

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enhanced excluded domains
const EXCLUDED_DOMAINS = [
    'google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'netflix.com',
    'yahoo.com', 'bing.com', 'microsoft.com', 'apple.com', 'baidu.com',
    'qq.com', 'pinterest.com', 'tiktok.com', 'ebay.com', 'twitch.tv',
    'adobe.com', 'live.com', 'zoom.us', 'office.com', 'github.com',
    'whatsapp.com', 'wordpress.com', 'cloudflare.com', 'blogspot.com', 'tumblr.com',
    'yellowpages.com', 'yelp.com', 'tripadvisor.com', 'booking.com', 'expedia.com',
    'indeed.com', 'glassdoor.com', 'monster.com', 'craigslist.org', 'stackoverflow.com'
];

// Enhanced payment patterns
const PAYMENT_PATTERNS = {
    processors: [
        'stripe', 'paypal', 'square', 'braintree', 'authorize.net', 'worldpay',
        'adyen', 'klarna', 'razorpay', 'mercadopago', 'payu', 'mollie',
        'checkout.com', 'coinbase', 'bitpay', 'payoneer', 'skrill', 'wise',
        'shopify', 'woocommerce', 'magento', 'prestashop', 'opencart'
    ],
    keywords: [
        'payment', 'checkout', 'billing', 'subscription', 'premium', 'pro',
        'upgrade', 'buy now', 'purchase', 'cart', 'order', 'invoice',
        'credit card', 'debit card', 'paypal', 'bitcoin', 'cryptocurrency',
        'monthly', 'yearly', 'annual', 'trial', 'free trial', 'pricing',
        'add to cart', 'proceed to checkout', 'complete purchase', 'payment method'
    ],
    selectors: [
        'form[action*="payment"]', 'form[action*="checkout"]', 'form[action*="billing"]',
        '.payment-form', '.checkout-form', '.billing-form', '.subscription-form',
        '#payment', '#checkout', '#billing', '#subscription', '#cart',
        'input[name*="card"]', 'input[name*="payment"]', 'input[name*="billing"]',
        '.stripe-element', '.paypal-button', '.square-payment', '.shop-pay',
        '[data-stripe]', '[data-paypal]', '[data-square]', '[data-checkout]'
    ],
    urlPatterns: [
        '/payment', '/checkout', '/billing', '/subscribe', '/upgrade',
        '/premium', '/pro', '/buy', '/purchase', '/cart', '/order',
        '/shop', '/store', '/pricing', '/plans', '/membership'
    ]
};

// Enhanced search engines
const SEARCH_ENGINES = [
    {
        name: 'DuckDuckGo',
        baseUrl: 'https://html.duckduckgo.com/html/',
        url: (keyword, page) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}&s=${page * 30}`,
        headers: { 'Referer': 'https://duckduckgo.com/' },
        extractLinks: ($) => {
            const links = [];
            $('.result__url').each((i, element) => {
                const href = $(element).text().trim();
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
            $('.b_algo h2 a, .b_title a').each((i, element) => {
                const href = $(element).attr('href');
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
            $('.serp-item a.link, .organic__url a').each((i, element) => {
                const href = $(element).attr('href');
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
            $('.result h3 a').each((i, element) => {
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
            $('.w-gl__result-url, .result-link').each((i, element) => {
                const href = $(element).attr('href');
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
            $('.result a.result-url').each((i, element) => {
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
            $('.snippet-url').each((i, element) => {
                const href = $(element).text().trim();
                if (href && !href.includes('brave.com')) {
                    try {
                        const fullUrl = href.startsWith('http') ? href : 'https://' + href;
                        links.push(fullUrl);
                    } catch (e) {}
                }
            });
            return links;
        }
    }
];

// Concurrency control using async
const searchQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentSearches);

const analysisQueue = async.queue(async (task) => {
    return await task.fn();
}, CONFIG.maxConcurrentAnalysis);

// Enhanced axios instance creation
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
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
        },
        ...options
    };

    return axios.create(config);
}

// Enhanced Cloudflare detection
async function checkCloudflare(targetUrl, responseData, headers) {
    try {
        const cloudflareHeaders = [
            'cf-ray', 'cf-cache-status', 'cf-request-id', 'cf-visitor',
            'cf-connecting-ip', 'cf-ipcountry', 'cf-team'
        ];

        const hasCloudflareHeaders = cloudflareHeaders.some(header => 
            headers[header] || headers[header.toLowerCase()]
        );

        const serverHeader = headers.server || headers.Server || '';
        const hasCloudflareServer = serverHeader.toLowerCase().includes('cloudflare');

        const content = typeof responseData === 'string' ? responseData.toLowerCase() : '';
        const cloudflareContent = [
            'cloudflare', 'cf-browser-verification', 'cf-challenge-form',
            'ddos protection by cloudflare', 'checking your browser',
            'ray id:', 'cloudflare-nginx', '__cf_bm', 'cf_clearance',
            'just a moment', 'enable javascript and cookies'
        ];

        const hasCloudflareContent = cloudflareContent.some(pattern => 
            content.includes(pattern)
        );

        return {
            detected: hasCloudflareHeaders || hasCloudflareServer || hasCloudflareContent,
            headers: hasCloudflareHeaders,
            server: hasCloudflareServer,
            content: hasCloudflareContent,
            rayId: headers['cf-ray'] || 'N/A',
            confidence: (hasCloudflareHeaders ? 0.8 : 0) + (hasCloudflareServer ? 0.7 : 0) + (hasCloudflareContent ? 0.6 : 0)
        };

    } catch (error) {
        return { detected: false, headers: false, server: false, content: false, confidence: 0 };
    }
}

// Enhanced CAPTCHA detection
async function checkCaptcha(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();

        const captchaForms = [
            'form[action*="/captcha/"]', 'form[action*="/challenge/"]',
            'form[action*="/verify/"]', 'form[id*="captcha"]',
            'form[class*="captcha"]'
        ];
        const hasCaptchaForm = captchaForms.some(selector => $(selector).length > 0);

        const captchaElements = [
            '.captcha', '#captcha', '.g-recaptcha', '.h-captcha',
            '.cf-captcha', '.recaptcha', '.hcaptcha', '.turnstile',
            'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
            'iframe[src*="captcha"]', '[data-sitekey]', '[data-callback]'
        ];
        const hasCaptchaElements = captchaElements.some(selector => $(selector).length > 0);

        const captchaTexts = [
            'verify you are human', 'prove you are human', 'i am not a robot',
            'captcha', 'recaptcha', 'hcaptcha', 'security check',
            'anti-bot verification', 'human verification', 'please complete',
            'solve the challenge', 'verify your identity'
        ];
        const hasCaptchaText = captchaTexts.some(text => content.includes(text));

        const captchaScripts = [
            'recaptcha', 'hcaptcha', 'captcha', 'cf-challenge',
            'turnstile', 'funcaptcha', 'arkose'
        ];
        const hasCaptchaScript = captchaScripts.some(script => 
            $(`script[src*="${script}"]`).length > 0 || content.includes(script)
        );

        const confidence = 
            (hasCaptchaForm ? 0.9 : 0) +
            (hasCaptchaElements ? 0.8 : 0) +
            (hasCaptchaText ? 0.6 : 0) +
            (hasCaptchaScript ? 0.7 : 0);

        return {
            detected: confidence >= 0.6,
            form: hasCaptchaForm,
            elements: hasCaptchaElements,
            text: hasCaptchaText,
            script: hasCaptchaScript,
            confidence: Math.min(confidence, 1)
        };

    } catch (error) {
        return { detected: false, confidence: 0 };
    }
}

// Enhanced payment gateway detection
async function checkPaymentGateway(targetUrl, responseData) {
    try {
        if (typeof responseData !== 'string') return { detected: false };

        const $ = cheerio.load(responseData);
        const content = responseData.toLowerCase();
        const url = targetUrl.toLowerCase();

        const hasPaymentUrl = PAYMENT_PATTERNS.urlPatterns.some(pattern => 
            url.includes(pattern)
        );

        const detectedProcessors = PAYMENT_PATTERNS.processors.filter(processor => 
            content.includes(processor) || 
            $(`script[src*="${processor}"]`).length > 0 ||
            $(`link[href*="${processor}"]`).length > 0 ||
            $(`[class*="${processor}"]`).length > 0 ||
            $(`[id*="${processor}"]`).length > 0
        );

        const detectedKeywords = PAYMENT_PATTERNS.keywords.filter(keyword => 
            content.includes(keyword)
        );

        const hasPaymentForm = PAYMENT_PATTERNS.selectors.some(selector => {
            try {
                return $(selector).length > 0;
            } catch (e) {
                return false;
            }
        });

        const paymentElements = [
            'input[type="text"][placeholder*="card"]',
            'input[type="text"][placeholder*="credit"]',
            'input[type="text"][placeholder*="debit"]',
            'input[name*="cvv"]', 'input[name*="cvc"]', 'input[name*="cvn"]',
            'input[name*="expiry"]', 'input[name*="exp"]',
            '.payment-method', '.billing-address', '.checkout-step',
            '[data-stripe]', '[data-paypal]', '[data-square]'
        ];
        const hasPaymentElements = paymentElements.some(selector => {
            try {
                return $(selector).length > 0;
            } catch (e) {
                return false;
            }
        });

        const pricePatterns = [
            /\$\d+\.?\d*/g, /€\d+\.?\d*/g, /£\d+\.?\d*/g,
            /\d+\s*USD/gi, /\d+\s*EUR/gi, /\d+\s*GBP/gi,
            /price:\s*\$?\d+/gi, /cost:\s*\$?\d+/gi,
            /total:\s*\$?\d+/gi, /amount:\s*\$?\d+/gi
        ];
        const hasPricing = pricePatterns.some(pattern => pattern.test(content));

        const ecommerceIndicators = [
            'add to cart', 'shopping cart', 'checkout now', 'buy now',
            'proceed to checkout', 'complete order', 'place order',
            'shopping bag', 'view cart', 'update cart'
        ];
        const hasEcommerce = ecommerceIndicators.some(indicator => 
            content.includes(indicator)
        );

        const detectionScore = 
            (hasPaymentUrl ? 3 : 0) +
            (detectedProcessors.length > 0 ? 4 : 0) +
            (hasPaymentForm ? 3 : 0) +
            (hasPaymentElements ? 2 : 0) +
            (detectedKeywords.length > 2 ? 2 : detectedKeywords.length > 0 ? 1 : 0) +
            (hasPricing ? 1 : 0) +
            (hasEcommerce ? 2 : 0);

        return {
            detected: detectionScore >= 3,
            score: Math.min(detectionScore, 10),
            confidence: Math.min(detectionScore / 10, 1),
            url: hasPaymentUrl,
            processor: detectedProcessors.length > 0,
            form: hasPaymentForm,
            elements: hasPaymentElements,
            keywords: detectedKeywords.length > 0,
            pricing: hasPricing,
            ecommerce: hasEcommerce,
            details: {
                processors: detectedProcessors,
                keywords: detectedKeywords.slice(0, 5),
                keywordCount: detectedKeywords.length
            }
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
        const search = urlObj.search.toLowerCase();

        const keywordLower = keyword.toLowerCase();
        const keywordParts = keywordLower.split(/\s+/).filter(part => part.length > 2);

        let relevanceScore = 0;

        keywordParts.forEach(part => {
            if (hostname.includes(part)) relevanceScore += 4;
            if (path.includes(part)) relevanceScore += 3;
            if (search.includes(part)) relevanceScore += 2;
            if (title.toLowerCase().includes(part)) relevanceScore += 3;
            if (description.toLowerCase().includes(part)) relevanceScore += 2;
            if (content.toLowerCase().includes(part)) relevanceScore += 1;
        });

        if (hostname.includes(keywordLower)) relevanceScore += 3;
        if (title.toLowerCase().includes(keywordLower)) relevanceScore += 2;
        if (path.includes(keywordLower)) relevanceScore += 2;

        return Math.min(relevanceScore, 20);

    } catch (error) {
        return 0;
    }
}

// Enhanced parallel search using async queue
async function getUrlsParallel(keyword, numResults, socket) {
    socket.emit('search_status', { 
        message: `Starting parallel search for "${keyword}"`,
        type: 'info'
    });

    const allUrls = new Set();
    const seenDomains = new Map();
    const engineResults = new Map();

    return new Promise((resolve) => {
        const searchTasks = SEARCH_ENGINES.map(engine => ({
            fn: async () => {
                const engineUrls = [];
                let consecutiveFailures = 0;

                socket.emit('search_engine_start', { engine: engine.name });

                for (let page = 0; page < CONFIG.searchDepth && consecutiveFailures < 2; page++) {
                    try {
                        const searchUrl = engine.url(keyword, page);
                        const axiosInstance = createAxiosInstance({ 
                            headers: { ...engine.headers },
                            timeout: 10000
                        });

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

                            if (domainCount >= 3) continue;

                            if (!allUrls.has(link)) {
                                allUrls.add(link);
                                engineUrls.push(link);
                                seenDomains.set(domain, domainCount + 1);
                                pageResults++;

                                socket.emit('url_found', { 
                                    url: link,
                                    engine: engine.name,
                                    total: allUrls.size,
                                    target: numResults
                                });
                            }

                            if (allUrls.size >= numResults * 1.5) break;
                        }

                        if (pageResults === 0) {
                            consecutiveFailures++;
                        } else {
                            consecutiveFailures = 0;
                        }

                        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

                    } catch (error) {
                        console.error(`Error with ${engine.name} page ${page}:`, error.message);
                        consecutiveFailures++;
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                    if (allUrls.size >= numResults * 1.5) break;
                }

                engineResults.set(engine.name, engineUrls.length);
                socket.emit('search_engine_complete', { 
                    engine: engine.name, 
                    results: engineUrls.length 
                });

                return engineUrls;
            }
        }));

        // Add all search tasks to queue
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
                        message: `Search completed: ${finalUrls.length} URLs found`
                    });

                    resolve(finalUrls);
                }
            });
        });
    });
}

// Enhanced site analysis
async function analyzeSite(targetUrl, keyword, socket, index, total) {
    const startTime = Date.now();

    try {
        socket.emit('analysis_progress', {
            current: index + 1,
            total: total,
            url: targetUrl,
            domain: getMainUrl(targetUrl),
            message: `Analyzing ${getMainUrl(targetUrl)}...`
        });

        const axiosInstance = createAxiosInstance({
            timeout: 12000,
            maxRedirects: 3
        });

        const response = await axiosInstance.get(targetUrl);
        const endTime = Date.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);

        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const [cloudflareAnalysis, captchaAnalysis, paymentAnalysis] = await Promise.all([
            checkCloudflare(targetUrl, response.data, response.headers),
            checkCaptcha(targetUrl, response.data),
            checkPaymentGateway(targetUrl, response.data)
        ]);

        const $ = cheerio.load(response.data);
        const pageTitle = $('title').text().trim() || '';
        const metaDescription = $('meta[name="description"]').attr('content') || '';
        const bodyText = $('body').text().substring(0, 3000) || '';

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
            redirectCount: response.request._redirectCount || 0
        };

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
            redirectCount: 0
        };

        socket.emit('site_analyzed', result);
        return result;
    }
}

function categorizeWebsite($, content) {
    const categories = {
        ecommerce: ['shop', 'store', 'buy', 'cart', 'checkout', 'product'],
        blog: ['blog', 'post', 'article', 'news', 'journal'],
        business: ['company', 'corporate', 'business', 'services', 'about us'],
        portfolio: ['portfolio', 'gallery', 'work', 'projects'],
        forum: ['forum', 'discussion', 'community', 'board'],
        educational: ['learn', 'course', 'education', 'tutorial', 'university'],
        social: ['social', 'network', 'connect', 'profile', 'friends']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => content.includes(keyword))) {
            return category;
        }
    }
    return 'general';
}

function detectLanguage(text) {
    const languages = {
        en: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
        es: /\b(el|la|y|o|pero|en|con|por|para|de|que)\b/gi,
        fr: /\b(le|la|et|ou|mais|dans|avec|par|pour|de|que)\b/gi,
        de: /\b(der|die|das|und|oder|aber|in|mit|für|von|zu)\b/gi
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

// Socket.IO connections
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('start_hunt', async (data) => {
        const { keyword, numResults } = data;

        try {
            socket.emit('hunt_started', { 
                keyword, 
                numResults,
                message: 'Ragnarok Hunt initiated - Parallel search starting...'
            });

            const urls = await getUrlsParallel(keyword, parseInt(numResults), socket);

            if (urls.length === 0) {
                socket.emit('hunt_error', { error: 'No URLs found with any search engine' });
                return;
            }

            // Parallel site analysis using async queue
            const results = [];
            let completedAnalysis = 0;

            const analysisTasks = urls.map((url, index) => ({
                fn: async () => {
                    const result = await analyzeSite(url, keyword, socket, index, urls.length);
                    results.push(result);
                    completedAnalysis++;

                    if (completedAnalysis === urls.length) {
                        // All analysis complete
                        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

                        const summary = {
                            total: results.length,
                            clean: results.filter(r => r.isClean).length,
                            cloudflare: results.filter(r => r.cloudflare?.detected).length,
                            captcha: results.filter(r => r.captcha?.detected).length,
                            payment: results.filter(r => r.payment?.detected).length,
                            highRelevance: results.filter(r => r.relevanceScore >= 10).length,
                            averageTime: results.reduce((sum, r) => sum + r.timeElapsed, 0) / results.length,
                            categories: getCategorySummary(results),
                            avgRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
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

// Start server
server.listen(CONFIG.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    RAGNAROK HUNT v${CONFIG.version}                    ║
║                 Enhanced Parallel Search                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${CONFIG.port}                 ║
║  Concurrent searches: ${CONFIG.maxConcurrentSearches}                          ║
║  Concurrent analysis: ${CONFIG.maxConcurrentAnalysis}                          ║
║  Search engines: ${SEARCH_ENGINES.length}                              ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
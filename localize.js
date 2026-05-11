const fs = require('fs');
const path = require('path');

const localImages = [
    "assets/images/image-1069735182036454.jpeg", "assets/images/image-1151036943641231.jpeg",
    "assets/images/image-1159048899476965.jpeg", "assets/images/image-1241914707359771.jpeg",
    "assets/images/image-1244376901213252.jpeg", "assets/images/image-1248479197216059.jpeg",
    "assets/images/image-1299626268670575.jpeg", "assets/images/image-1310738680879818.jpeg",
    "assets/images/image-1331016452159424.jpeg", "assets/images/image-1355241026645163.jpeg",
    "assets/images/image-1387918619315054.jpeg", "assets/images/image-1409838710352570.jpeg",
    "assets/images/image-1450374706648200.jpeg", "assets/images/image-1468541521491682.jpeg",
    "assets/images/image-1509933797220208.jpeg", "assets/images/image-1557205509244682.jpeg",
    "assets/images/image-1578735070028146.jpeg", "assets/images/image-1595567008150679.jpeg",
    "assets/images/image-1604760690670165.jpeg", "assets/images/image-1622416822507989.jpeg",
    "assets/images/image-1624101292124089.jpeg", "assets/images/image-1640937826905933.jpeg",
    "assets/images/image-1831884430857942.jpeg", "assets/images/image-1901585134062671.jpeg",
    "assets/images/image-2101910170611614.jpeg", "assets/images/image-2371818899974149.jpeg",
    "assets/images/image-26042998412056336.jpeg", "assets/images/image-26072932035669467.jpeg",
    "assets/images/image-26228893106800160.jpeg", "assets/images/image-2939395152922243.jpeg",
    "assets/images/image-3091255171057922.jpeg", "assets/images/image-3124608364407696.jpeg",
    "assets/images/image-3465760750248174.jpeg", "assets/images/image-4008910312743443.jpeg",
    "assets/images/image-4286066815043885.jpeg", "assets/images/image-4462346037423843.jpeg",
    "assets/images/image-4471750699774727.jpeg", "assets/images/image-4493535650964444.jpeg",
    "assets/images/image-728551170189445.jpeg", "assets/images/image-752873164273631.jpeg",
    "assets/images/image-778861854769180.jpeg", "assets/images/image-795393470241072.jpeg",
    "assets/images/image-841088235620312.jpeg", "assets/images/image-844306531970572.jpeg",
    "assets/images/image-857427817256822.jpeg", "assets/images/image-867497642824053.jpeg",
    "assets/images/image-870593975800332.jpeg", "assets/images/image-886951657511327.jpeg",
    "assets/images/image-889256920670684.jpeg", "assets/images/image-893483403496784.jpeg",
    "assets/images/image-905065892235576.jpeg", "assets/images/image-908058388492526.jpeg",
    "assets/images/image-920543167336844.jpeg", "assets/images/image-929172709591221.jpeg",
    "assets/images/image-930301872674127.jpeg", "assets/images/image-936860445478025.jpeg",
    "assets/images/image-946796591350818.jpeg", "assets/images/image-946872327913136.jpeg",
    "assets/images/image-964401376543461.jpeg"
];

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function getSanityFakeUrl(url) {
    const index = hashString(url) % localImages.length;
    let localFile = localImages[index].split('/').pop();
    const hashPart = localFile.replace('image-', '').split('.')[0];
    const paddedHash = hashPart.padStart(24, '0').slice(-24);
    return `https://cdn.sanity.io/images/dummy/dummy/${paddedHash}-1000x1000.jpg`;
}

function patchData(obj, filePath) {
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            if (obj[key].includes('sanity.io') || obj[key].startsWith('assets/images/')) {
                obj[key] = getSanityFakeUrl(obj[key]);
            } else if (obj[key].includes('image-') && obj[key].split('-').length >= 3) {
                const index = hashString(obj[key]) % localImages.length;
                let localFile = localImages[index].split('/').pop();
                const hashPart = localFile.replace('image-', '').split('.')[0];
                const paddedHash = hashPart.padStart(24, '0').slice(-24);
                obj[key] = `image-${paddedHash}-1000x1000-jpg`;
            }
            obj[key] = obj[key].replace(/Monolith/g, 'Kortalan Forma');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            patchData(obj[key], filePath);
        }
    }
}

const patchScript = `
    <script>
        (function() {
            const localImages = ${JSON.stringify(localImages)};
            const hashToLocal = {};
            
            localImages.forEach(img => {
                const filename = img.split('/').pop();
                const hash = filename.replace('image-', '').split('.')[0];
                const paddedHash = hash.padStart(24, '0').slice(-24);
                
                hashToLocal[hash] = img;
                hashToLocal[paddedHash] = img;
            });

            const redirect = (url) => {
                if (typeof url !== 'string') return url;
                if (url.startsWith('/assets/images/')) return url;
                if (url.includes('sanity.io')) {
                    const parts = url.split('/');
                    const filename = parts[parts.length - 1];
                    const hash = filename.split('-')[0];
                    const local = hashToLocal[hash] || hashToLocal[hash.padStart(24, '0').slice(-24)];
                    if (local) {
                        return local.startsWith('/') ? local : '/' + local;
                    }
                }
                return url;
            };

            const fixNode = (node) => {
                if (node.tagName === 'IMG' && node.src) node.src = redirect(node.src);
                if (node.tagName === 'SOURCE' && node.srcset) {
                    node.srcset = node.srcset.split(',').map(s => {
                        const parts = s.trim().split(' ');
                        if (parts.length > 0) parts[0] = redirect(parts[0]);
                        return parts.join(' ');
                    }).join(', ');
                }
            };

            // 1. Intercept initial HTML images
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        fixNode(node);
                        node.querySelectorAll('img, source').forEach(fixNode);
                    });
                });
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });

            // 2. Intercept dynamic JS images
            const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            Object.defineProperty(HTMLImageElement.prototype, 'src', {
                set: function(val) { originalSrc.set.call(this, redirect(val)); },
                get: function() { return originalSrc.get.call(this); }
            });

            const originalSrcset = Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'srcset');
            if (originalSrcset) {
                Object.defineProperty(HTMLSourceElement.prototype, 'srcset', {
                    set: function(val) { 
                        if (!val) return originalSrcset.set.call(this, val);
                        const newVal = val.split(',').map(s => {
                            const parts = s.trim().split(' ');
                            if (parts.length === 0) return s;
                            parts[0] = redirect(parts[0]);
                            return parts.join(' ');
                        }).join(', ');
                        originalSrcset.set.call(this, newVal); 
                    },
                    get: function() { return originalSrcset.get.call(this); }
                });
            }

            function patchObj(obj) {
                for (let key in obj) {
                    if (typeof obj[key] === 'string') {
                        if (obj[key].includes('image-') && obj[key].split('-').length >= 3) {
                             const parts = obj[key].split('-');
                             const hashIdx = parts[0] === 'image' && parts[1] === 'image' ? 2 : 1;
                             const rawHash = parts[hashIdx];
                             const paddedHash = rawHash.padStart(24, '0').slice(-24);
                             obj[key] = 'image-' + paddedHash + '-1000x1000-jpg';
                        }
                        // Do NOT redirect URLs in the state itself to avoid Sanity parser errors
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        patchObj(obj[key]);
                    }
                }
            }

            const nextDataScript = document.getElementById('__NEXT_DATA__');
            if (nextDataScript) {
                try {
                    const data = JSON.parse(nextDataScript.textContent);
                    patchObj(data);
                    nextDataScript.textContent = JSON.stringify(data);
                } catch (e) {}
            }
        })();
    </script>
`;

function generateDataJson(jsonData, filePath) {
    const buildId = jsonData.buildId;
    if (!buildId) return;

    // Clean up filePath to get page path
    // e.g. "products/chair.html" -> "products/chair"
    let pagePath = filePath.replace(/\\/g, '/'); // Normalize slashes
    if (pagePath.startsWith('./')) pagePath = pagePath.slice(2);
    pagePath = pagePath.replace(/\.html$/, '');
    
    const dataDir = path.join('_next', 'data', buildId);
    const jsonPath = path.join(dataDir, pagePath + '.json');

    try {
        const dataContent = JSON.stringify({
            pageProps: jsonData.props ? jsonData.props.pageProps : {},
            __N_SSG: true
        });

        fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
        fs.writeFileSync(jsonPath, dataContent, 'utf8');
    } catch (e) {
        console.error(`Failed to generate JSON for ${filePath}`, e);
    }
}

function processFile(filePath) {
    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove mirroring comments
    content = content.replace(/<!-- Mirrored from .*? -->/g, '');

    // 2. Global Branding Replace
    content = content.replace(/Monolith/g, 'Kortalan Forma');
    content = content.replace(/monolith\.nyc/g, 'kortalanforma.com');
    content = content.replace(/monolith\.studio/g, 'kortalanforma');

    // 3. Global Path Normalize (Convert to fake Sanity URLs for consistency)
    // Greedy regex to catch any assets/images/path
    const localImagePathRegex = /(?:\/)?assets\/images\/image-([a-z0-9]+)\.(?:jpeg|jpg|png|gif|webp)/gi;
    content = content.replace(localImagePathRegex, (match, hash) => {
        return getSanityFakeUrl(match);
    });

    // Patch remaining Sanity URLs
    content = content.replace(/[^\s"'>]*cdn\.sanity\.io\/images\/[^\s"'>]*/g, (url) => {
        return getSanityFakeUrl(url);
    });

    // 4. Force Visibility CSS Fix
    const styleFix = `
        <style>
            .SanityImage_SanityImage__8h2FE, 
            .ImageReveal_imageContainer__r_JEK img,
            [class*="image"] img {
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
            }
            .ImageReveal_backgroundColor___6CYl {
                display: none !important;
            }
        </style>
    `;
    if (!content.includes('opacity: 1 !important')) {
        content = content.replace('</head>', `${styleFix}</head>`);
    }

    // 5. Patch __NEXT_DATA__
    const nextDataMatch = content.match(/<script id="__NEXT_DATA__"\s+type="application\/json"([^>]*)>(.*?)<\/script>/s);
    if (nextDataMatch) {
        try {
            const jsonData = JSON.parse(nextDataMatch[2]);
            patchData(jsonData, filePath);
            
            // Generate the missing _next/data JSON for client-side navigation
            generateDataJson(jsonData, filePath);

            const patchedJson = JSON.stringify(jsonData);
            const fullTag = `<script id="__NEXT_DATA__" type="application/json"${nextDataMatch[1]}>${patchedJson}</script>`;
            content = content.replace(nextDataMatch[0], () => fullTag);
        } catch (e) {
            console.error(`Failed to parse JSON in ${filePath}`, e);
        }
    }

    // 6. Inject Hydration Patch Script into HEAD for early execution
    // Remove old patch script if present anywhere
    content = content.replace(/<script>\s*\(function\(\) \{\s*const localImages = \[.*?<\/script>/gs, '');
    
    if (!content.includes('hashToLocal = {}')) {
        content = content.replace('</head>', `${patchScript}</head>`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'assets') {
                walk(fullPath);
            }
        } else if (file.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

walk('.');
console.log('Localization complete.');

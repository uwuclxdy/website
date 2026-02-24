// Language colors mapping (GitHub's official colors)
const languageColors = {
    'Rust': '#dea584',
    'JavaScript': '#f1e05a',
    'TypeScript': '#2b7489',
    'Python': '#3572A5',
    'C#': '#178600',
    'Java': '#b07219',
    'Go': '#00ADD8',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Shell': '#89e051',
    'PHP': '#4F5D95',
    'Kotlin': '#A97BFF',
    'QML': '#44a51c',
    'C': '#555555',
    'C++': '#f34b7d',
};

// Cache configuration
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
const CACHE_KEY = 'github_repos_cache';

// Cookie helper functions
function setCookie(name, value, maxAge) {
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            try {
                return JSON.parse(decodeURIComponent(cookieValue));
            } catch {
                return null;
            }
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; max-age=0; path=/`;
}

// Helper to find and update star badge
function updateStarBadge(totalStars, isError = false) {
    // The star badge is the second badge (0-indexed: 1)
    const badges = document.querySelectorAll('.badge');
    const starBadge = badges[1]; // GitHub stars badge is second

    if (starBadge) {
        const label = starBadge.querySelector('.badge-label');
        const label2 = starBadge.querySelector('.badge-label-2');
        if (label && label2) {
            if (isError) {
                label2.textContent = 'failed to fetch';
                label2.style.opacity = '0.6';
            } else {
                label.textContent = `${totalStars}`;
                label2.textContent = `on github`;
            }
        }
    } else {
        console.warn('Star badge not found');
    }
}

// Fetch GitHub repositories
async function fetchGitHubRepos() {
    const container = document.getElementById('projects-container');

    // Check cache first
    const cachedData = getCookie(CACHE_KEY);

    if (cachedData) {
        const { data, timestamp } = cachedData;
        const age = Date.now() - timestamp;

        // Check if cache is still valid (within TTL)
        if (age < CACHE_TTL) {
            console.log('%c📦 using cached repos data (fresh!', 'font-size: 12px; color: #a6e3a1;');
            await displayRepos(data.ownRepos, container);
            return;
        } else {
            console.log('%c🗑️ cache expired, fetching fresh data...', 'font-size: 12px; color: #f9e2af;');
            deleteCookie(CACHE_KEY);
        }
    }

    try {
        const response = await fetch('https://api.github.com/users/uwuclxdy/repos?per_page=100&sort=updated');
        const repos = await response.json();

        if (!Array.isArray(repos)) {
            throw new Error('Invalid response format');
        }

        const ownRepos = repos
            .filter(repo => !repo.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);

        // Store in cache
        const cacheData = {
            data: { ownRepos },
            timestamp: Date.now()
        };
        setCookie(CACHE_KEY, cacheData, CACHE_TTL / 1000);
        console.log('%c💾 cached repos data for 10 minutes', 'font-size: 12px; color: #89b4fa;');

        await displayRepos(ownRepos, container);

    } catch (error) {
        console.error('Failed to fetch repos:', error);

        // Try to use stale cache if available
        const staleData = getCookie(CACHE_KEY);
        if (staleData) {
            console.log('%c⚠️ using stale cache as fallback', 'font-size: 12px; color: #f9e2af;');
            await displayRepos(staleData.data.ownRepos, container);
            updateStarBadge(staleData.data.ownRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0));
            // Add a note that data might be stale
            const warning = document.createElement('p');
            warning.style.cssText = 'color: var(--ctp-yellow); font-size: 0.85rem; margin-top: 1rem; font-family: var(--font-mono);';
            warning.textContent = '// showing cached data (github api is being mean)';
            container.prepend(warning);
            return;
        }

        container.innerHTML = `
            <div class="project-loading">
                <p style="color: var(--ctp-red);">failed to load repos (github api is being mean)</p>
                <p style="font-size: 0.9rem; color: var(--ctp-overlay0); margin-top: 1rem;">
                    just visit
                    <a href="https://github.com/uwuclxdy" style="color: var(--primary);" target="blank">github.com/uwuclxdy</a>
                </p>
            </div>
        `;
        updateStarBadge(0, true);
    }
}

// Display repositories (helper function to avoid code duplication)
async function displayRepos(ownRepos, container) {
    container.innerHTML = '';

    const reposToSkip = ['uwuclxdy', 'uwuweb', 'reverse-proxy-guide', 'website', 'rhysu'];
    let displayedRepos = [];

    ownRepos.forEach((repo, index) => {
        if (reposToSkip.includes(repo.name)) return;
        displayedRepos.push(repo);
        const card = createProjectCard(repo);
        container.appendChild(card);

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });

    const totalStars = displayedRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    updateStarBadge(totalStars);
}

// Create a project card element
function createProjectCard(repo) {
    const card = document.createElement('a');
    card.className = 'project-card';
    card.href = repo.html_url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.3s ease';

    // Header with name and stars
    const header = document.createElement('div');
    header.className = 'project-header';

    const name = document.createElement('div');
    name.className = 'project-name';
    name.textContent = repo.name;

    const isVibecoded = repo.topics && repo.topics.includes('vibecoded');
    name.style.color = isVibecoded ? 'var(--primary)' : '#04a5e5';

    // Set border color based on title color for hover effect
    const borderColor = isVibecoded ? 'var(--primary)' : '#04a5e5';
    card.style.setProperty('--hover-border-color', borderColor);

    const stars = document.createElement('div');
    stars.className = 'project-stars';
    stars.innerHTML = `<span>⭐</span><span>${repo.stargazers_count}</span>`;

    header.appendChild(name);
    header.appendChild(stars);

    // Description
    const description = document.createElement('div');
    description.className = 'project-description';
    description.textContent = repo.description || 'no description (oops)';

    // Topics
    const topicsContainer = document.createElement('div');
    topicsContainer.className = 'project-topics';

    if (repo.topics && repo.topics.length > 0) {
        let displayedTags = 0;
        repo.topics.forEach(topic => {
            if (topic === 'vibecoded') return;
            // Only display up to 3 tags
            if (displayedTags >= 3) return;

            const tag = document.createElement('span');
            tag.className = 'topic-tag';
            tag.textContent = topic;

            tag.style.color = isVibecoded ? 'var(--primary)' : '#04a5e5';

            topicsContainer.appendChild(tag);
            displayedTags++;
        });
    }

    // Footer with language
    const footer = document.createElement('div');
    footer.className = 'project-footer';

    if (repo.language) {
        const language = document.createElement('div');
        language.className = 'project-language';

        const dot = document.createElement('span');
        dot.className = 'language-dot';
        dot.style.backgroundColor = languageColors[repo.language] || '#858585';

        const langText = document.createElement('span');
        langText.textContent = repo.language;

        language.appendChild(dot);
        language.appendChild(langText);
        footer.appendChild(language);
    }

    // Assemble card
    card.appendChild(header);
    card.appendChild(description);
    if (repo.topics && repo.topics.length > 0) {
        card.appendChild(topicsContainer);
    }
    card.appendChild(footer);

    return card;
}

// Smooth scroll for navigation links
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add subtle parallax effect to hero
function setupParallax() {
    let ticking = false;
    const hero = document.querySelector('#hero');
    const heroContent = hero ? hero.querySelector('.hero-content') : null;
    const sectionHeadings = Array.from(document.querySelectorAll('main section > h2'));

    const updateStickyStates = () => {
        if (sectionHeadings.length === 0) return;
        const offsetValue = getComputedStyle(document.documentElement)
            .getPropertyValue('--sticky-offset')
            .trim();
        const offset = Number.parseFloat(offsetValue) || 0;

        sectionHeadings.forEach((heading) => {
            const rect = heading.getBoundingClientRect();
            const isStuck = rect.top <= offset && rect.bottom > offset + 1;
            heading.classList.toggle('is-stuck', isStuck);
        });
    };

    const updateHeroEffects = () => {
        if (!hero || !heroContent) return;
        const scrolled = window.pageYOffset;
        const heroHeight = hero.offsetHeight || 1;
        const fadeDistance = heroHeight * 4;
        const progress = Math.min(Math.max(scrolled / fadeDistance, 0), 1);

        heroContent.style.opacity = `${1 - progress}`;

        const translateAmount = Math.min(scrolled, heroHeight) * 0.3;
        hero.style.transform = `translateY(${translateAmount}px)`;
    };

    const updateAll = () => {
        updateHeroEffects();
        updateStickyStates();
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateAll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    window.addEventListener('resize', updateAll);
    updateAll();
}

function setupStickyOffset() {
    const header = document.querySelector('header');
    const root = document.documentElement;

    const updateOffset = () => {
        if (!header) return;
        const height = header.getBoundingClientRect().height;
        root.style.setProperty('--sticky-offset', `${height}px`);

        // Also update the sticky states immediately
        const updateStickyStates = window.updateStickyStates;
        if (updateStickyStates) {
            updateStickyStates();
        }
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    window.addEventListener('load', updateOffset);
}

// Copy Discord username on click
function setupDiscordCopy() {
    const discordCard = document.querySelector('.discord-card');
    if (discordCard) {
        discordCard.addEventListener('click', () => {
            navigator.clipboard.writeText('uwuclxdy').then(() => {
                const original = discordCard.querySelector('.social-content p').textContent;
                discordCard.querySelector('.social-content p').textContent = 'copied to clipboard!';

                setTimeout(() => {
                    discordCard.querySelector('.social-content p').textContent = original;
                }, 2000);
            });
        });

        discordCard.style.cursor = 'pointer';
        discordCard.title = 'click to copy username';
    }
}

// Copy Signal username on click
function setupSignalCopy() {
    const signalCard = document.querySelector('.signal-card');
    if (signalCard) {
        signalCard.addEventListener('click', () => {
            navigator.clipboard.writeText('uwuclxdy.64').then(() => {
                const original = signalCard.querySelector('.social-content p').textContent;
                signalCard.querySelector('.social-content p').textContent = 'copied to clipboard!';

                setTimeout(() => {
                    signalCard.querySelector('.social-content p').textContent = original;
                }, 2000);
            });
        });

        signalCard.style.cursor = 'pointer';
        signalCard.title = 'click to copy username';
    }
}

// Easter egg: Konami code
function setupKonamiCode() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Easter egg activated!
                document.body.style.transform = 'rotate(360deg)';
                document.body.style.transition = 'transform 2s ease';

                setTimeout(() => {
                    document.body.style.transform = 'rotate(0deg)';
                    alert('wow ur so tuffy twin 🥹');
                }, 2000);

                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

// Add typing effect to cursor
function setupCursorBlink() {
    const cursor = document.querySelector('.cursor');
    if (cursor) {
        // Already handled by CSS animation, but we can add interaction
        cursor.addEventListener('mouseenter', () => {
            cursor.style.animation = 'none';
            cursor.style.opacity = '1';
        });

        cursor.addEventListener('mouseleave', () => {
            cursor.style.animation = 'blink 1s infinite';
        });
    }
}

// Setup translate button
function setupTranslateButton() {
    const translateBtn = document.getElementById('translateBtn');
    const translatedText = document.getElementById('translatedText');

    if (translateBtn && translatedText) {
        translateBtn.addEventListener('click', () => {
            // Remove button and create loading element
            const parent = translateBtn.parentElement;
            translateBtn.remove();

            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'translate-loading';
            loadingDiv.innerHTML = `
                <div class="spinner"></div>
                <p>translating...</p>
            `;
            parent.insertBefore(loadingDiv, translatedText);

            // After 2 seconds, remove loading and show the translated text
            setTimeout(() => {
                loadingDiv.remove();
                translatedText.style.display = 'block';
            }, 2000);
        });
    }
}

// Split highlight text for animation
function setupHighlightAnimation() {
    const highlights = document.querySelectorAll('.highlight.animate');
    const allAnimatedSpans = [];

    highlights.forEach(element => {
        const text = element.textContent;
        // Skip if already processed or empty
        if (element.querySelector('span') || !text.trim()) return;

        element.innerHTML = '';
        element.setAttribute('aria-label', text);
        element.classList.add('highlight-animated');

        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;

            // Preserve spaces
            if (char === ' ') {
                span.style.display = 'inline-block';
                span.innerHTML = '&nbsp;';
            }

            element.appendChild(span);
            allAnimatedSpans.push({
                el: span,
                x: 0,
                y: 0
            });
        });
    });

    if (allAnimatedSpans.length === 0) return;

    const updatePositions = () => {
        allAnimatedSpans.forEach(item => {
            const rect = item.el.getBoundingClientRect();
            item.x = rect.left + rect.width / 2 + window.scrollX;
            item.y = rect.top + rect.height / 2 + window.scrollY;
        });
    };

    // Update positions initially and on changes
    setTimeout(updatePositions, 100);
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);

    // Interaction logic
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.pageX;
        const mouseY = e.pageY;
        const radius = 300; // Radius of effect

        allAnimatedSpans.forEach(item => {
            const dx = mouseX - item.x;
            const dy = mouseY - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius) {
                const strength = 1 - (distance / radius);
                // Mix color based on distance
                item.el.style.color = `color-mix(in srgb, var(--primary) ${strength * 100}%, var(--secondary))`;
            } else {
                item.el.style.color = 'var(--secondary)';
            }
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubRepos();
    setupSmoothScroll();
    setupStickyOffset();
    setupParallax();
    setupDiscordCopy();
    setupSignalCopy();
    setupKonamiCode();
    setupCursorBlink();
    setupHighlightAnimation();
    setupTranslateButton();

    console.log('%c👋 hey there!', 'font-size: 20px; color: #E07B53; font-weight: bold;');
    console.log('%cits not a bug, its a feature:', 'font-size: 12px; color: #a6adc8; font-style: italic;');
});

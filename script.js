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
    const forksContainer = document.getElementById('forks-container');

    // Check cache first
    const cachedData = getCookie(CACHE_KEY);

    if (cachedData) {
        const { data, timestamp } = cachedData;
        const age = Date.now() - timestamp;

        // Check if cache is still valid (within TTL)
        if (age < CACHE_TTL) {
            console.log('%c📦 using cached repos data (fresh!', 'font-size: 12px; color: #a6e3a1;');
            await displayRepos(data.ownRepos, data.forkRepos, container, forksContainer);
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

        // Filter forks with [Fork] in description
        const forkRepos = repos
            .filter(repo => repo.fork && repo.description && repo.description.includes('[Fork]'))
            .sort((a, b) => b.stargazers_count - a.stargazers_count);

        // Store in cache
        const cacheData = {
            data: { ownRepos, forkRepos },
            timestamp: Date.now()
        };
        setCookie(CACHE_KEY, cacheData, CACHE_TTL / 1000);
        console.log('%c💾 cached repos data for 10 minutes', 'font-size: 12px; color: #89b4fa;');

        await displayRepos(ownRepos, forkRepos, container, forksContainer);

    } catch (error) {
        console.error('Failed to fetch repos:', error);

        // Try to use stale cache if available
        const staleData = getCookie(CACHE_KEY);
        if (staleData) {
            console.log('%c⚠️ using stale cache as fallback', 'font-size: 12px; color: #f9e2af;');
            await displayRepos(staleData.data.ownRepos, staleData.data.forkRepos, container, forksContainer);
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
async function displayRepos(ownRepos, forkRepos, container, forksContainer) {
    container.innerHTML = '';
    forksContainer.innerHTML = '';

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

    // Display fork repos
    for (const [index, repo] of forkRepos.entries()) {
        const card = await createForkCard(repo);
        if (card) {
            forksContainer.appendChild(card);

            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        }
    }

    // Handle empty forks section
    if (forkRepos.length === 0) {
        forksContainer.innerHTML = `
            <div class="project-loading">
                <p style="color: var(--ctp-overlay0);">no forks found (yet)</p>
            </div>
        `;
    }

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

// Create a fork card element (for forks with [Fork] in description)
async function createForkCard(repo) {
    const card = document.createElement('a');
    card.className = 'fork-card';
    card.href = repo.html_url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.3s ease';

    // Header with name and stars
    const header = document.createElement('div');
    header.className = 'fork-header';

    const name = document.createElement('div');
    name.className = 'fork-name';
    name.textContent = repo.name;

    // Stars container for both fork and original stars
    const starsContainer = document.createElement('div');
    starsContainer.className = 'fork-stars-container';
    starsContainer.style.display = 'flex';
    starsContainer.style.flexDirection = 'column';
    starsContainer.style.gap = 'var(--spacing-xs)';
    starsContainer.style.alignItems = 'center';

    // Fork stars
    const forkStars = document.createElement('div');
    forkStars.className = 'project-stars';
    forkStars.style.width = 'auto';
    forkStars.style.minWidth = 'fit-content';
    forkStars.style.whiteSpace = 'nowrap';
    forkStars.innerHTML = `<span>⭐</span><span>${repo.stargazers_count}</span>`;

    // Fetch original repo's star count
    let originalStars = null;
    try {
        let sourceRepo = repo.source;
        // If source is missing (common in list lists), fetch repo details to get it
        if (!sourceRepo && repo.fork) {
            const detailResponse = await fetch(repo.url);
            if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                sourceRepo = detailData.source || detailData.parent;
            }
        }

        if (sourceRepo) {
            if (sourceRepo.stargazers_count !== undefined) {
                originalStars = sourceRepo.stargazers_count;
            } else {
                const response = await fetch(`https://api.github.com/repos/${sourceRepo.owner.login}/${sourceRepo.name}`);
                if (response.ok) {
                    const upstreamData = await response.json();
                    originalStars = upstreamData.stargazers_count;
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch source repo stars:', error);
    }

    // Original repo stars
    if (originalStars !== null) {
        const originalStarsDiv = document.createElement('div');
        originalStarsDiv.className = 'fork-original-stars';
        originalStarsDiv.style.fontSize = '0.85rem';
        originalStarsDiv.style.color = 'var(--ctp-subtext0)';
        originalStarsDiv.style.fontFamily = 'var(--font-mono)';
        originalStarsDiv.style.width = 'auto';
        originalStarsDiv.style.minWidth = 'fit-content';
        originalStarsDiv.style.whiteSpace = 'nowrap';
        originalStarsDiv.innerHTML = `<span>🌟</span><span> ${originalStars}</span>`;
        starsContainer.appendChild(forkStars);
        starsContainer.appendChild(originalStarsDiv);
    } else {
        starsContainer.appendChild(forkStars);
    }

    header.appendChild(name);
    header.appendChild(starsContainer);

    // Description (remove [Fork] tag from display)
    const description = document.createElement('div');
    description.className = 'fork-description';
    const cleanDesc = repo.description ? repo.description.replace('[Fork]', '').trim() : 'no description (oops)';
    description.textContent = cleanDesc || 'no description (oops)';

    // Topics
    const topicsContainer = document.createElement('div');
    topicsContainer.className = 'fork-topics';

    if (repo.topics && repo.topics.length > 0) {
        let displayedTags = 0;
        repo.topics.forEach(topic => {
            // Only display up to 3 tags
            if (displayedTags >= 3) return;

            const tag = document.createElement('span');
            tag.className = 'fork-topic-tag';
            tag.textContent = topic;

            topicsContainer.appendChild(tag);
            displayedTags++;
        });
    }

    // Footer with language
    const footer = document.createElement('div');
    footer.className = 'fork-footer';

    if (repo.language) {
        const language = document.createElement('div');
        language.className = 'fork-language';

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

// Animate stats on scroll
function animateStats() {
    const stats = document.querySelectorAll('.stat-value');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('counted');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
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

// Expandable game cards
function setupGameCards() {
    const gameCards = document.querySelectorAll('.game-card');

    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const isExpanded = card.classList.contains('expanded');

            // Collapse all other cards
            gameCards.forEach(c => {
                if (c.classList.contains('expanded') && c !== card) {
                    collapseCard(c);
                }
            });

            // Expand clicked card if it wasn't already expanded
            if (!isExpanded) {
                expandCard(card);
                // Re-add description if it was removed
                const gameContent = card.querySelector('.game-content');
                const description = card.querySelector('.game-description');
                if (gameContent && !description) {
                    const storedDescription = card.dataset.originalDescription;
                    if (storedDescription) {
                        const newDescription = document.createElement('p');
                        newDescription.className = 'game-description';
                        newDescription.textContent = storedDescription;
                        gameContent.appendChild(newDescription);
                    }
                }
            } else {
                // Collapse the clicked card
                collapseCardWithReflow(card);
            }
        });
    });
}

function collapseCardWithReflow(card) {
    const grid = card.closest('.games-grid');
    if (!grid) {
        collapseCard(card);
        return;
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        collapseCard(card);
        return;
    }

    const cards = Array.from(grid.querySelectorAll('.game-card'));
    const firstRects = new Map();

    cards.forEach(current => {
        if (current !== card) {
            firstRects.set(current, current.getBoundingClientRect());
        }
    });

    // FLIP: capture positions before and after collapsing to animate reflow
    collapseCard(card);

    const animated = [];
    cards.forEach(current => {
        if (current === card) return;
        const first = firstRects.get(current);
        const last = current.getBoundingClientRect();
        if (!first) return;

        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        if (deltaX === 0 && deltaY === 0) return;

        current.style.transition = 'none';
        current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        animated.push(current);
    });

    if (animated.length === 0) return;

    requestAnimationFrame(() => {
        animated.forEach(current => {
            current.style.transition = 'transform 0.2s ease';
            current.style.transform = '';
        });
    });

    setTimeout(() => {
        animated.forEach(current => {
            current.style.transition = '';
        });
    }, 220);
}

function expandCard(card) {
    card.classList.add('expanded');
}

function collapseCard(card) {
    card.classList.remove('expanded');
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

// Random stat variations (subtle changes every few seconds)
function animateStatsValues() {
    const statValues = {
        uptime: { base: 99.9, variance: 0.1 },
        storage: { base: 420, variance: 5 },
        requests: { base: 1.2, variance: 0.1 },
        containers: { base: 23, variance: 2 }
    };

    setInterval(() => {
        Object.entries(statValues).forEach(([key, config]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                let value;
                if (key === 'uptime') {
                    value = (config.base + (Math.random() - 0.5) * config.variance).toFixed(1) + '%';
                } else if (key === 'storage') {
                    value = Math.floor(config.base + (Math.random() - 0.5) * config.variance) + ' GB';
                } else if (key === 'requests') {
                    value = (config.base + (Math.random() - 0.5) * config.variance).toFixed(1) + 'M';
                } else if (key === 'containers') {
                    value = Math.floor(config.base + (Math.random() - 0.5) * config.variance);
                }

                element.style.transition = 'opacity 0.3s ease';
                element.style.opacity = '0.5';

                setTimeout(() => {
                    element.textContent = value;
                    element.style.opacity = '1';
                }, 300);
            }
        });
    }, 5000); // Update every 5 seconds
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
            // Stagger delay by 0.1s per character
            // Use negative delay so animation starts already in motion (optional, but here we want wave)
            // Or positive delay to see it ripple.
            // Negative delay is better for "already running" look, but positive makes the "wave" travel.
            span.style.animationDelay = `${index * 0.1}s`;

            // Preserve spaces
            if (char === ' ') {
                span.style.display = 'inline-block';
                span.innerHTML = '&nbsp;';
            }

            element.appendChild(span);
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubRepos();
    animateStats();
    setupSmoothScroll();
    setupStickyOffset();
    setupParallax();
    setupGameCards();
    setupDiscordCopy();
    animateStatsValues();
    setupKonamiCode();
    setupCursorBlink();
    setupHighlightAnimation();
    setupTranslateButton();

    console.log('%c👋 hey there!', 'font-size: 20px; color: #E07B53; font-weight: bold;');
    console.log('%cits not a bug, its a feature:', 'font-size: 12px; color: #a6adc8; font-style: italic;');
});

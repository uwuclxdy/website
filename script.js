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

// Helper to find and update star badge
function updateStarBadge(totalStars, isError = false) {
    // The star badge is the second badge (0-indexed: 1)
    const badges = document.querySelectorAll('.badge');
    const starBadge = badges[1]; // GitHub stars badge is second

    if (starBadge) {
        const label = starBadge.querySelector('.badge-label');
        if (label) {
            if (isError) {
                label.textContent = 'stars unavailable';
                label.style.opacity = '0.6';
            } else {
                label.textContent = `${totalStars} stars on github`;
            }
        }
    } else {
        console.warn('Star badge not found');
    }
}

// Fetch GitHub repositories
async function fetchGitHubRepos() {
    const container = document.getElementById('projects-container');

    try {
        const response = await fetch('https://api.github.com/users/uwuclxdy/repos?per_page=100&sort=updated');
        const repos = await response.json();

        if (!Array.isArray(repos)) {
            throw new Error('Invalid response format');
        }

        const ownRepos = repos
            .filter(repo => !repo.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);

        container.innerHTML = '';

        const reposToSkip = ['uwuclxdy', 'uwuweb', 'reverse-proxy-guide', 'website', ''];
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

    } catch (error) {
        console.error('Failed to fetch repos:', error);
        container.innerHTML = `
            <div class="project-loading">
                <p style="color: var(--ctp-red);">failed to load repos (github api is being mean)</p>
                <p style="font-size: 0.9rem; color: var(--ctp-overlay0); margin-top: 1rem;">
                    check the console or just visit
                    <a href="https://github.com/uwuclxdy" style="color: var(--primary);" target="_blank">github.com/uwuclxdy</a>
                </p>
            </div>
        `;
        updateStarBadge(0, true);
    }
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
        repo.topics.slice(0, 3).forEach(topic => {
            const tag = document.createElement('span');
            tag.className = 'topic-tag';
            tag.textContent = topic;
            topicsContainer.appendChild(tag);
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
                    alert('you found the secret! here\'s a cookie 🍪 (not really)');
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

    console.log('%c👋 hey there!', 'font-size: 20px; color: #E07B53; font-weight: bold;');
    console.log('%cits not a bug, its a feature:', 'font-size: 12px; color: #a6adc8; font-style: italic;');
});

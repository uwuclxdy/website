document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.querySelector('[data-content-viewport]');
    const sections = Array.from(document.querySelectorAll('[data-section]'));
    const primaryTabs = Array.from(document.querySelectorAll('[data-primary-tab]'));
    const secondaryContainer = document.querySelector('[data-nav-children]');
    const secondaryTabs = secondaryContainer ? Array.from(secondaryContainer.querySelectorAll('[data-subtab]')) : [];
    const linkControls = Array.from(document.querySelectorAll('[data-link-section]'));
    const copyTriggers = Array.from(document.querySelectorAll('[data-copy-text]'));
    const previewModal = document.querySelector('[data-preview-modal]');
    const previewImage = previewModal ? previewModal.querySelector('[data-preview-image]') : null;
    const previewCaption = previewModal ? previewModal.querySelector('[data-preview-caption]') : null;
    const previewDismissEls = previewModal ? Array.from(previewModal.querySelectorAll('[data-preview-dismiss]')) : [];
    const previewTriggers = Array.from(document.querySelectorAll('[data-preview-trigger]'));

    const sectionMeta = {
        home: { primary: 'home', level: 0, order: 0 },
        'osu-overview': { primary: 'osu', level: 1, order: 0 },
        'osu-skins': { primary: 'osu', level: 2, order: 0, parent: 'osu-overview' },
        'osu-tools': { primary: 'osu', level: 2, order: 1, parent: 'osu-overview' }
    };

    const primaryOrder = { home: 0, osu: 1 };

    const sectionRoutes = {
        home: '/',
        'osu-overview': '/osu',
        'osu-skins': '/osu',
        'osu-tools': '/osu'
    };

    const pathSectionMap = {
        '/': 'home',
        '/osu': 'osu-overview'
    };

    const normalizePath = (path = '/') => {
        if (!path) return '/';
        const trimmed = path.replace(/\/+$/, '');
        return trimmed || '/';
    };

    const getSectionFromPath = (path) => pathSectionMap[normalizePath(path)] || 'home';

    const syncHistoryWithSection = (sectionId, { suppressHistory = false, replaceHistory = false } = {}) => {
        if (suppressHistory || !window.history) return;
        const desiredPath = normalizePath(sectionRoutes[sectionId] || sectionRoutes.home);
        const currentPath = normalizePath(window.location.pathname);
        if (desiredPath === currentPath) return;
        const method = replaceHistory ? 'replaceState' : 'pushState';
        if (typeof window.history[method] !== 'function') return;
        window.history[method]({}, '', desiredPath);
    };

    let currentSectionId = getSectionFromPath(window.location.pathname);
    let isTransitioning = false;

    const getSection = (id) => sections.find(section => section.dataset.section === id);
    const releaseViewportHeight = () => {
        if (!viewport) return;
        viewport.style.height = '';
    };

    const toggleBodyScrollLock = (shouldLock) => {
        document.body.classList.toggle('is-modal-open', shouldLock);
    };

    let activePreviewTrigger = null;
    let previewIsOpen = false;

    const closePreviewModal = () => {
        if (!previewModal || !previewImage || !previewIsOpen) return;
        previewModal.classList.remove('is-visible');
        previewModal.setAttribute('aria-hidden', 'true');
        previewImage.src = '';
        previewImage.alt = '';
        if (previewCaption) {
            previewCaption.textContent = '';
            previewCaption.style.display = 'none';
        }
        const triggerToFocus = activePreviewTrigger;
        activePreviewTrigger = null;
        previewIsOpen = false;
        toggleBodyScrollLock(false);
        if (triggerToFocus) {
            triggerToFocus.focus();
        }
    };

    const openPreviewModal = ({ src, alt, label }) => {
        if (!previewModal || !previewImage) return;
        previewImage.src = src;
        previewImage.alt = alt || label || '';
        if (previewCaption) {
            const captionText = label || alt || '';
            previewCaption.textContent = captionText;
            previewCaption.style.display = captionText ? '' : 'none';
        }
        previewModal.classList.add('is-visible');
        previewModal.setAttribute('aria-hidden', 'false');
        previewModal.focus();
        previewIsOpen = true;
        toggleBodyScrollLock(true);
    };

    const determineDirection = (fromId, toId) => {
        if (fromId === toId) return 'forward';
        const fromMeta = sectionMeta[fromId] || sectionMeta.home;
        const toMeta = sectionMeta[toId] || sectionMeta.home;

        if (toMeta.parent === fromId) return 'forward';
        if (fromMeta.parent === toId) return 'backward';

        if (toMeta.level !== fromMeta.level) {
            return toMeta.level > fromMeta.level ? 'forward' : 'backward';
        }

        if (toMeta.primary !== fromMeta.primary) {
            const fromOrder = primaryOrder[fromMeta.primary] ?? 0;
            const toOrder = primaryOrder[toMeta.primary] ?? fromOrder;
            return toOrder >= fromOrder ? 'forward' : 'backward';
        }

        return (toMeta.order ?? 0) >= (fromMeta.order ?? 0) ? 'forward' : 'backward';
    };

    const updatePrimaryTabs = (activePrimary) => {
        primaryTabs.forEach(tab => {
            const isActive = tab.dataset.primaryTab === activePrimary;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive);
        });
    };

    const updateSecondaryTabs = (primaryKey, activeSectionId) => {
        if (!secondaryContainer) return;
        const relevantTabs = secondaryTabs.filter(tab => tab.dataset.parent === primaryKey);
        const hasChildren = relevantTabs.length > 0;

        secondaryContainer.classList.toggle('is-visible', hasChildren);
        secondaryContainer.setAttribute('aria-hidden', hasChildren ? 'false' : 'true');

        secondaryTabs.forEach(tab => {
            const shouldShow = tab.dataset.parent === primaryKey;
            const target = tab.dataset.targetSection;
            const isActive = shouldShow && target === activeSectionId;
            tab.style.display = shouldShow ? 'inline-flex' : 'none';
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive);
            tab.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        });
    };

    const finalizeState = (nextId) => {
        const meta = sectionMeta[nextId] || sectionMeta.home;
        currentSectionId = nextId;
        updatePrimaryTabs(meta.primary);
        updateSecondaryTabs(meta.primary, nextId);
    };

    const changeSectionInstant = (targetId, historyOptions = {}) => {
        const nextSection = getSection(targetId);
        if (!nextSection) return;
        sections.forEach(section => {
            const isActive = section === nextSection;
            section.classList.toggle('is-active', isActive);
            section.classList.remove('is-entering', 'is-exiting', 'slide-in-from-right', 'slide-in-from-left', 'slide-out-to-right', 'slide-out-to-left');
            section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
        finalizeState(targetId);
        syncHistoryWithSection(targetId, historyOptions);
        isTransitioning = false;
        releaseViewportHeight();
    };

    const activateSection = (targetId, { skipAnimation = false, suppressHistory = false, replaceHistory = false } = {}) => {
        const nextSection = getSection(targetId);
        const currentSection = getSection(currentSectionId);

        if (!nextSection) return;

        if (skipAnimation) {
            changeSectionInstant(targetId, { suppressHistory, replaceHistory });
            return;
        }

        if (isTransitioning) {
            return;
        }

        if (!currentSection || targetId === currentSectionId) {
            changeSectionInstant(targetId, { suppressHistory, replaceHistory });
            return;
        }

        isTransitioning = true;
        const currentHeight = currentSection ? currentSection.offsetHeight : viewport ? viewport.offsetHeight : 0;
        if (viewport && currentHeight) {
            viewport.style.height = `${currentHeight}px`;
        }
        const direction = determineDirection(currentSectionId, targetId);
        const enterClass = direction === 'backward' ? 'slide-in-from-left' : 'slide-in-from-right';
        const exitClass = direction === 'backward' ? 'slide-out-to-right' : 'slide-out-to-left';

        nextSection.classList.add('is-active', 'is-entering', enterClass);
        nextSection.setAttribute('aria-hidden', 'false');
        currentSection.classList.add('is-exiting', exitClass);
        if (viewport) {
            window.requestAnimationFrame(() => {
                viewport.style.height = `${nextSection.scrollHeight}px`;
            });
        }

        let enterDone = false;
        let exitDone = false;

        const checkCompletion = () => {
            if (enterDone && exitDone) {
                finalizeState(targetId);
                syncHistoryWithSection(targetId, { suppressHistory, replaceHistory });
                isTransitioning = false;
                releaseViewportHeight();
            }
        };

        const handleEnterEnd = () => {
            nextSection.classList.remove('is-entering', enterClass);
            enterDone = true;
            checkCompletion();
        };

        const handleExitEnd = () => {
            currentSection.classList.remove('is-exiting', exitClass, 'is-active');
            currentSection.setAttribute('aria-hidden', 'true');
            exitDone = true;
            checkCompletion();
        };

        nextSection.addEventListener('animationend', handleEnterEnd, { once: true });
        currentSection.addEventListener('animationend', handleExitEnd, { once: true });

        setTimeout(() => {
            if (!enterDone) handleEnterEnd();
            if (!exitDone) handleExitEnd();
        }, 650);
    };

    primaryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.disabled) return;
            const key = tab.dataset.primaryTab;
            if (key === 'osu') {
                activateSection('osu-overview');
                return;
            }
            activateSection(key);
        });
    });

    secondaryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.targetSection;
            if (target) {
                activateSection(target);
            }
        });
    });

    linkControls.forEach(control => {
        control.addEventListener('click', () => {
            activateSection(control.dataset.linkSection);
        });
    });

    copyTriggers.forEach(trigger => {
        trigger.addEventListener('click', event => {
            event.preventDefault();
            const text = trigger.dataset.copyText;
            if (!text) return;
            navigator.clipboard.writeText(text).catch(() => {});
        });
    });

    previewTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const img = trigger.querySelector('img');
            if (!img) return;
            activePreviewTrigger = trigger;
            openPreviewModal({
                src: img.currentSrc || img.src,
                alt: img.alt,
                label: trigger.dataset.previewLabel || img.alt
            });
        });
    });

    previewDismissEls.forEach(el => {
        el.addEventListener('click', () => {
            closePreviewModal();
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closePreviewModal();
        }
    });


    sections.forEach(section => {
        const isActive = section.dataset.section === currentSectionId;
        section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    changeSectionInstant(currentSectionId, { replaceHistory: true });

    window.addEventListener('popstate', () => {
        const target = getSectionFromPath(window.location.pathname);
        activateSection(target, { suppressHistory: true });
    });
});
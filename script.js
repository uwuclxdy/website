document.addEventListener('DOMContentLoaded', () => {
    // typing and deleting animation
    const commandElement = document.getElementById('command');
    const texts = ['fastfetch', 'sudo chmod -R a+rwx /', 'yay -Yc', 'git push --force', 'docker volume prune -f'];
    let currentTextIndex = 0;
    let isDeleting = false;
    let i = 0;

    function type() {
        const currentText = texts[currentTextIndex];

        if (!isDeleting) {
            // Typing
            commandElement.textContent = currentText.substring(0, i + 1);
            i++;
            if (i === currentText.length) {
                isDeleting = true;
                setTimeout(type, 5000); // Wait 5 seconds before deleting
            } else {
                setTimeout(type, 100); // Typing speed
            }
        } else {
            // Deleting
            commandElement.textContent = currentText.substring(0, i - 1);
            i--;
            if (i === 0) {
                isDeleting = false;
                currentTextIndex = (currentTextIndex + 1) % texts.length; // Switch to next text
                setTimeout(type, 500); // Short delay before typing next text
            } else {
                setTimeout(type, 50); // Deleting speed
            }
        }
    }

    // bleeding-edge particle system
    const particles = [];
    const numParticles = 30;
    const particleSpeedRange = 0.25;

    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.opacity = '1';

        const vx = (Math.random() * 2 - 1) * particleSpeedRange;
        const vy = (Math.random() * 2 - 1) * particleSpeedRange;
        const data = { element: particle, x, y, vx, vy, opacity: 1 };

        document.body.appendChild(particle);
        particles.push(data);
    }

    function spawnParticles() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        for (let i = 0; i < numParticles; i++) {
            createParticle(
                Math.random() * width,
                Math.random() * height
            );
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = window.innerWidth;
            if (p.x > window.innerWidth) p.x = 0;
            if (p.y < 0) p.y = window.innerHeight;
            if (p.y > window.innerHeight) p.y = 0;

            p.element.style.left = `${p.x}px`;
            p.element.style.top = `${p.y}px`;
            p.element.style.opacity = p.opacity < 0.2 ? p.opacity * 2 : p.opacity;
        }

        while (particles.length < numParticles) {
            createParticle(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight
            );
        }

        requestAnimationFrame(updateParticles);
    }

    spawnParticles();
    updateParticles();
    setTimeout(type, 2500); // Start typing after a short delay
});

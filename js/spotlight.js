/**
 * Spotlight Effect - Mouse Position Tracker
 * Sets --spotlight-x and --spotlight-y custom properties on cards for radial gradient effect.
 * Purely visual — no interaction with app logic.
 * Respects prefers-reduced-motion.
 */
(function() {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll('.dash-card');
    if (!cards.length) return;

    document.addEventListener('mousemove', (e) => {
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            card.style.setProperty('--spotlight-x', x + '%');
            card.style.setProperty('--spotlight-y', y + '%');
        });
    });

    document.addEventListener('mouseleave', () => {
        cards.forEach(card => {
            card.style.setProperty('--spotlight-x', '50%');
            card.style.setProperty('--spotlight-y', '50%');
        });
    });
})();
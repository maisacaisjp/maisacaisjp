import React, { useEffect } from 'react';

// SVG 1: Fantasminha Normal (cursor padrão)
const GHOST_DEFAULT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M7 13C7 7.5 11 4 16 4C21 4 25 7.5 25 13V24C25 25 24 26 23 25C21.5 23.5 20.5 24 19 25C17.5 26 16.5 24.5 15 25C13.5 25.5 12.5 24 11 25C9.5 26 8.5 24.5 7 24.8V13Z" fill="%233b0764" opacity="0.25" transform="translate(1, 2)"/><path d="M7 13C7 7.5 11 4 16 4C21 4 25 7.5 25 13V24C24 25.5 22.5 24.5 21 23.5C19.5 22.5 18.5 24.5 17 23.5C15.5 22.5 14.5 24.5 13 23.5C11.5 22.5 10 24.5 9 23.5C8 22.5 7 24 7 24V13Z" fill="%23FFFFFF" stroke="%234d0471" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10.5" cy="14" r="1.6" fill="%23f472b6" opacity="0.8"/><circle cx="21.5" cy="14" r="1.6" fill="%23f472b6" opacity="0.8"/><ellipse cx="12" cy="12" rx="1.3" ry="1.8" fill="%231e1b4b"/><ellipse cx="20" cy="12" rx="1.3" ry="1.8" fill="%231e1b4b"/><circle cx="11.5" cy="11.2" r="0.6" fill="%23FFFFFF"/><circle cx="19.5" cy="11.2" r="0.6" fill="%23FFFFFF"/><path d="M14.5 14.5C15 15.6 17 15.6 17.5 14.5" stroke="%231e1b4b" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 15C5 14.5 4.5 16 5.5 17" stroke="%234d0471" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M4 2L5 4.5L7.5 5.5L5 6.5L4 9L3 6.5L0.5 5.5L3 4.5Z" fill="%23a855f7"/><circle cx="4" cy="5.5" r="0.8" fill="%23FFFFFF"/></svg>`;

// SVG 2: Fantasminha Feliz e Empolgado (ao passar por botões, links e cards clicáveis)
const GHOST_POINTER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M7 12C7 6.5 11 3 16 3C21 3 25 6.5 25 12V23C25 24 24 25 23 24C21.5 22.5 20.5 23 19 24C17.5 25 16.5 23.5 15 24C13.5 24.5 12.5 23 11 24C9.5 25 8.5 23.5 7 23.8V12Z" fill="%233b0764" opacity="0.3" transform="translate(1, 2)"/><path d="M7 12C7 6.5 11 3 16 3C21 3 25 6.5 25 12V23C24 24.5 22.5 23.5 21 22.5C19.5 21.5 18.5 23.5 17 22.5C15.5 21.5 14.5 23.5 13 22.5C11.5 21.5 10 23.5 9 22.5C8 21.5 7 23 7 23V12Z" fill="%23FFFFFF" stroke="%236a2092" stroke-width="1.8" stroke-linejoin="round"/><circle cx="10" cy="13" r="2" fill="%23ec4899" opacity="0.85"/><circle cx="22" cy="13" r="2" fill="%23ec4899" opacity="0.85"/><path d="M10.5 11.5C11.2 10.3 12.8 10.3 13.5 11.5" stroke="%234d0471" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M18.5 11.5C19.2 10.3 20.8 10.3 21.5 11.5" stroke="%234d0471" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M14 13.5C14 15.8 18 15.8 18 13.5" fill="%23ec4899" stroke="%234d0471" stroke-width="1.1" stroke-linecap="round"/><path d="M5.5 12C4 10.5 3.5 12 4.5 13.5" stroke="%236a2092" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M26.5 12C28 10.5 28.5 12 27.5 13.5" stroke="%236a2092" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M4 2L5.5 4.5L8 5.5L5.5 6.5L4 9L2.5 6.5L0 5.5L2.5 4.5Z" fill="%23ec4899"/><circle cx="4" cy="5.5" r="1.1" fill="%23FFFFFF"/></svg>`;

export const isGhostMonthActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Permite forçar via ?ghost=true ou desativar via ?ghost=false na URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('ghost') === 'true' || params.get('ghost') === '1') return true;
  if (params.get('ghost') === 'false' || params.get('ghost') === '0') return false;

  const now = new Date();
  const month = now.getMonth(); // 10 = Novembro (0-indexed)
  const day = now.getDate();

  // Ativo durante todo o mês de Novembro e no dia de Halloween (31 de Outubro)
  return month === 10 || (month === 9 && day >= 31);
};

export default function GhostCursor() {
  useEffect(() => {
    if (!isGhostMonthActive()) return;

    // Apenas aplica em dispositivos com mouse/ponteiro de precisão (não afeta touch mobile)
    const isPointerFine = window.matchMedia('(pointer: fine)').matches;
    if (!isPointerFine) return;

    // Injeta estilo CSS de cursor em toda a página do cardápio
    const styleEl = document.createElement('style');
    styleEl.id = 'mais-acai-ghost-cursor-style';
    styleEl.innerHTML = `
      @media (pointer: fine) {
        html, body, button, a, input, select, textarea, [role="button"], .cursor-pointer {
          cursor: url("${GHOST_DEFAULT_SVG}") 4 5, auto !important;
        }
        a, button, [role="button"], input[type="button"], input[type="submit"], select, label, .cursor-pointer, [tabindex]:not([tabindex="-1"]) {
          cursor: url("${GHOST_POINTER_SVG}") 4 5, pointer !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // Efeito sutil e leve de mini-partículas de brilho mágico ao mover o mouse
    let lastDropTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Limita taxa de emissão para 65ms (alta performance, sem lag)
      if (now - lastDropTime < 65) return;
      lastDropTime = now;

      const particle = document.createElement('span');
      particle.className = 'pointer-events-none fixed select-none z-[99999] transition-all duration-700 ease-out';
      
      const colors = ['#a855f7', '#ec4899', '#c084fc', '#f472b6', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.floor(Math.random() * 4) + 4; // 4px a 7px
      
      particle.style.left = `${e.clientX + (Math.random() * 8 - 4)}px`;
      particle.style.top = `${e.clientY + (Math.random() * 8 + 8)}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.borderRadius = '50%';
      particle.style.boxShadow = `0 0 6px ${color}`;
      particle.style.opacity = '0.85';
      particle.style.transform = 'translate(-50%, -50%) scale(1)';

      document.body.appendChild(particle);

      // Animação de subida e desvanecimento suave
      requestAnimationFrame(() => {
        particle.style.opacity = '0';
        particle.style.transform = `translate(-50%, -${16 + Math.random() * 12}px) scale(0.3)`;
      });

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 700);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      const existingStyle = document.getElementById('mais-acai-ghost-cursor-style');
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  return null;
}


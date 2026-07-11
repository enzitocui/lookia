/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Compass, 
  Shirt, 
  Camera, 
  User,
  ChevronRight,
  Edit3,
  Moon,
  Sun
} from 'lucide-react';
import LogoImg from '../logo/Logo.png';

const CATEGORIES = [
  'Boho',
  'Y2K',
  'E-Girl',
  'Gotico',
  'Grunge',
  'Vintage',
  'Deportivo',
  'Formal',
  'Old Money'
];

const ITEMS: { id: number; category: string; url: string; description: string }[] = [
  // Boho
  { id: 1, category: 'Boho', url: 'https://i.pinimg.com/1200x/91/a2/96/91a2960dd3e657388574b8f8287c6d84.jpg', description: 'Boho Outfit' },
  { id: 2, category: 'Boho', url: 'https://i.pinimg.com/736x/7e/d3/4b/7ed34b1777f5e6c9901a2fbf7674b60f.jpg', description: 'Boho Outfit' },
  { id: 3, category: 'Boho', url: 'https://i.pinimg.com/736x/8e/3d/87/8e3d87091241cdb544e1f0baea2a33dd.jpg', description: 'Boho Outfit' },
  { id: 4, category: 'Boho', url: 'https://i.pinimg.com/1200x/78/20/5f/78205f496aed0104e3729d5ff918406c.jpg', description: 'Boho Outfit' },
  { id: 5, category: 'Boho', url: 'https://i.pinimg.com/736x/67/3b/e0/673be08e71fc3f14d2b21d7c376e5658.jpg', description: 'Boho Outfit' },
  { id: 6, category: 'Boho', url: 'https://i.pinimg.com/736x/18/6c/b3/186cb36c21a0ea6887fc380d1fa5a563.jpg', description: 'Boho Outfit' },
  { id: 7, category: 'Boho', url: 'https://i.pinimg.com/736x/22/59/cb/2259cb68e372a6ffbc6edd31db94c2ce.jpg', description: 'Boho Outfit' },
  { id: 8, category: 'Boho', url: 'https://i.pinimg.com/1200x/e5/86/24/e58624d868861ab15b5284287315ecb6.jpg', description: 'Boho Outfit' },

  // Y2K
  { id: 9, category: 'Y2K', url: 'https://i.pinimg.com/736x/e0/f6/7a/e0f67afe1758672dccdf508cd07e1231.jpg', description: 'Y2K Outfit' },
  { id: 10, category: 'Y2K', url: 'https://i.pinimg.com/1200x/42/7a/44/427a44ed789d5af1cff6423961d09c8d.jpg', description: 'Y2K Outfit' },
  { id: 11, category: 'Y2K', url: 'https://i.pinimg.com/736x/96/a5/b7/96a5b7551f1f750d31291fb7475df307.jpg', description: 'Y2K Outfit' },
  { id: 12, category: 'Y2K', url: 'https://i.pinimg.com/736x/31/fd/a7/31fda775811ad2f92e7d087b36cce2bc.jpg', description: 'Y2K Outfit' },
  { id: 13, category: 'Y2K', url: 'https://i.pinimg.com/736x/49/f4/fb/49f4fba5f0864ec3bef3b428a97d6155.jpg', description: 'Y2K Outfit' },
  { id: 14, category: 'Y2K', url: 'https://i.pinimg.com/736x/5c/8d/fd/5c8dfdc4cdca3b5de8181fb8efd140dc.jpg', description: 'Y2K Outfit' },
  { id: 15, category: 'Y2K', url: 'https://i.pinimg.com/736x/df/a7/32/dfa732cefb321a04e94aafbe3f4d716d.jpg', description: 'Y2K Outfit' },
  { id: 16, category: 'Y2K', url: 'https://i.pinimg.com/736x/bf/e2/63/bfe263f48aaa8299e1f7d8025894b6ad.jpg', description: 'Y2K Outfit' },

  // E-Girl
  { id: 17, category: 'E-Girl', url: 'https://i.pinimg.com/736x/70/7e/04/707e04e6b011dc9bc1e56e61a8f58807.jpg', description: 'E-Girl Outfit' },
  { id: 18, category: 'E-Girl', url: 'https://i.pinimg.com/736x/90/94/73/909473b754a8c05efe1b8c7a9460b9aa.jpg', description: 'E-Girl Outfit' },
  { id: 19, category: 'E-Girl', url: 'https://i.pinimg.com/1200x/0a/81/fe/0a81fe546d2f206bb463ba8e7e6999be.jpg', description: 'E-Girl Outfit' },
  { id: 20, category: 'E-Girl', url: 'https://i.pinimg.com/736x/a8/0d/a4/a80da487419066e6b7c56ed38dfee0d5.jpg', description: 'E-Girl Outfit' },
  { id: 21, category: 'E-Girl', url: 'https://i.pinimg.com/736x/78/ea/da/78eada8fc5612cbee22a938f50616229.jpg', description: 'E-Girl Outfit' },
  { id: 22, category: 'E-Girl', url: 'https://i.pinimg.com/736x/37/2e/2d/372e2d47d87c862802a8d7918858ee7b.jpg', description: 'E-Girl Outfit' },

  // Gotico
  { id: 23, category: 'Gotico', url: 'https://i.pinimg.com/736x/63/93/08/639308c5f5de52ab71e65fb98d051dd9.jpg', description: 'Gotico Outfit' },
  { id: 24, category: 'Gotico', url: 'https://i.pinimg.com/736x/34/53/a4/3453a46db9420486e646bf5d5b507739.jpg', description: 'Gotico Outfit' },
  { id: 25, category: 'Gotico', url: 'https://i.pinimg.com/736x/59/8c/6b/598c6bb9e41b27b32c3f07aa3260f43a.jpg', description: 'Gotico Outfit' },
  { id: 26, category: 'Gotico', url: 'https://i.pinimg.com/1200x/c2/0d/cb/c20dcb46e17febbfeb0a5aaac79e57d2.jpg', description: 'Gotico Outfit' },
  { id: 27, category: 'Gotico', url: 'https://i.pinimg.com/736x/7e/a3/7e/7ea37e0c95836d9d10bef0def58062f2.jpg', description: 'Gotico Outfit' },
  { id: 28, category: 'Gotico', url: 'https://i.pinimg.com/736x/63/61/cd/6361cdafa6d81719f7c45e8d8c829cf3.jpg', description: 'Gotico Outfit' },
  { id: 29, category: 'Gotico', url: 'https://i.pinimg.com/736x/9c/e7/4b/9ce74b9d76d5d3362ed97fba792a0c87.jpg', description: 'Gotico Outfit' },
  { id: 30, category: 'Gotico', url: 'https://i.pinimg.com/736x/7d/27/5f/7d275fc2b33e3d42703c1d73f15cb5f6.jpg', description: 'Gotico Outfit' },

  // Grunge
  { id: 31, category: 'Grunge', url: 'https://i.pinimg.com/736x/d9/00/73/d90073fab42a20686f5d47a2968fbfec.jpg', description: 'Grunge Outfit' },
  { id: 32, category: 'Grunge', url: 'https://i.pinimg.com/736x/51/a4/20/51a420518703622e36a9307cefe7a47b.jpg', description: 'Grunge Outfit' },
  { id: 33, category: 'Grunge', url: 'https://i.pinimg.com/736x/34/2f/db/342fdba583f8b63e70412c7d83df3aed.jpg', description: 'Grunge Outfit' },
  { id: 34, category: 'Grunge', url: 'https://i.pinimg.com/736x/2b/61/6c/2b616cf8d49b2e9f429c541c07ce68f4.jpg', description: 'Grunge Outfit' },

  // Vintage
  { id: 35, category: 'Vintage', url: 'https://i.pinimg.com/736x/c0/30/41/c03041389cb6feb8a16ca9b02e4a9541.jpg', description: 'Vintage Outfit' },
  { id: 36, category: 'Vintage', url: 'https://i.pinimg.com/1200x/45/4a/51/454a51469320e216d1817d15a810f861.jpg', description: 'Vintage Outfit' },
  { id: 37, category: 'Vintage', url: 'https://i.pinimg.com/736x/d3/50/32/d35032ea9529dd9144558040c0e20c9a.jpg', description: 'Vintage Outfit' },
  { id: 38, category: 'Vintage', url: 'https://i.pinimg.com/736x/5b/b2/79/5bb2793098c37d881dded9251efafd3b.jpg', description: 'Vintage Outfit' },
  { id: 39, category: 'Vintage', url: 'https://i.pinimg.com/1200x/e4/f4/01/e4f40139c7312bc834f95a16a85ab19c.jpg', description: 'Vintage Outfit' },
  { id: 40, category: 'Vintage', url: 'https://i.pinimg.com/736x/76/d8/b1/76d8b1154db2949156ad9fbef623e229.jpg', description: 'Vintage Outfit' },
  { id: 41, category: 'Vintage', url: 'https://i.pinimg.com/736x/49/6f/c7/496fc7a6a67ec25c2592b725f4dea7c9.jpg', description: 'Vintage Outfit' },
  { id: 42, category: 'Vintage', url: 'https://i.pinimg.com/1200x/c0/4b/eb/c04beb8a9a617260fd3318289ed8e325.jpg', description: 'Vintage Outfit' },

  // Deportivo
  { id: 43, category: 'Deportivo', url: 'https://i.pinimg.com/736x/71/e3/4b/71e34bacf24b63f96d82aebd2576fc7a.jpg', description: 'Deportivo Outfit' },
  { id: 44, category: 'Deportivo', url: 'https://i.pinimg.com/736x/da/36/65/da3665ae83ea24edd984cfcea8163cf2.jpg', description: 'Deportivo Outfit' },
  { id: 45, category: 'Deportivo', url: 'https://i.pinimg.com/1200x/aa/00/ae/aa00ae576cb4166e69f7dd1d6588f4a9.jpg', description: 'Deportivo Outfit' },
  { id: 46, category: 'Deportivo', url: 'https://i.pinimg.com/736x/bc/a3/68/bca368b1357d69bb9e291f6ffd1fc222.jpg', description: 'Deportivo Outfit' },
  { id: 47, category: 'Deportivo', url: 'https://i.pinimg.com/736x/07/de/82/07de82424abb236e7db417f2065d56d4.jpg', description: 'Deportivo Outfit' },
  { id: 48, category: 'Deportivo', url: 'https://i.pinimg.com/736x/f3/a6/d8/f3a6d899c3d6a8625b475ad802a36b16.jpg', description: 'Deportivo Outfit' },
  { id: 49, category: 'Deportivo', url: 'https://i.pinimg.com/736x/2e/d5/e2/2ed5e2f79f87362acfbca73eb99c481f.jpg', description: 'Deportivo Outfit' },
  { id: 50, category: 'Deportivo', url: 'https://i.pinimg.com/736x/d8/d6/71/d8d671829f460e84c0966b0abfba5e3f.jpg', description: 'Deportivo Outfit' },

  // Formal
  { id: 51, category: 'Formal', url: 'https://i.pinimg.com/736x/db/99/09/db9909c0a398b8dec866f412f97fa29e.jpg', description: 'Formal Outfit' },
  { id: 52, category: 'Formal', url: 'https://i.pinimg.com/736x/b6/ba/2d/b6ba2df0553e56c00ba09e3c839cfc5d.jpg', description: 'Formal Outfit' },
  { id: 53, category: 'Formal', url: 'https://i.pinimg.com/736x/07/9f/c6/079fc6fb462e26b897c2e73960397f2c.jpg', description: 'Formal Outfit' },
  { id: 54, category: 'Formal', url: 'https://i.pinimg.com/736x/69/7c/bc/697cbc94768203f721c8949ca3743392.jpg', description: 'Formal Outfit' },
  { id: 55, category: 'Formal', url: 'https://i.pinimg.com/736x/bc/15/a6/bc15a69ef674faf72aeb0607c0e9f0c4.jpg', description: 'Formal Outfit' },
  { id: 56, category: 'Formal', url: 'https://i.pinimg.com/1200x/10/15/fc/1015fcf35a260c1ab7e5c2677063d2e9.jpg', description: 'Formal Outfit' },
  { id: 57, category: 'Formal', url: 'https://i.pinimg.com/736x/ba/86/7b/ba867b94aa8438d30d934173fd0ba194.jpg', description: 'Formal Outfit' },
  { id: 58, category: 'Formal', url: 'https://i.pinimg.com/736x/0c/52/1c/0c521c73339c8259d103ce6f1eacd52f.jpg', description: 'Formal Outfit' },

  // Old Money
  { id: 59, category: 'Old Money', url: 'https://i.pinimg.com/736x/66/f3/9c/66f39c6c2428234104926ea6279c6ea9.jpg', description: 'Old Money Outfit' },
  { id: 60, category: 'Old Money', url: 'https://i.pinimg.com/736x/dd/01/a3/dd01a3877e7f8d337af68be26f91e12a.jpg', description: 'Old Money Outfit' },
  { id: 61, category: 'Old Money', url: 'https://i.pinimg.com/736x/95/a1/08/95a1084239826a0756c561755ba405f9.jpg', description: 'Old Money Outfit' },
  { id: 62, category: 'Old Money', url: 'https://i.pinimg.com/736x/1b/4b/75/1b4b75e0a2d444b3a6e0218729be97bc.jpg', description: 'Old Money Outfit' },
  { id: 63, category: 'Old Money', url: 'https://i.pinimg.com/736x/8a/db/ca/8adbca281bc3cfbf331ffd76a9933a90.jpg', description: 'Old Money Outfit' },
  { id: 64, category: 'Old Money', url: 'https://i.pinimg.com/736x/8a/07/bc/8a07bc6fc1c4b56f65ecdd549c3e6483.jpg', description: 'Old Money Outfit' },
  { id: 65, category: 'Old Money', url: 'https://i.pinimg.com/736x/98/37/04/983704d100d85e8646a9a09f28b1b957.jpg', description: 'Old Money Outfit' },
  { id: 66, category: 'Old Money', url: 'https://i.pinimg.com/736x/4e/94/55/4e9455e3bfd13b905e2b135b36ce9d45.jpg', description: 'Old Money Outfit' },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeNav, setActiveNav] = useState('compass');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const firstSidebarItemRef = useRef<HTMLButtonElement | null>(null);

  const filteredItems = ITEMS.filter(item => item.category === activeCategory || activeCategory === 'All');

  const handleSidebarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
    }
    if (event.key !== 'Tab' || !sidebarRef.current) {
      return;
    }

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => el.offsetParent !== null);

    if (!focusable.length) {
      return;
    }

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    }

    if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  useEffect(() => {
    if (menuOpen) {
      firstSidebarItemRef.current?.focus();
    }
  }, [menuOpen]);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('lookia-theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lookia-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    let active = true;

    const stopCamera = () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Cámara no compatible');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } catch (error) {
        setCameraError('No se pudo acceder a la cámara');
      }
    };

    if (activeNav === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [activeNav]);

  return (
    <div className="min-h-screen app-shell selection:bg-secondary/30 overflow-x-hidden">
      {/* Off-canvas Sidebar */}
      <aside
        id="sidebar"
        ref={sidebarRef}
        onKeyDown={handleSidebarKeyDown}
        aria-hidden={!menuOpen}
        aria-label="Menú lateral de navegación"
        className={`sidebar-panel fixed inset-y-0 left-0 z-40 w-[min(18rem,80vw)] border-r border-white/10 bg-background/95 text-primary px-5 pt-6 pb-8 transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="sidebar-brand-block relative w-full mb-6">
          <button
            onClick={() => setMenuOpen(false)}
            className="icon-button absolute right-0 top-0 rounded-full p-2 text-secondary"
            aria-label="Cerrar menú"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>

          <div className="sidebar-logo-wrapper flex flex-col items-center">
            <img src={LogoImg} alt="Lookia logo" className="sidebar-logo object-contain" />
            <h2 className="mt-4 logo-brand">LOOKIA</h2>
          </div>
        </div>

        <div className="sidebar-scroll-area flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          <nav className="sidebar-nav mb-6 flex flex-col gap-2" aria-label="Navegación principal">
          <button
            ref={firstSidebarItemRef}
            onClick={() => { setActiveNav('compass'); setMenuOpen(false); }}
            className={`sidebar-menu-item ${activeNav === 'compass' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
          >
            <Compass size={18} />
            Explorar
          </button>
          <button
            onClick={() => { setSubmenuOpen(prev => !prev); }}
            className={`sidebar-menu-item ${submenuOpen ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
            aria-expanded={submenuOpen}
            aria-controls="submenu-ropo"
          >
            <span className="flex items-center gap-3">
              <Shirt size={18} />
              Ropero
            </span>
            <ChevronRight size={18} className={`${submenuOpen ? 'rotate-90' : ''} transition-transform duration-200`} />
          </button>
          {submenuOpen && (
            <div id="submenu-ropo" className="mt-2 ml-4 flex flex-col gap-2">
              <button
                onClick={() => { setActiveNav('mi-ropa'); setMenuOpen(false); setSubmenuOpen(false); }}
                className={`sidebar-menu-item ${activeNav === 'mi-ropa' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-xl px-3 py-2 font-body sidebar-menu-subitem`}
              >
                Mi ropa
              </button>
              <button
                onClick={() => { setActiveNav('mis-outfits'); setMenuOpen(false); setSubmenuOpen(false); }}
                className={`sidebar-menu-item ${activeNav === 'mis-outfits' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-xl px-3 py-2 font-body sidebar-menu-subitem`}
              >
                Mis outfits
              </button>
            </div>
          )}
          <button
            onClick={() => { setActiveNav('camera'); setMenuOpen(false); }}
            className={`sidebar-menu-item ${activeNav === 'camera' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
          >
            <Camera size={18} />
            Subir
          </button>
          <button
            onClick={() => { setActiveNav('user'); setMenuOpen(false); }}
            className={`sidebar-menu-item ${activeNav === 'user' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
          >
            <User size={18} />
            Perfil
          </button>
        </nav>

        
        <div className="flex-grow" />

        <div className="mt-auto pt-6">
          <div className="w-full h-px bg-white/5 mb-3" />
          <div className="text-center sidebar-footer">
            <div className="mb-1">LOOKIA v1.0</div>
          </div>
        </div>
      </div>
      </aside>

      <div className={`min-h-screen transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${menuOpen ? 'translate-x-[min(18rem,80vw)]' : 'translate-x-0'}`}>
        {/* Top App Bar */}
        <header className="app-bar fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 flex items-center justify-center relative">
          <div className="absolute left-4 sm:left-6">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="icon-button p-2 -ml-2 text-secondary rounded-full"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="sidebar"
            >
              <Menu size={24} />
            </button>
          </div>
          <h1 className="font-headline font-extrabold app-header-logo logo-brand tracking-tighter uppercase">
            LOOKIA
          </h1>
          <div className="absolute right-4 sm:right-6">
            <button
              onClick={toggleTheme}
              className="icon-button p-2 -mr-2 text-secondary rounded-full"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
          </div>
        </header>

      {/* Main Content */}
      <main className={`${activeNav === 'camera' ? 'pt-0 pb-0 px-0 w-screen' : 'pt-0 pb-20 sm:pb-28 px-4 sm:px-5 lg:px-6 max-w-[1280px]'} mx-auto editorial-gradient`}>

        {activeNav === 'camera' ? (
          <section className="relative w-screen h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] flex items-center justify-center px-4">
            <div className="w-full h-full rounded-3xl overflow-hidden bg-surface">
              <video
                ref={videoRef}
                className="w-full h-full object-cover bg-surface"
                autoPlay
                muted
                playsInline
              />
            </div>
            <button
              onClick={() => {
                // TODO: Implement photo capture functionality
                if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  if (context && videoRef.current?.videoWidth && videoRef.current?.videoHeight) {
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    context.drawImage(videoRef.current, 0, 0);
                    const imageData = canvas.toDataURL('image/jpeg');
                    console.log('Photo captured:', imageData);
                    // Save to state or local storage for future processing
                  }
                }
              }}
              className="btn-accent absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full p-4 shadow-lg"
              aria-label="Capturar foto"
            >
              <Camera size={28} />
            </button>
          </section>
        ) : activeNav === 'mi-ropa' ? (
          <section className="space-y-6">
            <div className="panel rounded-3xl p-6">
              <h2 className="font-headline text-4xl text-secondary mb-3">Mi ropa</h2>
              <p className="font-body text-muted text-sm mb-6">Aquí verás tus prendas guardadas.</p>
              <div className="dashed-panel rounded-3xl p-8 flex items-center justify-center">
                <p className="text-secondary text-center">No hay prendas guardadas aún.</p>
              </div>
            </div>
          </section>
        ) : activeNav === 'mis-outfits' ? (
          <section className="space-y-6">
            <div className="panel rounded-3xl p-6">
              <h2 className="font-headline text-4xl text-secondary mb-3">Mis outfits</h2>
              <p className="font-body text-muted text-sm mb-6">Combina tus prendas y guarda tus looks favoritos.</p>
              <div className="dashed-panel rounded-3xl p-8 flex items-center justify-center">
                <p className="text-secondary text-center">No hay outfits guardados aún.</p>
              </div>
            </div>
          </section>
        ) : activeNav === 'user' ? (
          <section className="space-y-6">
            <div className="rounded-3xl bg-surface-container p-6 shadow-2xl max-w-3xl mx-auto">
              <h2 className="font-headline text-4xl text-secondary mb-3 text-center">Perfil</h2>
              <p className="font-body text-primary text-sm opacity-80 mb-6 text-center">
                Accede a tu información, ajustes y preferencias de estilo.
              </p>

              <div className="flex flex-col items-center gap-4 px-4 sm:px-0">
                <div className="relative">
                  <button className="group relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-surface-container border-2 border-white/6 flex items-center justify-center transition-all duration-300 hover:shadow-lg focus:outline-none avatar-gradient">
                    <span className="sr-only">Editar foto de perfil</span>
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-background/30 to-surface-container" />
                    <Edit3 className="absolute right-3 bottom-3 w-7 h-7 text-secondary bg-background/60 p-1 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                </div>

                <div className="w-full flex justify-center">
                  <button className="mt-2 px-5 py-2 rounded-2xl btn-outline">Editar foto</button>
                </div>

                <div className="w-full mt-2 px-0">
                  <div className="rounded-2xl bg-background/70 p-4 panel-alt">
                    <p className="text-xs uppercase tracking-[0.35em] text-secondary/70 mb-3">Info</p>
                    <div className="grid gap-3">
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                        <span className="text-secondary/70 text-sm mr-3 truncate">Nombre de usuario</span>
                        <span className="text-primary font-semibold truncate text-right min-w-0">NombreUsuario</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                        <span className="text-secondary/70 text-sm mr-3 truncate">Nombre real</span>
                        <span className="text-primary font-semibold truncate text-right min-w-0">Nombre Real</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                        <span className="text-secondary/70 text-sm mr-3 truncate">Correo</span>
                        <span className="text-primary font-semibold truncate text-right min-w-0">lookia.user@example.com</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                        <span className="text-secondary/70 text-sm mr-3 truncate">Contraseña</span>
                        <span className="text-primary font-semibold truncate text-right min-w-0">••••••••</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center mt-4">
                    <button className="px-6 py-2 rounded-2xl btn-accent font-semibold">Editar info</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex-nowrap categories-row">
              {CATEGORIES.map((cat, idx) => (
                <motion.button
                  key={cat}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`category-pill ${activeCategory === cat ? 'category-pill--active' : 'category-pill--inactive'}`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            {/* Horizontal Responsive Grid */}
            <div className="explore-grid">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="explore-grid-item group relative rounded-2xl overflow-hidden bg-surface-container shadow-2xl"
                  >
                    <img 
                      src={item.url} 
                      alt={item.description}
                      referrerPolicy="no-referrer"
                      className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <p className="text-secondary text-xs uppercase tracking-widest font-bold">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
}

function NavButton({ icon, active = false, onClick }: { icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`nav-icon ${active ? 'nav-icon--active' : 'nav-icon--inactive'}`}>
      {icon}
    </button>
  );
}



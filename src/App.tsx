/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import outfits from './data/outfits.json';
import {
  Menu,
  Compass,
  Shirt,
  Camera,
  Check,
  FileImage,
  User,
  Upload,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Moon,
  Sun
} from 'lucide-react';
import LogoImg from '../logo/Logo.png';

const CATEGORY_SEARCHES = {
  Boho: 'boho outfit fashion',
  Y2K: 'Y2K outfit fashion',
  'E-Girl': 'e-girl outfit fashion',
  Gotico: 'gothic outfit fashion',
  Grunge: 'grunge outfit fashion',
  Vintage: 'vintage outfit fashion',
  Deportivo: 'sporty outfit fashion',
  Formal: 'formal outfit fashion',
  'Old Money': 'old money outfit fashion',
  Cottagecore: 'cottagecore outfit fashion',
  Coquette: 'coquette outfit fashion',
  Casual: 'casual outfit fashion',
  Punk: 'punk outfit fashion',
  Fairycore: 'fairycore outfit fashion',
  Cosplay: 'cosplay outfit fashion'
} as const;

type Category = keyof typeof CATEGORY_SEARCHES;

const CATEGORIES = Object.keys(CATEGORY_SEARCHES) as Category[];

type ExploreItem = {
  id: number | string;
  category: string;
  url: string;
  description: string;
};

const localItems = outfits as ExploreItem[];

const shuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const shuffledItemsByCategory = CATEGORIES.reduce<Record<Category, ExploreItem[]>>((items, category) => {
  items[category] = shuffle(localItems.filter(item => item.category === category && item.url.startsWith('http')));
  return items;
}, {} as Record<Category, ExploreItem[]>);

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeNav, setActiveNav] = useState('compass');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'camera' | 'file'>('choose');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);
  const [cameraCaptureUrl, setCameraCaptureUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const firstSidebarItemRef = useRef<HTMLButtonElement | null>(null);
  const categoryRowRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<number | string>>(() => new Set());

  const filteredItems = shuffledItemsByCategory[activeCategory]
    .filter(item => !failedImageIds.has(item.id));

  useEffect(() => {
    const categoryRow = categoryRowRef.current;
    if (!categoryRow) {
      setCanScrollCategoriesLeft(false);
      setCanScrollCategoriesRight(false);
      return;
    }

    const updateCategoryScrollState = () => {
      const maxScrollLeft = categoryRow.scrollWidth - categoryRow.clientWidth;
      setCanScrollCategoriesLeft(categoryRow.scrollLeft > 1);
      setCanScrollCategoriesRight(maxScrollLeft - categoryRow.scrollLeft > 1);
    };

    const resizeObserver = new ResizeObserver(updateCategoryScrollState);
    categoryRow.addEventListener('scroll', updateCategoryScrollState, { passive: true });
    resizeObserver.observe(categoryRow);
    updateCategoryScrollState();

    return () => {
      categoryRow.removeEventListener('scroll', updateCategoryScrollState);
      resizeObserver.disconnect();
    };
  }, [activeNav]);

  const scrollCategories = (direction: 'left' | 'right') => {
    categoryRowRef.current?.scrollBy({
      left: direction === 'right' ? categoryRowRef.current.clientWidth * 0.75 : -categoryRowRef.current.clientWidth * 0.75,
      behavior: 'smooth'
    });
  };

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

    if (activeNav === 'camera' && uploadMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [activeNav, uploadMode]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCameraError('Elegí una imagen JPG, PNG o WEBP');
      return;
    }

    setCameraError(null);
    setUploadConfirmed(false);
    setFilePreviewUrl(URL.createObjectURL(file));
    setUploadMode('file');
  };

  const selectUploadMode = (mode: 'camera' | 'file') => {
    setCameraError(null);
    setCameraCaptureUrl(null);
    setUploadConfirmed(false);
    if (mode === 'file') {
      openFilePicker();
      return;
    }
    setUploadMode(mode);
  };

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
            onClick={() => { setActiveNav('camera'); setUploadMode('choose'); setFilePreviewUrl(null); setCameraCaptureUrl(null); setMenuOpen(false); }}
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
          <section className={`upload-page ${uploadMode === 'camera' ? 'upload-page--camera' : ''}`}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileChange} />

            {uploadMode === 'choose' ? (
              <div className="upload-choice panel rounded-3xl">
                <div className="upload-heading">
                  <span className="section-label">Subir</span>
                  <h2 className="font-headline">¿Qué querés hacer?</h2>
                  <p className="text-muted">Elegí cómo querés agregar una nueva prenda.</p>
                </div>
                <div className="upload-options">
                  <button type="button" className="upload-option" onClick={() => selectUploadMode('file')}>
                    <span className="upload-option-icon"><Upload size={28} /></span>
                    <span><strong>Subir un archivo</strong><small>Elegí una imagen de tu dispositivo</small></span>
                    <FileImage size={20} className="upload-option-arrow" />
                  </button>
                  <button type="button" className="upload-option" onClick={() => selectUploadMode('camera')}>
                    <span className="upload-option-icon"><Camera size={28} /></span>
                    <span><strong>Usar la cámara</strong><small>Tomá una foto ahora</small></span>
                    <Camera size={20} className="upload-option-arrow" />
                  </button>
                </div>
              </div>
            ) : uploadMode === 'file' ? (
              <div className="upload-preview panel rounded-3xl">
                <div className="upload-heading">
                  <span className="section-label">Vista previa</span>
                  <h2 className="font-headline">Así se ve tu prenda</h2>
                </div>
                {filePreviewUrl && <img src={filePreviewUrl} alt="Vista previa de la prenda seleccionada" className="upload-preview-image" />}
                {uploadConfirmed && <p className="upload-confirmation"><Check size={18} /> Imagen lista para guardar más adelante.</p>}
                {cameraError && <p className="upload-error" role="alert">{cameraError}</p>}
                <div className="upload-actions">
                  <button type="button" className="btn-accent rounded-full px-6 py-3" onClick={() => setUploadConfirmed(true)}><Check size={18} /> Confirmar</button>
                  <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={openFilePicker}><RotateCcw size={18} /> Elegir otra</button>
                </div>
              </div>
            ) : (
              <div className="upload-camera-wrap">
                <div className="upload-camera-frame rounded-3xl overflow-hidden bg-surface">
                  <video ref={videoRef} className="w-full h-full object-cover bg-surface" autoPlay muted playsInline />
                  {cameraCaptureUrl && <img src={cameraCaptureUrl} alt="Foto capturada" className="upload-camera-capture" />}
                </div>
                {cameraError && <p className="upload-error" role="alert">{cameraError}</p>}
                <button type="button" onClick={() => {
                  if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context && videoRef.current.videoWidth && videoRef.current.videoHeight) {
                      canvas.width = videoRef.current.videoWidth;
                      canvas.height = videoRef.current.videoHeight;
                      context.drawImage(videoRef.current, 0, 0);
                      setCameraCaptureUrl(canvas.toDataURL('image/jpeg'));
                    }
                  }
                }} className="btn-accent upload-capture-button rounded-full p-4 shadow-lg" aria-label="Capturar foto"><Camera size={28} /></button>
                <button type="button" className="btn-outline upload-back-button rounded-full px-5 py-2" onClick={() => setUploadMode('choose')}>Volver</button>
              </div>
            )}
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
            <div className="category-nav">
              {canScrollCategoriesLeft && (
                <button
                  type="button"
                  className="category-nav-button category-nav-button--left"
                  onClick={() => scrollCategories('left')}
                  aria-label="Ver categorías anteriores"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div
                ref={categoryRowRef}
                className="flex gap-3 overflow-x-auto no-scrollbar mb-8 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex-nowrap categories-row"
              onWheel={(event) => {
                const categoryRow = event.currentTarget;
                if (window.matchMedia('(max-width: 768px)').matches) {
                  return;
                }

                const hasHorizontalOverflow = categoryRow.scrollWidth > categoryRow.clientWidth;
                const isMostlyVerticalWheel = Math.abs(event.deltaY) > Math.abs(event.deltaX);

                if (hasHorizontalOverflow && isMostlyVerticalWheel && event.deltaY !== 0) {
                  categoryRow.scrollLeft += event.deltaY;
                  event.preventDefault();
                }
              }}
              >
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
              {canScrollCategoriesRight && (
                <button
                  type="button"
                  className="category-nav-button category-nav-button--right"
                  onClick={() => scrollCategories('right')}
                  aria-label="Ver más categorías"
                >
                  <ChevronRight size={20} />
                </button>
              )}
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
                      onError={() => setFailedImageIds(previous => new Set(previous).add(item.id))}
                      className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <div>
                        <p className="text-secondary text-xs uppercase tracking-widest font-bold">
                          {item.description}
                        </p>
                      </div>
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



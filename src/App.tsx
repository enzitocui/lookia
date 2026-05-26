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

const CATEGORIES = [
  'Alternativo',
  'Y2K',
  'Streetwear',
  'E-Girl',
  'Gotico',
  'Grunge',
  'Vintage',
  'Deportivo',
  'Formal',
  'Old Money'
];

// Items cleared — new categories will be populated later
const ITEMS: { id: number; category: string; url?: string; description?: string }[] = [];

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeNav, setActiveNav] = useState('compass');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const filteredItems = ITEMS.filter(item => item.category === activeCategory || activeCategory === 'All');

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
    <div className="min-h-screen bg-background selection:bg-secondary/30">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-center border-b border-white/5 relative">
        <div className="absolute left-4 sm:left-6">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="p-2 -ml-2 text-secondary hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-150"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute left-0 top-full mt-3 min-w-[18rem] w-[calc(100vw-2rem)] max-w-[22rem] rounded-3xl border border-white/10 bg-surface-container/95 p-4 shadow-2xl backdrop-blur-xl sm:w-auto"
              >
                <p className="text-xs uppercase tracking-[0.35em] text-secondary/80 mb-3">
                  Menu
                </p>
                <button
                  onClick={() => { setActiveNav('compass'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition font-body ${activeNav === 'compass' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
                >
                  <Compass size={18} />
                  Explorar
                </button>
                <div
                  onMouseEnter={() => setSubmenuOpen(true)}
                  onMouseLeave={() => setSubmenuOpen(false)}
                  className="w-full"
                >
                  <div
                    onClick={() => setSubmenuOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 font-body ${submenuOpen ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Shirt size={18} />
                      <span>Ropero</span>
                    </div>
                    <ChevronRight size={14} className={`${submenuOpen ? 'rotate-90' : ''} transition-transform`} />
                  </div>

                  {submenuOpen && (
                    <div className="mt-2 ml-6 flex flex-col gap-2">
                      <button
                        onClick={() => { setActiveNav('mi-ropa'); setMenuOpen(false); setSubmenuOpen(false); }}
                        className={`w-full text-left rounded-xl px-3 py-2 transition font-body ${activeNav === 'mi-ropa' ? 'bg-surface-container-high text-secondary' : 'text-primary hover:bg-surface-container'}`}
                      >
                        Mi ropa
                      </button>
                      <button
                        onClick={() => { setActiveNav('mis-outfits'); setMenuOpen(false); setSubmenuOpen(false); }}
                        className={`w-full text-left rounded-xl px-3 py-2 transition font-body ${activeNav === 'mis-outfits' ? 'bg-surface-container-high text-secondary' : 'text-primary hover:bg-surface-container'}`}
                      >
                        Mis outfits
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setActiveNav('camera'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition font-body ${activeNav === 'camera' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
                >
                  <Camera size={18} />
                  Subir
                </button>
                <button
                  onClick={() => { setActiveNav('user'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition font-body ${activeNav === 'user' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
                >
                  <User size={18} />
                  Perfil
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <h1 className="font-headline font-black text-4xl sm:text-5xl md:text-6xl text-secondary tracking-tighter uppercase">
          LOOKIA
        </h1>
        <div className="absolute right-4 sm:right-6">
          <button
            onClick={() => {
              // TODO: Implement dark/light mode toggle
              console.log('Theme toggle clicked');
            }}
            className="p-2 -mr-2 text-secondary hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-150"
            aria-label="Cambiar modo"
          >
            <Moon size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${activeNav === 'camera' ? 'pt-0 pb-0 px-0 w-screen' : 'pt-0 pb-20 sm:pb-28 px-4 sm:px-5 lg:px-6 max-w-[1280px]'} mx-auto editorial-gradient`}>
        {activeNav === 'camera' ? (
          <section className="relative w-screen h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] flex items-center justify-center px-4">
            <div className="w-full h-full rounded-3xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover bg-black"
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
              className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 rounded-full bg-secondary text-background hover:bg-secondary/90 transition-all duration-300 shadow-lg"
              aria-label="Capturar foto"
            >
              <Camera size={28} />
            </button>
          </section>
        ) : activeNav === 'mi-ropa' ? (
          <section className="space-y-6">
            <div className="rounded-3xl bg-surface-container p-6 shadow-2xl">
              <h2 className="font-headline text-4xl text-secondary mb-3">Mi ropa</h2>
              <p className="font-body text-primary text-sm opacity-80 mb-6">Aquí verás tus prendas guardadas.</p>
              <div className="rounded-3xl border-2 border-dashed border-white/10 bg-background/70 p-8 flex items-center justify-center">
                <p className="text-primary opacity-70 text-center">No hay prendas guardadas aún.</p>
              </div>
            </div>
          </section>
        ) : activeNav === 'mis-outfits' ? (
          <section className="space-y-6">
            <div className="rounded-3xl bg-surface-container p-6 shadow-2xl">
              <h2 className="font-headline text-4xl text-secondary mb-3">Mis outfits</h2>
              <p className="font-body text-primary text-sm opacity-80 mb-6">Combina tus prendas y guarda tus looks favoritos.</p>
              <div className="rounded-3xl border-2 border-dashed border-white/10 bg-background/70 p-8 flex items-center justify-center">
                <p className="text-primary opacity-70 text-center">No hay outfits guardados aún.</p>
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
                  <button className="group relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-surface-container border-2 border-white/6 flex items-center justify-center transition-all duration-300 hover:shadow-lg focus:outline-none">
                    <span className="sr-only">Editar foto de perfil</span>
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-background/30 to-surface-container" />
                    <Edit3 className="absolute right-3 bottom-3 w-7 h-7 text-secondary bg-background/60 p-1 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                </div>

                <div className="w-full flex justify-center">
                  <button className="mt-2 px-5 py-2 rounded-2xl bg-transparent border border-white/10 text-primary">Editar foto</button>
                </div>

                <div className="w-full mt-2 px-0">
                  <div className="rounded-2xl bg-background/70 p-4">
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
                    <button className="px-6 py-2 rounded-2xl bg-secondary text-background font-semibold">Editar info</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 flex-nowrap">
              {CATEGORIES.map((cat, idx) => (
                <motion.button
                  key={cat}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-3 rounded-full whitespace-nowrap font-bold text-sm sm:text-base transition-all duration-300 ${
                    activeCategory === cat 
                    ? 'bg-secondary-container text-secondary shadow-lg shadow-secondary-container/20' 
                    : 'bg-surface-container text-primary hover:bg-surface-container-high'
                  }`}
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
  );
}

function NavButton({ icon, active = false, onClick }: { icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-full transition-all duration-300 ${
      active 
      ? 'bg-secondary-container text-secondary scale-110 shadow-lg shadow-secondary-container/30' 
      : 'text-primary opacity-50 hover:opacity-100'
    }`}>
      {icon}
    </button>
  );
}



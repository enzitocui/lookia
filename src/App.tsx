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
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  'Deportivo',
  'Casual',
  'Formal',
  'Vanguardia',
  'Minimalista'
];

const ITEMS = [
  // Deportivo - 6 imágenes
  {
    id: 1,
    category: 'Deportivo',
    url: 'https://i.pinimg.com/236x/c6/8b/11/c68b11955293533678983930b5a98586.jpg',
    description: 'Look deportivo para hombre con estilo urbano'
  },
  {
    id: 2,
    category: 'Deportivo',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Conjunto deportivo masculino en colores vibrantes'
  },
  {
    id: 3,
    category: 'Deportivo',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSK_SZUAdbe3l-OCtxJc-IW6G79VH68M96d-A&s',
    description: 'Estilo atlético con prendas modernas'
  },
  {
    id: 4,
    category: 'Deportivo',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2-mjYTGvLvq9zRJsDlPw2JEPbx_VtaSj4_w&s',
    description: 'Combinación deportiva moderna para el día a día'
  },
  {
    id: 5,
    category: 'Deportivo',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjU4g0pC5vMjRn3Mw0aTN1VTXwJoFHRwNTAQ&s',
    description: 'Outfit deportivo contemporáneo y funcional'
  },
  {
    id: 6,
    category: 'Deportivo',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpVTOn7CUT8fbrUx3jbPqH4zVjj3b7Tg5tWQ&s',
    description: 'Look atlético con estética limpia y elegante'
  },
  
  // Casual - 3 imágenes
  {
    id: 7,
    category: 'Casual',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQyYpQ-M8V0JvT0Z0_8Z0Z0Z0Z0Z&s',
    description: 'Jeans con sudadera casual y sneakers'
  },
  {
    id: 8,
    category: 'Casual',
    url: 'https://i.pinimg.com/236x/b3/8e/f6/b38ef6d5f8c5a2e1b9d8e7f6c5b4a3d2.jpg',
    description: 'Outfit casual contemporáneo para paseos'
  },
  {
    id: 9,
    category: 'Casual',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Look casual con toque minimalista'
  },
  
  // Formal - 3 imágenes
  {
    id: 10,
    category: 'Formal',
    url: 'https://i.pinimg.com/236x/d8/7c/5b/d87c5b4a3c2b1a0f9e8d7c6b5a4f3e2d.jpg',
    description: 'Traje formal gris elegante'
  },
  {
    id: 11,
    category: 'Formal',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Corbata y camisa blanca profesional'
  },
  {
    id: 12,
    category: 'Formal',
    url: 'https://i.pinimg.com/236x/a1/b2/c3/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.jpg',
    description: 'Blazer negro con pantalón vestir'
  },
  
  // Vanguardia - 3 imágenes
  {
    id: 13,
    category: 'Vanguardia',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Moda experimental con cortes asimétricos'
  },
  {
    id: 14,
    category: 'Vanguardia',
    url: 'https://i.pinimg.com/236x/e9/f8/g7/e9f8g7h6i5j4k3l2m1n0o9p8q7r6s5t4.jpg',
    description: 'Look vanguardista con colores neón'
  },
  {
    id: 15,
    category: 'Vanguardia',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Estilo futurista con prendas innovadoras'
  },
  
  // Minimalista - 3 imágenes
  {
    id: 16,
    category: 'Minimalista',
    url: 'https://i.pinimg.com/236x/c1/d2/e3/c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6.jpg',
    description: 'Blanco y negro puro minimalismo'
  },
  {
    id: 17,
    category: 'Minimalista',
    url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyQcV4xCXssGQ4RCeR2gcPbtbq_gPwwbfNNA&s',
    description: 'Colores neutros con líneas limpias'
  },
  {
    id: 18,
    category: 'Minimalista',
    url: 'https://i.pinimg.com/236x/f5/g6/h7/f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0.jpg',
    description: 'Simplicidad elegante en prendas básicas'
  }
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Deportivo');
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
                  Navegación
                </p>
                <button
                  onClick={() => { setActiveNav('compass'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition ${activeNav === 'compass' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
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
                    className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${submenuOpen ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
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
                        className={`w-full text-left rounded-xl px-3 py-2 transition ${activeNav === 'mi-ropa' ? 'bg-surface-container-high text-secondary' : 'text-primary hover:bg-surface-container'}`}
                      >
                        Mi ropa
                      </button>
                      <button
                        onClick={() => { setActiveNav('mis-outfits'); setMenuOpen(false); setSubmenuOpen(false); }}
                        className={`w-full text-left rounded-xl px-3 py-2 transition ${activeNav === 'mis-outfits' ? 'bg-surface-container-high text-secondary' : 'text-primary hover:bg-surface-container'}`}
                      >
                        Mis outfits
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setActiveNav('camera'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition ${activeNav === 'camera' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
                >
                  <Camera size={18} />
                  Subir
                </button>
                <button
                  onClick={() => { setActiveNav('user'); setMenuOpen(false); }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition ${activeNav === 'user' ? 'bg-secondary-container text-secondary' : 'hover:bg-surface-container-high text-primary'}`}
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
      </header>

      {/* Main Content */}
      <main className="pt-0 pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto editorial-gradient">
        {activeNav === 'camera' ? (
          <section className="space-y-6">
            <div className="rounded-3xl overflow-hidden bg-surface-container shadow-2xl">
              <video
                ref={videoRef}
                className="w-full h-[240px] sm:h-[300px] md:h-[360px] lg:h-[420px] object-cover bg-black"
                autoPlay
                muted
                playsInline
              />
            </div>
            <div className="rounded-3xl bg-surface-container p-6 shadow-2xl">
              <p className="font-body text-primary text-sm leading-6">
                Subir tu atuendo. Permite el acceso en el navegador para capturar y subir tu look.
              </p>
              {cameraError ? (
                <p className="mt-4 text-sm text-error">{cameraError}</p>
              ) : (
                <p className="mt-4 text-sm text-secondary">
                  Si no ves imagen, verifica los permisos de cámara del navegador.
                </p>
              )}
            </div>
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
            <div className="rounded-3xl bg-surface-container p-6 shadow-2xl">
              <h2 className="font-headline text-4xl text-secondary mb-3">Perfil</h2>
              <p className="font-body text-primary text-sm opacity-80 mb-6">
                Accede a tu información, ajustes y preferencias de estilo.
              </p>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-background/70 p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-secondary/70 mb-3">Usuario</p>
                  <p className="text-primary text-lg font-semibold">Nombre de usuario</p>
                  <p className="text-secondary text-sm mt-2">lookia.user@example.com</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-background/70 p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-secondary/70 mb-3">Actividad reciente</p>
                  <ul className="space-y-3 text-primary text-sm">
                    <li className="rounded-2xl bg-surface-container p-4">Guardaste un look nuevo.</li>
                    <li className="rounded-2xl bg-surface-container p-4">Exploraste ropa deportiva.</li>
                    <li className="rounded-2xl bg-surface-container p-4">Actualizaste tu colección.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
              {CATEGORIES.map((cat, idx) => (
                <motion.button
                  key={cat}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 sm:px-8 py-4 rounded-full whitespace-nowrap font-bold text-base sm:text-lg transition-all duration-300 ${
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



/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  Compass, 
  Shirt, 
  Camera, 
  Layers, 
  User,
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  'Sporty',
  'Casual',
  'Formal',
  'Avant-Garde',
  'Minimalist'
];

const ITEMS = [
  {
    id: 1,
    category: 'Sporty',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
    description: 'High-performance technical sportswear'
  },
  {
    id: 2,
    category: 'Sporty',
    url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800',
    description: 'Dynamic luxury sneakers'
  },
  {
    id: 3,
    category: 'Sporty',
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800',
    description: 'Designer activewear details'
  },
  {
    id: 4,
    category: 'Casual',
    url: 'https://images.unsplash.com/photo-1554412930-074163930210?auto=format&fit=crop&q=80&w=800',
    description: 'Street photography style'
  },
  {
    id: 5,
    category: 'Casual',
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    description: 'High-end athletic textures'
  },
  {
    id: 6,
    category: 'Formal',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800',
    description: 'Abstract fabric details'
  }
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState('Sporty');

  const filteredItems = ITEMS.filter(item => item.category === activeCategory || activeCategory === 'All');

  return (
    <div className="min-h-screen bg-background selection:bg-secondary/30">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <button className="p-2 -ml-2 text-secondary hover:bg-surface-container rounded-full transition-colors active:scale-95 duration-150">
          <Menu size={24} />
        </button>
        <h1 className="font-headline font-black text-2xl text-secondary tracking-tighter uppercase">
          ATELIER
        </h1>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-6 editorial-gradient">
        {/* Editorial Header */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 mt-4"
        >
          <h2 className="font-headline font-bold text-6xl text-on-surface tracking-tighter leading-none mb-2">
            CURATE
          </h2>
          <p className="font-body text-primary text-sm opacity-80 uppercase tracking-widest flex items-center gap-2">
            Seasonal Moodboards <ChevronRight size={14} strokeWidth={3} />
          </p>
        </motion.section>

        {/* Category Pills */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-12 py-2 -mx-6 px-6">
          {CATEGORIES.map((cat, idx) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-3 rounded-full whitespace-nowrap font-bold text-sm transition-all duration-300 ${
                activeCategory === cat 
                ? 'bg-secondary-container text-secondary shadow-lg shadow-secondary-container/20' 
                : 'bg-surface-container text-primary hover:bg-surface-container-high'
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Masonry Grid */}
        <div className="masonry-grid">
          {/* Column 1 */}
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.slice(0, Math.ceil(filteredItems.length / 2)).map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="group relative rounded-2xl overflow-hidden bg-surface-container shadow-2xl"
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

          {/* Column 2 */}
          <div className="flex flex-col gap-6 mt-12">
            <AnimatePresence mode="popLayout">
              {filteredItems.slice(Math.ceil(filteredItems.length / 2)).map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="group relative rounded-2xl overflow-hidden bg-surface-container shadow-2xl"
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
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-24 bg-background/60 backdrop-blur-2xl flex justify-around items-center px-4 pb-4">
        <NavButton icon={<Compass size={24} />} active />
        <NavButton icon={<Shirt size={24} />} />
        <NavButton icon={<Camera size={24} />} />
        <NavButton icon={<Layers size={24} />} />
        <NavButton icon={<User size={24} />} />
      </nav>
    </div>
  );
}

function NavButton({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={`p-3 rounded-full transition-all duration-300 ${
      active 
      ? 'bg-secondary-container text-secondary scale-110 shadow-lg shadow-secondary-container/30' 
      : 'text-primary opacity-50 hover:opacity-100'
    }`}>
      {icon}
    </button>
  );
}



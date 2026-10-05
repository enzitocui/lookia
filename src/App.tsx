/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import outfits from './data/outfits.json';
import { auraItems } from './data/aura';
import OutfitBuilder from './components/OutfitBuilder';
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
  Sun,
  LogOut,
  Sparkles,
  Trash2,
  Pencil,
  X
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
type ExploreCategory = Category | 'AURA';

type User = {
  id_users: number;
  nombre: string | null;
  apellido: string | null;
  username: string | null;
  photo: string | null;
  email: string | null;
  created_dt: string | null;
  update_dt: string | null;
  last_login: string | null;
  fecha_nacimiento: string | null;
  pais: string | null;
};

type AuthMode = 'login' | 'register';

type AuthForm = {
  identifier: string;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  fecha_nacimiento: string;
  pais: string;
  contrasena: string;
};

type ProfileForm = {
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  fecha_nacimiento: string;
  pais: string;
};

type WardrobeType = { id_tipo: number; tipo: string };
type WardrobeSubtype = { id_subtipo: number; sub_tipo: string; id_tipo: number };
type Garment = { id_prendas: number; tipo: string; sub_tipo: string | null; foto: string; color: string };
type WardrobeCategory = 'SUPERIORES' | 'INFERIORES' | 'CALZADO' | 'ACCESORIOS';
type GarmentForm = { tipo: string; sub_tipo: string; color: string };

const WARDROBE_CATEGORIES: WardrobeCategory[] = ['SUPERIORES', 'INFERIORES', 'CALZADO', 'ACCESORIOS'];

const normalizeWardrobeCategory = (tipo: string): WardrobeCategory | null => {
  const normalized = tipo.trim().toLocaleLowerCase('es');
  if (normalized === 'superior' || normalized === 'superiores') return 'SUPERIORES';
  if (normalized === 'inferior' || normalized === 'inferiores') return 'INFERIORES';
  if (normalized === 'calzado') return 'CALZADO';
  if (normalized === 'accesorio' || normalized === 'accesorios') return 'ACCESORIOS';
  return null;
};

const CATEGORIES = [...Object.keys(CATEGORY_SEARCHES), 'AURA'] as ExploreCategory[];

type ExploreItem = {
  id: number | string;
  category: string;
  url: string;
  description: string;
};

const localItems = outfits as ExploreItem[];

const AUTH_FORM_INITIAL: AuthForm = {
  identifier: '',
  nombre: '',
  apellido: '',
  username: '',
  email: '',
  fecha_nacimiento: '',
  pais: '',
  contrasena: ''
};

const shuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const shuffledItemsByCategory = CATEGORIES.reduce<Record<ExploreCategory, ExploreItem[]>>((items, category) => {
  const categoryItems = category === 'AURA'
    ? auraItems
    : localItems.filter(item => item.category === category && item.url.startsWith('http'));
  items[category] = shuffle(categoryItems);
  return items;
}, {} as Record<ExploreCategory, ExploreItem[]>);

const getProfilePhotoUrl = (photo: string | null) => {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || photo.startsWith('data:')) return photo;
  if (photo.startsWith('/')) return `${window.location.origin}${photo}`;
  return photo;
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeNav, setActiveNav] = useState('compass');
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'camera' | 'file'>('choose');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);
  const [cameraCaptureUrl, setCameraCaptureUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState<AuthForm>(AUTH_FORM_INITIAL);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    fecha_nacimiento: '',
    pais: ''
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [wardrobeTypes, setWardrobeTypes] = useState<WardrobeType[]>([]);
  const [wardrobeSubtypes, setWardrobeSubtypes] = useState<WardrobeSubtype[]>([]);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [selectedWardrobeCategory, setSelectedWardrobeCategory] = useState<WardrobeCategory>('SUPERIORES');
  const [selectedWardrobeSubtype, setSelectedWardrobeSubtype] = useState('');
  const [wardrobeLoading, setWardrobeLoading] = useState(false);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [wardrobeError, setWardrobeError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [garmentForm, setGarmentForm] = useState<GarmentForm>({ tipo: '', sub_tipo: '', color: '' });
  const [garmentSaving, setGarmentSaving] = useState(false);
  const [garmentError, setGarmentError] = useState<string | null>(null);
  const [garmentSuccess, setGarmentSuccess] = useState<string | null>(null);
  const [editingGarmentId, setEditingGarmentId] = useState<number | null>(null);
  const [editingGarmentForm, setEditingGarmentForm] = useState<GarmentForm>({ tipo: '', sub_tipo: '', color: '' });
  const [deletingGarmentId, setDeletingGarmentId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const initialSessionCheckStartedRef = useRef(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const firstSidebarItemRef = useRef<HTMLButtonElement | null>(null);
  const categoryRowRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<number | string>>(() => new Set());

  const filteredItems = shuffledItemsByCategory[activeCategory]
    .filter(item => !failedImageIds.has(item.id));

  const refreshCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) {
        setCurrentUser(null);
        setAuthState('guest');
        return null;
      }

      const data = await response.json();
      const user = data.user as User | undefined;
      setCurrentUser(user ?? null);
      setAuthState(user ? 'authenticated' : 'guest');
      return user ?? null;
    } catch {
      setCurrentUser(null);
      setAuthState('guest');
      return null;
    }
  }, []);

  useEffect(() => {
    if (initialSessionCheckStartedRef.current) return;
    initialSessionCheckStartedRef.current = true;
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        nombre: currentUser.nombre ?? '',
        apellido: currentUser.apellido ?? '',
        username: currentUser.username ?? '',
        email: currentUser.email ?? '',
        fecha_nacimiento: currentUser.fecha_nacimiento ?? '',
        pais: currentUser.pais ?? ''
      });
    }
  }, [currentUser]);

  const loadWardrobe = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
    setWardrobeLoading(true);
    setWardrobeError(null);
    try {
      const [typesResponse, subtypesResponse, garmentsResponse] = await Promise.all([
        fetch('/api/tipos', { credentials: 'include' }),
        fetch('/api/sub-tipos', { credentials: 'include' }),
        fetch('/api/prendas', { credentials: 'include' })
      ]);
      const responses = [typesResponse, subtypesResponse, garmentsResponse];
      if (responses.some(response => response.status === 401)) {
        setCurrentUser(null);
        setAuthState('guest');
        setActiveNav('auth-access');
        throw new Error('Tu sesión venció. Iniciá sesión para acceder a tu ropero.');
      }
      if (responses.some(response => !response.ok)) throw new Error('No se pudo cargar tu ropero. Intentá nuevamente.');

      const [types, subtypes, ownedGarments] = await Promise.all(responses.map(response => response.json()));
      setWardrobeTypes(types as WardrobeType[]);
      setWardrobeSubtypes(subtypes as WardrobeSubtype[]);
      setGarments(ownedGarments as Garment[]);
      setCatalogsLoaded(true);
      return true;
    } catch (error) {
      setWardrobeError(error instanceof Error ? error.message : 'No se pudo cargar tu ropero.');
      return false;
    } finally {
      setWardrobeLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && activeNav === 'mi-ropa') void loadWardrobe();
  }, [activeNav, currentUser, loadWardrobe]);

  const selectedType = wardrobeTypes.find(type => normalizeWardrobeCategory(type.tipo) === selectedWardrobeCategory);
  const formSubtypes = wardrobeSubtypes.filter(subtype => {
    const type = wardrobeTypes.find(item => item.id_tipo === subtype.id_tipo);
    return type?.tipo === garmentForm.tipo;
  });
  const editingSubtypes = wardrobeSubtypes.filter(subtype => {
    const type = wardrobeTypes.find(item => item.id_tipo === subtype.id_tipo);
    return type?.tipo === editingGarmentForm.tipo;
  });
  const wardrobeSubtypesForCategory = wardrobeSubtypes.filter(subtype => {
    const type = wardrobeTypes.find(item => item.id_tipo === subtype.id_tipo);
    return type ? normalizeWardrobeCategory(type.tipo) === selectedWardrobeCategory : false;
  });
  const visibleGarments = garments.filter(garment => {
    const categoryMatches = normalizeWardrobeCategory(garment.tipo) === selectedWardrobeCategory;
    return categoryMatches && (!selectedWardrobeSubtype || garment.sub_tipo === selectedWardrobeSubtype);
  });

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

  useEffect(() => {
    const savedTheme = localStorage.getItem('lookia-theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

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
      } catch {
        setCameraError('No se pudo acceder a la cámara');
      }
    };

    if (activeNav === 'camera' && uploadMode === 'camera') {
      void startCamera();
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
    event.target.value = '';
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadFile(null);
      setFilePreviewUrl(null);
      setUploadConfirmed(false);
      setCameraError('La imagen debe pesar menos de 5 MB.');
      return;
    }

    try {
      setCameraError(null);
      setGarmentError(null);
      setGarmentSuccess(null);
      setUploadConfirmed(false);
      setUploadFile(file);
      setPreviewImageError(false);
      setFilePreviewUrl(URL.createObjectURL(file));
      setUploadMode('file');
    } catch {
      setUploadFile(null);
      setCameraError('No se pudo mostrar la vista previa. Probá con otra imagen.');
    }
  };

  const selectUploadMode = (mode: 'camera' | 'file') => {
    setCameraError(null);
    setCameraCaptureUrl(null);
    setUploadConfirmed(false);
    setUploadFile(null);
    setFilePreviewUrl(null);
    setPreviewImageError(false);
    setGarmentError(null);
    setGarmentSuccess(null);
    setGarmentForm({ tipo: selectedType?.tipo ?? '', sub_tipo: '', color: '' });
    if (mode === 'file') {
      openFilePicker();
      return;
    }
    setUploadMode(mode);
  };

  const handleCameraCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setCameraError('No se pudo procesar la fotografía.');
      return;
    }
    const file = new File([blob], `lookia-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);
    setUploadFile(file);
    setPreviewImageError(false);
    setCameraCaptureUrl(previewUrl);
    setFilePreviewUrl(previewUrl);
    setCameraError(null);
  };

  const continueWithGarmentDetails = async () => {
    if (!uploadFile) {
      setCameraError('Seleccioná una imagen antes de continuar.');
      return;
    }
    setCameraError(null);
    if (!catalogsLoaded) {
      const catalogsAvailable = await loadWardrobe();
      if (!catalogsAvailable) {
        setCameraError('No se pudieron cargar los tipos y subtipos. Intentá nuevamente.');
        return;
      }
    }
    setUploadConfirmed(true);
    setUploadMode('file');
    setGarmentError(null);
    setGarmentForm({ tipo: selectedType?.tipo ?? '', sub_tipo: '', color: '' });
  };

  const handleGarmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) {
      setGarmentError('Seleccioná una imagen para continuar.');
      return;
    }
    setGarmentSaving(true);
    setGarmentError(null);
    setGarmentSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tipo', garmentForm.tipo);
      formData.append('sub_tipo', garmentForm.sub_tipo);
      formData.append('color', garmentForm.color);
      const response = await fetch('/api/prendas', { method: 'POST', credentials: 'include', body: formData });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setCurrentUser(null);
        setAuthState('guest');
        setActiveNav('auth-access');
        throw new Error('Iniciá sesión para guardar prendas.');
      }
      if (!response.ok) throw new Error(data?.error || 'No se pudo guardar la prenda.');
      setUploadFile(null);
      setFilePreviewUrl(null);
      setCameraCaptureUrl(null);
      setUploadConfirmed(false);
      setUploadMode('choose');
      setCameraError(null);
      setGarmentForm({ tipo: '', sub_tipo: '', color: '' });
      await loadWardrobe();
      setGarmentSuccess('La prenda se guardó correctamente en tu ropero.');
      setActiveNav('mi-ropa');
    } catch (error) {
      setGarmentError(error instanceof Error ? error.message : 'No se pudo guardar la prenda.');
    } finally {
      setGarmentSaving(false);
    }
  };

  const beginGarmentEdit = (garment: Garment) => {
    setEditingGarmentId(garment.id_prendas);
    setEditingGarmentForm({ tipo: garment.tipo, sub_tipo: garment.sub_tipo ?? '', color: garment.color });
  };

  const saveGarmentEdit = async (garmentId: number) => {
    try {
      const response = await fetch(`/api/prendas/${garmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingGarmentForm)
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setCurrentUser(null);
        setAuthState('guest');
        setActiveNav('auth-access');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'No se pudo editar la prenda.');
      setGarments(previous => previous.map(garment => garment.id_prendas === garmentId ? data.prenda as Garment : garment));
      setEditingGarmentId(null);
      setWardrobeError(null);
    } catch (error) {
      setWardrobeError(error instanceof Error ? error.message : 'No se pudo editar la prenda.');
    }
  };

  const deleteGarment = async (garment: Garment) => {
    if (!window.confirm('¿Querés eliminar esta prenda? Esta acción no se puede deshacer.')) return;
    setDeletingGarmentId(garment.id_prendas);
    try {
      const response = await fetch(`/api/prendas/${garment.id_prendas}`, { method: 'DELETE', credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setCurrentUser(null);
        setAuthState('guest');
        setActiveNav('auth-access');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'No se pudo eliminar la prenda.');
      setGarments(previous => previous.filter(item => item.id_prendas !== garment.id_prendas));
      setWardrobeError(null);
    } catch (error) {
      setWardrobeError(error instanceof Error ? error.message : 'No se pudo eliminar la prenda.');
    } finally {
      setDeletingGarmentId(null);
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login'
        ? { identifier: authForm.identifier, contrasena: authForm.contrasena }
        : {
            nombre: authForm.nombre,
            apellido: authForm.apellido,
            username: authForm.username,
            email: authForm.email,
            fecha_nacimiento: authForm.fecha_nacimiento,
            pais: authForm.pais,
            contrasena: authForm.contrasena
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo completar la operación.');
      }

      const user = data.user as User | undefined;
      setCurrentUser(user ?? null);
      setAuthState('authenticated');
      setAuthForm(AUTH_FORM_INITIAL);
      setProfileError(null);
      setProfileSuccess(null);
      setActiveNav('user');
      setMenuOpen(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Hubo un error inesperado.');
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsProfileSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileForm)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar el perfil.');
      }

      setCurrentUser(data.user ?? currentUser);
      setProfileSuccess('Perfil actualizado correctamente.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'No se pudo guardar tu perfil.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoMessage('Formato no permitido. Usá JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage('La imagen debe pesar menos de 5 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingPhoto(true);
    setPhotoMessage(null);

    try {
      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar la foto.');
      }

      setCurrentUser(data.user ?? currentUser);
      setPhotoMessage('Foto de perfil actualizada.');
    } catch (error) {
      setPhotoMessage(error instanceof Error ? error.message : 'No se pudo subir la foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Ignored: UI should reset locally even if the request fails.
    } finally {
      setCurrentUser(null);
      setGarments([]);
      setGarmentSuccess(null);
      setAuthState('guest');
      setAuthForm(AUTH_FORM_INITIAL);
      setActiveNav('compass');
      setMenuOpen(false);
      setSubmenuOpen(false);
      setProfileSuccess(null);
      setProfileError(null);
    }
  };

  const renderGuestAccessPanel = () => (
    <section className="space-y-6 flex items-center justify-center min-h-[60vh]">
      <div className="panel rounded-3xl p-8 max-w-xl w-full text-center">
        <h2 className="font-headline text-4xl text-secondary mb-4">Accedé a todas las funciones de LOOKIA iniciando sesión.</h2>
        <p className="font-body text-muted text-sm mb-6">La exploración pública sigue disponible sin registro, pero para ver tu perfil y personalizar tu experiencia necesitás una cuenta.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button type="button" className="btn-accent rounded-full px-6 py-3" onClick={() => { setAuthMode('login'); setActiveNav('auth-login'); }}>
            Iniciar sesión
          </button>
          <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={() => { setAuthMode('register'); setActiveNav('auth-register'); }}>
            Registrarse
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen app-shell selection:bg-secondary/30 overflow-x-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Seleccionar imagen de una prenda"
      />
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

        <div className="sidebar-scroll-area flex min-h-0 flex-1 flex-col px-1 pb-1">
          <nav className="sidebar-nav mb-6 flex min-h-0 flex-1 flex-col gap-2" aria-label="Navegación principal" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <button
              ref={firstSidebarItemRef}
              onClick={() => { setActiveNav('compass'); setMenuOpen(false); }}
              className={`sidebar-menu-item ${activeNav === 'compass' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
            >
              <Compass size={18} />
              Explorar
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  setActiveNav('auth-access');
                  setMenuOpen(false);
                  setSubmenuOpen(false);
                  return;
                }
                setSubmenuOpen(prev => !prev);
              }}
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

            {submenuOpen && currentUser && (
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
              onClick={() => { setActiveNav('crear-outfit'); setMenuOpen(false); }}
              className={`sidebar-menu-item ${activeNav === 'crear-outfit' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
            >
              <Sparkles size={18} />
              Crear Outfit
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  setActiveNav('auth-access');
                  setMenuOpen(false);
                  return;
                }
                setActiveNav('camera');
                setUploadMode('choose');
                setUploadFile(null);
                setFilePreviewUrl(null);
                setCameraCaptureUrl(null);
                setUploadConfirmed(false);
                setMenuOpen(false);
              }}
              className={`sidebar-menu-item ${activeNav === 'camera' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
            >
              <Camera size={18} />
              Subir
            </button>

            <button
              onClick={() => {
                if (!currentUser) {
                  setActiveNav('auth-access');
                  setMenuOpen(false);
                  return;
                }
                setActiveNav('user');
                setMenuOpen(false);
              }}
              className={`sidebar-menu-item ${activeNav === 'user' ? 'sidebar-menu-item--active' : 'sidebar-menu-item--inactive'} rounded-2xl px-4 py-3 font-body`}
            >
              <User size={18} />
              Perfil
            </button>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="sidebar-menu-item sidebar-menu-item--inactive rounded-2xl px-4 py-3 font-body"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            )}
          </nav>

          <div className="mt-auto pt-6">
            <div className="w-full h-px bg-white/5 mb-3" />
            <div className="text-center sidebar-footer">
              <div className="mb-1">LOOKIA v1.0</div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`min-h-screen transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${menuOpen ? 'translate-x-[min(18rem,80vw)]' : 'translate-x-0'}`}>
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

        <main className={`${activeNav === 'camera' ? 'pt-0 pb-0 px-0 w-screen' : 'pt-0 pb-20 sm:pb-28 px-4 sm:px-5 lg:px-6 max-w-[1280px]'} mx-auto editorial-gradient`}>
          {activeNav === 'crear-outfit' ? (
            authState === 'loading' ? (
              <section className="outfit-builder"><div className="panel rounded-3xl p-8 text-center">Verificando sesión…</div></section>
            ) : !currentUser ? renderGuestAccessPanel() : <OutfitBuilder />
          ) : activeNav === 'camera' && !currentUser ? (
            renderGuestAccessPanel()
          ) : activeNav === 'camera' ? (
            <section className={`upload-page ${uploadMode === 'camera' ? 'upload-page--camera' : ''}`}>
              {uploadMode === 'choose' ? (
                <div className="upload-choice panel rounded-3xl">
                  <div className="upload-heading">
                    <span className="section-label">Subir</span>
                    <h2 className="font-headline">¿Qué querés hacer?</h2>
                    <p className="text-muted">Elegí cómo querés agregar una nueva prenda.</p>
                  </div>
                  {cameraError && <p className="upload-error" role="alert">{cameraError}</p>}
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
                  {filePreviewUrl && (previewImageError ? (
                    <div className="upload-preview-fallback" role="status">
                      <FileImage size={30} aria-hidden="true" />
                      <span>El navegador no puede mostrar la vista previa de este formato.</span>
                      <small>{uploadFile?.name}</small>
                    </div>
                  ) : <img src={filePreviewUrl} alt="Vista previa de la prenda seleccionada" className="upload-preview-image" onError={() => setPreviewImageError(true)} />)}
                  {uploadConfirmed ? (
                    <form className="wardrobe-garment-form panel-alt" onSubmit={handleGarmentSubmit}>
                      <h3 className="font-headline text-xl text-secondary">Datos de la prenda</h3>
                      <div className="wardrobe-form-grid">
                        <label className="wardrobe-field">Tipo
                          <select required value={garmentForm.tipo} onChange={event => setGarmentForm({ tipo: event.target.value, sub_tipo: '', color: garmentForm.color })}>
                            <option value="">Elegí un tipo</option>
                            {wardrobeTypes.map(type => <option key={type.id_tipo} value={type.tipo}>{type.tipo}</option>)}
                          </select>
                        </label>
                        <label className="wardrobe-field">Subtipo
                          <select required value={garmentForm.sub_tipo} onChange={event => setGarmentForm({ ...garmentForm, sub_tipo: event.target.value })} disabled={!garmentForm.tipo}>
                            <option value="">Elegí un subtipo</option>
                            {formSubtypes.map(subtype => <option key={subtype.id_subtipo} value={subtype.sub_tipo}>{subtype.sub_tipo}</option>)}
                          </select>
                        </label>
                        <label className="wardrobe-field">Color
                          <input required maxLength={40} value={garmentForm.color} onChange={event => setGarmentForm({ ...garmentForm, color: event.target.value })} placeholder="Ej. Negro" />
                        </label>
                      </div>
                      {garmentError && <p className="upload-error" role="alert">{garmentError}</p>}
                      <div className="upload-actions">
                        <button type="submit" disabled={garmentSaving} className="btn-accent rounded-full px-6 py-3"><Check size={18} /> {garmentSaving ? 'Guardando…' : 'Guardar en mi ropero'}</button>
                        <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={() => { setUploadConfirmed(false); setGarmentError(null); }}>Volver a la imagen</button>
                      </div>
                    </form>
                  ) : null}
                  {cameraError && <p className="upload-error" role="alert">{cameraError}</p>}
                  {!uploadConfirmed && <div className="upload-actions">
                    <button type="button" disabled={wardrobeLoading} className="btn-accent rounded-full px-6 py-3" onClick={continueWithGarmentDetails}><Check size={18} /> {wardrobeLoading ? 'Cargando opciones…' : 'Continuar'}</button>
                    <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={openFilePicker}><RotateCcw size={18} /> Elegir otra</button>
                        <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={() => { setUploadMode('choose'); setUploadFile(null); setFilePreviewUrl(null); setPreviewImageError(false); }}><X size={18} /> Cancelar</button>
                  </div>}
                </div>
              ) : (
                <div className="upload-camera-wrap">
                  <div className="upload-camera-frame rounded-3xl overflow-hidden bg-surface">
                    <video ref={videoRef} className="w-full h-full object-cover bg-surface" autoPlay muted playsInline />
                    {cameraCaptureUrl && <img src={cameraCaptureUrl} alt="Foto capturada" className="upload-camera-capture" />}
                  </div>
                  {cameraError && <p className="upload-error" role="alert">{cameraError}</p>}
                  {cameraCaptureUrl ? (
                    <div className="upload-actions">
                      <button type="button" disabled={wardrobeLoading} className="btn-accent rounded-full px-6 py-3" onClick={continueWithGarmentDetails}><Check size={18} /> {wardrobeLoading ? 'Cargando opciones…' : 'Usar esta foto'}</button>
                      <button type="button" className="btn-outline rounded-full px-6 py-3" onClick={() => { setCameraCaptureUrl(null); setFilePreviewUrl(null); setUploadFile(null); }}><RotateCcw size={18} /> Repetir</button>
                    </div>
                  ) : <button type="button" onClick={() => void handleCameraCapture()} className="btn-accent upload-capture-button rounded-full p-4 shadow-lg" aria-label="Capturar foto"><Camera size={28} /></button>}
                  <button type="button" className="btn-outline upload-back-button rounded-full px-5 py-2" onClick={() => setUploadMode('choose')}>Volver</button>
                </div>
              )}
            </section>
          ) : activeNav === 'mi-ropa' ? (
            !currentUser ? renderGuestAccessPanel() : <section className="wardrobe-page">
              <div className="wardrobe-heading">
                <div><span className="section-label">LOOKIA · TU ESPACIO</span><h2 className="font-headline">Mi ropero</h2></div>
                <button type="button" disabled={wardrobeLoading} className="btn-accent rounded-full px-5 py-3" onClick={() => { setActiveNav('camera'); setUploadMode('choose'); setUploadConfirmed(false); setUploadFile(null); setFilePreviewUrl(null); }}>Agregar prenda</button>
              </div>
              {garmentSuccess && <p className="wardrobe-message wardrobe-message--success" role="status">{garmentSuccess}</p>}
              <div className="wardrobe-categories" role="tablist" aria-label="Categorías del ropero">
                {WARDROBE_CATEGORIES.map(category => <button key={category} type="button" role="tab" aria-selected={selectedWardrobeCategory === category} className={`wardrobe-category ${selectedWardrobeCategory === category ? 'wardrobe-category--active' : ''}`} onClick={() => { setSelectedWardrobeCategory(category); setSelectedWardrobeSubtype(''); }}>{category}</button>)}
              </div>
              <div className="wardrobe-filter-row">
                <label htmlFor="wardrobe-subtype">Filtrar por subtipo</label>
                <select id="wardrobe-subtype" value={selectedWardrobeSubtype} onChange={event => setSelectedWardrobeSubtype(event.target.value)}>
                  <option value="">Todos</option>
                  {wardrobeSubtypesForCategory.map(subtype => <option key={subtype.id_subtipo} value={subtype.sub_tipo}>{subtype.sub_tipo}</option>)}
                </select>
              </div>
              {wardrobeError && <p className="wardrobe-message wardrobe-message--error" role="alert">{wardrobeError}</p>}
              {wardrobeLoading ? <div className="wardrobe-empty panel rounded-3xl">Cargando tu ropero…</div> : visibleGarments.length === 0 ? (
                <div className="wardrobe-empty panel rounded-3xl">
                  <span className="wardrobe-empty-icon"><Shirt size={30} /></span>
                  <h3 className="font-headline">{garments.length === 0 && !selectedWardrobeSubtype ? 'Tu ropero está vacío.' : 'No tenés prendas en esta categoría todavía.'}</h3>
                  <p className="text-muted">Agregá una prenda para empezar a organizar tus looks.</p>
                  <button type="button" disabled={wardrobeLoading} className="btn-accent rounded-full px-5 py-3" onClick={() => { setActiveNav('camera'); setUploadMode('choose'); setUploadConfirmed(false); }}>Agregar prenda</button>
                </div>
              ) : <div className="wardrobe-grid">
                {visibleGarments.map(garment => <article key={garment.id_prendas} className="garment-card panel">
                  <img src={garment.foto} alt={`${garment.sub_tipo || garment.tipo}, color ${garment.color}`} className="garment-photo" />
                  {editingGarmentId === garment.id_prendas ? <div className="garment-edit-form">
                    <label className="wardrobe-field">Tipo<select value={editingGarmentForm.tipo} onChange={event => setEditingGarmentForm({ tipo: event.target.value, sub_tipo: '', color: editingGarmentForm.color })}>{wardrobeTypes.map(type => <option key={type.id_tipo} value={type.tipo}>{type.tipo}</option>)}</select></label>
                    <label className="wardrobe-field">Subtipo<select value={editingGarmentForm.sub_tipo} onChange={event => setEditingGarmentForm({ ...editingGarmentForm, sub_tipo: event.target.value })}>{editingSubtypes.map(subtype => <option key={subtype.id_subtipo} value={subtype.sub_tipo}>{subtype.sub_tipo}</option>)}</select></label>
                    <label className="wardrobe-field">Color<input value={editingGarmentForm.color} maxLength={40} onChange={event => setEditingGarmentForm({ ...editingGarmentForm, color: event.target.value })} /></label>
                    <div className="garment-actions"><button type="button" className="btn-accent rounded-full px-4 py-2" onClick={() => void saveGarmentEdit(garment.id_prendas)}>Guardar</button><button type="button" className="btn-outline rounded-full px-4 py-2" onClick={() => setEditingGarmentId(null)}>Cancelar</button></div>
                  </div> : <div className="garment-card-content">
                    <div><p className="garment-type">{garment.tipo}</p><h3>{garment.sub_tipo || garment.tipo}</h3><p className="garment-color"><span aria-hidden="true" />{garment.color}</p></div>
                    <div className="garment-actions"><button type="button" className="icon-button" aria-label={`Editar ${garment.sub_tipo || garment.tipo}`} onClick={() => beginGarmentEdit(garment)}><Pencil size={17} /></button><button type="button" className="icon-button garment-delete" aria-label={`Eliminar ${garment.sub_tipo || garment.tipo}`} disabled={deletingGarmentId === garment.id_prendas} onClick={() => void deleteGarment(garment)}><Trash2 size={17} /></button></div>
                  </div>}
                </article>)}
              </div>}
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
          ) : activeNav === 'auth-access' ? (
            renderGuestAccessPanel()
          ) : activeNav === 'auth-login' ? (
            <section className="flex items-center justify-center py-8 sm:py-12">
              <div className="panel rounded-3xl p-6 sm:p-8 max-w-xl w-full">
                <h2 className="font-headline text-4xl text-secondary mb-3 text-center">Iniciar sesión</h2>
                <p className="text-center text-muted mb-6">Ingresá tu email o username para continuar.</p>
                <form className="space-y-4" onSubmit={handleAuthSubmit}>
                  <div>
                    <label className="block text-sm mb-2 text-secondary/80">Email o username</label>
                    <input type="text" value={authForm.identifier} onChange={(event) => setAuthForm({ ...authForm, identifier: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" placeholder="tuemail@lookia.com" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-secondary/80">Contraseña</label>
                    <input type="password" value={authForm.contrasena} onChange={(event) => setAuthForm({ ...authForm, contrasena: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" placeholder="••••••••" />
                  </div>
                  {authError && <p className="text-sm text-accent-light">{authError}</p>}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button type="submit" className="btn-accent rounded-full px-6 py-3 flex-1">Iniciar sesión</button>
                    <button type="button" className="btn-outline rounded-full px-6 py-3 flex-1" onClick={() => { setAuthMode('register'); setActiveNav('auth-register'); setAuthError(null); }}>Registrarme</button>
                  </div>
                </form>
              </div>
            </section>
          ) : activeNav === 'auth-register' ? (
            <section className="flex items-center justify-center py-8 sm:py-12">
              <div className="panel rounded-3xl p-6 sm:p-8 max-w-2xl w-full">
                <h2 className="font-headline text-4xl text-secondary mb-3 text-center">Crear cuenta</h2>
                <p className="text-center text-muted mb-6">Completá tus datos para crear tu perfil en LOOKIA.</p>
                <form className="space-y-4" onSubmit={handleAuthSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">Nombre</label>
                      <input type="text" value={authForm.nombre} onChange={(event) => setAuthForm({ ...authForm, nombre: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">Apellido</label>
                      <input type="text" value={authForm.apellido} onChange={(event) => setAuthForm({ ...authForm, apellido: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">Username</label>
                      <input type="text" value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">Email</label>
                      <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">Fecha de nacimiento</label>
                      <input type="date" value={authForm.fecha_nacimiento} onChange={(event) => setAuthForm({ ...authForm, fecha_nacimiento: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 text-secondary/80">País</label>
                      <input type="text" value={authForm.pais} onChange={(event) => setAuthForm({ ...authForm, pais: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-secondary/80">Contraseña</label>
                    <input type="password" value={authForm.contrasena} onChange={(event) => setAuthForm({ ...authForm, contrasena: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" placeholder="mínimo 8 caracteres" />
                  </div>
                  {authError && <p className="text-sm text-accent-light">{authError}</p>}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button type="submit" className="btn-accent rounded-full px-6 py-3 flex-1">Crear cuenta</button>
                    <button type="button" className="btn-outline rounded-full px-6 py-3 flex-1" onClick={() => { setAuthMode('login'); setActiveNav('auth-login'); setAuthError(null); }}>Ya tengo cuenta</button>
                  </div>
                </form>
              </div>
            </section>
          ) : activeNav === 'user' ? (
            <section className="space-y-6">
              {authState === 'loading' ? (
                <div className="panel rounded-3xl p-8 text-center">Verificando sesión…</div>
              ) : !currentUser ? (
                renderGuestAccessPanel()
              ) : (
                <div className="rounded-3xl bg-surface-container p-6 shadow-2xl max-w-3xl mx-auto">
                  <h2 className="font-headline text-4xl text-secondary mb-3 text-center">Perfil</h2>
                  <p className="font-body text-primary text-sm opacity-80 mb-6 text-center">
                    Accede a tu información, ajustes y preferencias de estilo.
                  </p>

                  <div className="flex flex-col items-center gap-4 px-4 sm:px-0">
                    <div className="relative">
                      <button type="button" onClick={() => profileFileInputRef.current?.click()} className="group relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-surface-container border-2 border-white/6 flex items-center justify-center transition-all duration-300 hover:shadow-lg focus:outline-none avatar-gradient">
                        <span className="sr-only">Editar foto de perfil</span>
                        {currentUser.photo ? (
                          <img src={getProfilePhotoUrl(currentUser.photo) ?? undefined} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-background/30 to-surface-container" />
                        )}
                        <Edit3 className="absolute right-3 bottom-3 w-7 h-7 text-secondary bg-background/60 p-1 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </button>
                      <input ref={profileFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhotoChange} />
                    </div>

                    <div className="w-full flex justify-center">
                      <button type="button" onClick={() => profileFileInputRef.current?.click()} className="mt-2 px-5 py-2 rounded-2xl btn-outline">Editar foto</button>
                    </div>

                    {photoMessage && <p className="text-sm text-accent-light">{photoMessage}</p>}
                    {isUploadingPhoto && <p className="text-sm text-secondary/80">Subiendo foto…</p>}

                    <div className="w-full mt-2 px-0">
                      <div className="rounded-2xl bg-background/70 p-4 panel-alt">
                        <p className="text-xs uppercase tracking-[0.35em] text-secondary/70 mb-3">Info</p>
                        <div className="grid gap-3">
                          <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                            <span className="text-secondary/70 text-sm mr-3 truncate">Nombre de usuario</span>
                            <span className="text-primary font-semibold truncate text-right min-w-0">{currentUser.username || 'Sin usuario'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                            <span className="text-secondary/70 text-sm mr-3 truncate">Nombre real</span>
                            <span className="text-primary font-semibold truncate text-right min-w-0">{[currentUser.nombre, currentUser.apellido].filter(Boolean).join(' ') || 'Sin nombre'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                            <span className="text-secondary/70 text-sm mr-3 truncate">Correo</span>
                            <span className="text-primary font-semibold truncate text-right min-w-0">{currentUser.email || 'Sin email'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                            <span className="text-secondary/70 text-sm mr-3 truncate">País</span>
                            <span className="text-primary font-semibold truncate text-right min-w-0">{currentUser.pais || 'Sin país'}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container min-w-0">
                            <span className="text-secondary/70 text-sm mr-3 truncate">Nacimiento</span>
                            <span className="text-primary font-semibold truncate text-right min-w-0">{currentUser.fecha_nacimiento || 'Sin fecha'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl bg-background/70 p-4 panel-alt">
                        <p className="text-xs uppercase tracking-[0.35em] text-secondary/70 mb-3">Editar perfil</p>
                        <form onSubmit={handleProfileSave} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">Nombre</label>
                              <input type="text" value={profileForm.nombre} onChange={(event) => setProfileForm({ ...profileForm, nombre: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">Apellido</label>
                              <input type="text" value={profileForm.apellido} onChange={(event) => setProfileForm({ ...profileForm, apellido: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">Username</label>
                              <input type="text" value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">Email</label>
                              <input type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">Fecha de nacimiento</label>
                              <input type="date" value={profileForm.fecha_nacimiento} onChange={(event) => setProfileForm({ ...profileForm, fecha_nacimiento: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                            <div>
                              <label className="block text-sm mb-2 text-secondary/80">País</label>
                              <input type="text" value={profileForm.pais} onChange={(event) => setProfileForm({ ...profileForm, pais: event.target.value })} className="w-full rounded-2xl bg-background/70 border border-white/10 px-4 py-3 text-primary outline-none focus:border-primary/70" />
                            </div>
                          </div>
                          {profileError && <p className="text-sm text-accent-light">{profileError}</p>}
                          {profileSuccess && <p className="text-sm text-accent-light">{profileSuccess}</p>}
                          <div className="flex justify-center mt-4">
                            <button type="submit" disabled={isProfileSaving} className="px-6 py-2 rounded-2xl btn-accent font-semibold disabled:opacity-60">{isProfileSaving ? 'Guardando...' : 'Guardar cambios'}</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <>
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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { GraduationCap, Menu, X, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import './landing.css';

const TOTAL_FRAMES = 240;
const IMAGE_DIR = '/frames/';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, loginWithUser, logout } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Loading state
  const [loadPct, setLoadPct] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Active section for story rail & nav
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Check URL query params for auth trigger (e.g. redirected from protected route)
  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'signin' || authParam === 'signup') {
      setAuthTab(authParam);
      setAuthModalOpen(true);
      // Clean query params from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Image cache and animation refs
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const lastDrawnImageRef = useRef<HTMLImageElement | null>(null);
  const lastDrawnPosRef = useRef(-1);
  const needsRedrawRef = useRef(true);
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Draw frame on canvas with object-fit: cover scaling
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement, alpha = 1) => {
    if (!img || !img.complete || !img.naturalWidth || img.naturalWidth === 0) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.globalAlpha = 1;
  }, []);

  // Continuous animation loop with lerp smoothing & mobile resilience
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Helper to find the best loaded frame close to target index
    const getBestFrame = (targetIdx: number): HTMLImageElement | null => {
      const images = imagesRef.current;
      if (!images || images.length === 0) return null;

      // 1. Direct hit if loaded and valid
      const direct = images[targetIdx];
      if (direct && direct.complete && direct.naturalWidth > 0) {
        return direct;
      }

      // 2. Search outward in expanding radius (prioritizing backward frames for smooth progress)
      for (let r = 1; r < TOTAL_FRAMES; r++) {
        const leftIdx = targetIdx - r;
        if (leftIdx >= 0) {
          const leftImg = images[leftIdx];
          if (leftImg && leftImg.complete && leftImg.naturalWidth > 0) {
            return leftImg;
          }
        }
        const rightIdx = targetIdx + r;
        if (rightIdx < TOTAL_FRAMES) {
          const rightImg = images[rightIdx];
          if (rightImg && rightImg.complete && rightImg.naturalWidth > 0) {
            return rightImg;
          }
        }
      }

      // 3. Fallback to last successfully drawn image
      if (lastDrawnImageRef.current && lastDrawnImageRef.current.complete && lastDrawnImageRef.current.naturalWidth > 0) {
        return lastDrawnImageRef.current;
      }

      return null;
    };

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const resizeCanvas = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      // Mobile protection: ignore minor height adjustments when browser URL bar collapses on scroll
      const widthChanged = Math.abs(newWidth - lastWidth) > 6;
      const heightChangedSignificantly = Math.abs(newHeight - lastHeight) > 120;

      if (canvas.width > 0 && !widthChanged && !heightChangedSignificantly) {
        return;
      }

      lastWidth = newWidth;
      lastHeight = newHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Redraw immediately with best available frame on warm background
      const curIdx = Math.floor(currentFrameRef.current);
      const best = getBestFrame(curIdx);
      ctx.fillStyle = '#F4EFE8';
      ctx.fillRect(0, 0, newWidth, newHeight);
      if (best) {
        drawFrame(ctx, best, 1);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Continuous render loop
    const LERP_FACTOR = 0.14;
    const render = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const fraction = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

      targetFrameRef.current = fraction * (TOTAL_FRAMES - 1);

      currentFrameRef.current += (targetFrameRef.current - currentFrameRef.current) * LERP_FACTOR;
      currentFrameRef.current = Math.min(Math.max(currentFrameRef.current, 0), TOTAL_FRAMES - 1);

      const frameIdx = Math.floor(currentFrameRef.current);
      const nextIdx = Math.min(frameIdx + 1, TOTAL_FRAMES - 1);
      const blend = currentFrameRef.current - frameIdx;

      // Only perform canvas redraw if frame position or blend has actually changed
      const deltaFrame = Math.abs(currentFrameRef.current - lastDrawnPosRef.current);
      if (deltaFrame > 0.005 || needsRedrawRef.current) {
        needsRedrawRef.current = false;
        lastDrawnPosRef.current = currentFrameRef.current;

        const cw = window.innerWidth;
        const ch = window.innerHeight;

        // Warm background fill ensures the canvas is NEVER black/dark
        ctx.fillStyle = '#F4EFE8';
        ctx.fillRect(0, 0, cw, ch);

        const currentImg = getBestFrame(frameIdx);
        if (currentImg) {
          drawFrame(ctx, currentImg, 1);
          lastDrawnImageRef.current = currentImg;
        }

        // Smooth crossfade with next frame when blend is noticeable and next frame is valid
        if (blend > 0.05 && frameIdx !== nextIdx) {
          const nextImg = imagesRef.current[nextIdx];
          if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
            drawFrame(ctx, nextImg, blend);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [drawFrame]);

  // Priority Preloader: Loads keyframes across the whole scroll range first, then hydrates in-betweens
  useEffect(() => {
    let loaded = 0;
    const images: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);
    imagesRef.current = images;

    // Helper to load a single frame
    const loadFrame = (indexOneBased: number, onComplete?: (success: boolean) => void) => {
      const idx = indexOneBased - 1;
      if (images[idx]) {
        if (onComplete) onComplete(true);
        return;
      }

      const num = String(indexOneBased).padStart(3, '0');
      const img = new Image();
      img.src = `${IMAGE_DIR}ezgif-frame-${num}.jpg`;

      img.onload = () => {
        images[idx] = img;
        loaded++;
        needsRedrawRef.current = true;
        const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
        setLoadPct(pct);
        if (onComplete) onComplete(true);
      };

      img.onerror = () => {
        images[idx] = null;
        if (onComplete) onComplete(false);
      };
    };

    // Stage 1: Load Hero Frames (frames 1-3) + Keyframes distributed evenly across 0-100% of the page
    // Every 6th frame guarantees that anywhere the user scrolls, a crisp desk frame is ready
    const keyframes: number[] = [1, 2, 3];
    for (let f = 6; f <= TOTAL_FRAMES; f += 6) {
      if (!keyframes.includes(f)) keyframes.push(f);
    }
    if (!keyframes.includes(TOTAL_FRAMES)) keyframes.push(TOTAL_FRAMES);

    let keyframesLoaded = 0;
    const totalKeyframes = keyframes.length;

    keyframes.forEach((frameNum) => {
      loadFrame(frameNum, () => {
        keyframesLoaded++;
        // As soon as hero frames and keyframes are in, the user can start exploring safely
        if (keyframesLoaded >= Math.min(12, totalKeyframes)) {
          setIsLoading(false);
        }
      });
    });

    // Stage 2: Hydrate remaining in-between frames in staggered batches
    const remainingFrames: number[] = [];
    for (let f = 1; f <= TOTAL_FRAMES; f++) {
      if (!keyframes.includes(f)) {
        remainingFrames.push(f);
      }
    }

    let batchIdx = 0;
    const BATCH_SIZE = 8;
    const loadNextBatch = () => {
      if (batchIdx >= remainingFrames.length) return;
      const currentBatch = remainingFrames.slice(batchIdx, batchIdx + BATCH_SIZE);
      batchIdx += BATCH_SIZE;

      let batchDone = 0;
      currentBatch.forEach((frameNum) => {
        loadFrame(frameNum, () => {
          batchDone++;
          if (batchDone >= currentBatch.length) {
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => loadNextBatch(), { timeout: 350 });
            } else {
              setTimeout(loadNextBatch, 60);
            }
          }
        });
      });
    };

    // Start background hydration
    const hydrationTimer = setTimeout(() => {
      loadNextBatch();
    }, 350);

    // Fallback safety timeout: NEVER block the user's screen forever
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => {
      clearTimeout(hydrationTimer);
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Track active section for story rail & navbar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'problem', 'syllabus-structure', 'coverage', 'connections', 'final-cta'];
      const scrollPos = window.scrollY + window.innerHeight * 0.38;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth submission: Signs the student in and navigates directly into the Study Space
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authTab === 'forgot') {
      setAuthMessage('Password reset instructions sent to your email.');
      setTimeout(() => {
        setAuthTab('signin');
        setAuthMessage(null);
      }, 2000);
      return;
    }

    setAuthSubmitting(true);

    try {
      let result: { user: import('../services/api').AuthUser };

      if (authTab === 'signup') {
        result = await api.signup({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          password: authForm.password,
        });
      } else {
        result = await api.login(
          authForm.email.trim(),
          authForm.password,
        );
      }

      loginWithUser(result.user);
      setAuthModalOpen(false);
      if (result.user.onboardingCompleted) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const openAuth = (tab: 'signin' | 'signup') => {
    setAuthTab(tab);
    setAuthForm({ name: '', email: '', password: '' });
    setAuthError(null);
    setAuthMessage(null);
    setAuthModalOpen(true);
  };

  return (
    <div className="landing-page-root">
      {/* Loading Overlay */}
      <div className={`loader-overlay ${!isLoading ? 'hidden' : ''}`} role="status" aria-live="polite">
        <div className="loader-ring" />
        <div className="loader-text">Loading experience… {loadPct}%</div>
      </div>

      {/* Persistent Background Canvas (Scrubbed smoothly on scroll) */}
      <div className="fixed-canvas-container">
        <canvas
          id="hero-canvas"
          ref={canvasRef}
          aria-label="Stop-motion academic materials organizing across the desk"
        />
      </div>
      <div className="fixed-scrim" aria-hidden="true" />

      {/* Fixed Top Navbar */}
      <header className="navbar" id="navbar">
        <div className="nav-container">
          <a href="#hero" className="nav-brand" aria-label="Atelier Folio Home" onClick={() => setMobileMenuOpen(false)}>
            Atelier<span className="nav-brand-dot" />
          </a>

          {/* Desktop Nav Links */}
          <nav aria-label="Story Navigation" className="nav-menu-desktop">
            <ul className="nav-menu">
              <li>
                <a
                  href="#problem"
                  className={`nav-link ${activeSection === 'problem' ? 'active' : ''}`}
                >
                  The Problem
                </a>
              </li>
              <li>
                <a
                  href="#syllabus-structure"
                  className={`nav-link ${activeSection === 'syllabus-structure' ? 'active' : ''}`}
                >
                  Hierarchy
                </a>
              </li>
              <li>
                <a
                  href="#coverage"
                  className={`nav-link ${activeSection === 'coverage' ? 'active' : ''}`}
                >
                  Coverage
                </a>
              </li>
              <li>
                <a
                  href="#connections"
                  className={`nav-link ${activeSection === 'connections' ? 'active' : ''}`}
                >
                  Connections
                </a>
              </li>
            </ul>
          </nav>

          {/* Desktop & Mobile Actions */}
          <div className="nav-actions">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="nav-login nav-desktop-item"
                  onClick={() => openAuth('signin')}
                  id="nav-signin-btn"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn btn-primary nav-desktop-item"
                  onClick={() => openAuth('signup')}
                  id="nav-signup-btn"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <div className="nav-auth-user-bar nav-desktop-item">
                <span className="nav-user-greeting">
                  Hi, <strong>{user?.name?.split(' ')[0] || 'Student'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-primary"
                  id="nav-enter-space-btn"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  Study Space &rarr;
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-inline-link"
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '12px', cursor: 'pointer' }}
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Mobile quick action button when authenticated */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary nav-mobile-cta"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Space &rarr;
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              className="nav-mobile-toggle"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown / Drawer Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu" id="landing-mobile-menu">
            <div className="landing-mobile-menu-inner">
              <div className="landing-mobile-links">
                <a
                  href="#hero"
                  className="landing-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Overview
                </a>
                <a
                  href="#problem"
                  className="landing-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  The Problem
                </a>
                <a
                  href="#syllabus-structure"
                  className="landing-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Hierarchy
                </a>
                <a
                  href="#coverage"
                  className="landing-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Coverage
                </a>
                <a
                  href="#connections"
                  className="landing-mobile-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connections
                </a>
              </div>

              <div className="landing-mobile-menu-footer">
                {!isAuthenticated ? (
                  <div className="landing-mobile-auth-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuth('signin');
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuth('signup');
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="landing-mobile-auth-row">
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '10px' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/dashboard');
                      }}
                    >
                      Enter Study Space &rarr;
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut size={14} /> Sign Out ({user?.name})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Right-side Story Progress Rail */}
      <aside className="story-rail" aria-label="Chapter progress">
        {[
          { id: 'hero', label: '01 Overview' },
          { id: 'problem', label: '02 The Problem' },
          { id: 'syllabus-structure', label: '03 Hierarchy' },
          { id: 'coverage', label: '04 Coverage' },
          { id: 'connections', label: '05 Context' },
          { id: 'final-cta', label: '06 Workspace' },
        ].map((item) => (
          <li
            key={item.id}
            className={`rail-item ${activeSection === item.id ? 'active' : ''}`}
            data-target={item.id}
          >
            <a href={`#${item.id}`}>
              <span className="rail-dot" />
              <span className="rail-label">{item.label}</span>
            </a>
          </li>
        ))}
      </aside>

      {/* Continuous Natural Webpage Content Flow */}
      <main className="main-content" id="main-content">
        {/* Section 1: Hero Overview */}
        <section className="content-section" id="hero" aria-labelledby="hero-title">
          <div className="content-container">
            <div className="hero-tag">
              <span className="hero-tag-pulse" />
              The Academic Workspace
            </div>
            <h1 className="section-title" id="hero-title">
              Your notes. Finally organized around what you study.
            </h1>
            <p className="section-subtitle">
              Notes, syllabi, and previous-year questions — united into a single, syllabus-aware workspace. Watch your materials fall into place as you scroll.
            </p>

            {/* Action Row: Exclusively Auth Options for Guests */}
            <div className="hero-action-row" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="btn-hero-cta"
                    onClick={() => openAuth('signup')}
                    id="hero-get-started"
                  >
                    Get Started (Sign Up)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openAuth('signin')}
                    id="hero-sign-in"
                    style={{ borderRadius: '9999px', padding: '13px 26px', fontSize: '15px' }}
                  >
                    Sign In to Account
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-hero-cta"
                    onClick={() => navigate('/dashboard')}
                    id="hero-enter-space"
                  >
                    Enter Study Space &rarr;
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={logout}
                    style={{ borderRadius: '9999px', padding: '13px 24px', fontSize: '15px' }}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>

            <div className="hero-scroll-prompt">
              <div className="prompt-mouse">
                <div className="prompt-wheel" />
              </div>
              <span>Scroll down to explore</span>
            </div>
          </div>
        </section>

        {/* Section 2: The Problem (Academic Chaos) */}
        <section className="content-section" id="problem" aria-labelledby="problem-heading">
          <div className="content-container">
            <div className="text-center">
              <span className="section-eyebrow">The Academic Reality</span>
              <h2 className="section-title" id="problem-heading">
                Too much material. No structure.
              </h2>
              <p className="section-subtitle">
                Course materials scattered everywhere: group chats, unindexed textbook PDFs, handwritten scans, and exam questions from five years ago with no context.
              </p>
            </div>

            <div className="chaos-grid">
              <div className="chaos-card">
                <div className="chaos-icon">📝</div>
                <div className="chaos-info">
                  <span className="chaos-title">Lecture 04 — Virtual Memory</span>
                  <span className="chaos-desc">Handwritten Notes · 4.2 MB · Unsorted</span>
                </div>
              </div>

              <div className="chaos-card">
                <div className="chaos-icon">📑</div>
                <div className="chaos-info">
                  <span className="chaos-title">Modern OS — Tanenbaum (Ch 3)</span>
                  <span className="chaos-desc">Reference PDF · 480 pages · Unindexed</span>
                </div>
              </div>

              <div className="chaos-card">
                <div className="chaos-icon">❓</div>
                <div className="chaos-info">
                  <span className="chaos-title">2023 End-Sem Exam Paper</span>
                  <span className="chaos-desc">Past Question 4 · Page Faults</span>
                </div>
              </div>

              <div className="chaos-card">
                <div className="chaos-icon">📋</div>
                <div className="chaos-info">
                  <span className="chaos-title">CS501 Course Syllabus_v2</span>
                  <span className="chaos-desc">Official PDF · Unit 3 Breakdown</span>
                </div>
              </div>

              <div className="chaos-card">
                <div className="chaos-icon">📷</div>
                <div className="chaos-info">
                  <span className="chaos-title">Whiteboard_Deriv_Oct14.jpg</span>
                  <span className="chaos-desc">Phone Camera Snap · Blurry Formula</span>
                </div>
              </div>

              <div className="chaos-card">
                <div className="chaos-icon">📊</div>
                <div className="chaos-info">
                  <span className="chaos-title">Prof_Sharma_LRU_Final.pptx</span>
                  <span className="chaos-desc">Class Slides · 48 slides</span>
                </div>
              </div>
            </div>

            <p className="problem-quote">
              &ldquo;Finding the right thing shouldn't be part of studying.&rdquo;
            </p>
          </div>
        </section>

        {/* Section 3: Syllabus Structure (Intentional Hierarchy) */}
        <section className="content-section" id="syllabus-structure" aria-labelledby="structure-heading">
          <div className="content-container">
            <div className="text-center">
              <span className="section-eyebrow">Intentional Architecture</span>
              <h2 className="section-title" id="structure-heading">
                Everything follows your syllabus.
              </h2>
              <p className="section-subtitle">
                Not a generic folder graveyard. Folio maps every single note, reference, and exam question to the exact course hierarchy of your degree.
              </p>
            </div>

            <div className="hierarchy-flow">
              <div className="hierarchy-vertical-line" />

              {/* Tier 1 */}
              <div className="hierarchy-tier">
                <div className="tier-dot" />
                <div className="tier-label-group">
                  <span className="tier-level">Institution</span>
                  <span className="tier-name">Faculty of Engineering &amp; Technology</span>
                </div>
                <span className="tier-badge">University Level</span>
              </div>

              {/* Tier 2 */}
              <div className="hierarchy-tier">
                <div className="tier-dot" />
                <div className="tier-label-group">
                  <span className="tier-level">Department</span>
                  <span className="tier-name">Computer Science &amp; Engineering</span>
                </div>
                <span className="tier-badge">Curriculum 2023–26</span>
              </div>

              {/* Tier 3 */}
              <div className="hierarchy-tier">
                <div className="tier-dot" />
                <div className="tier-label-group">
                  <span className="tier-level">Academic Term</span>
                  <span className="tier-name">Semester V (Autumn Cycle)</span>
                </div>
                <span className="tier-badge">6 Core Subjects</span>
              </div>

              {/* Tier 4 */}
              <div className="hierarchy-tier">
                <div className="tier-dot" />
                <div className="tier-label-group">
                  <span className="tier-level">Subject</span>
                  <span className="tier-name">CS501 · Operating Systems</span>
                </div>
                <span className="tier-badge">4 Credits</span>
              </div>

              {/* Tier 5 */}
              <div className="hierarchy-tier">
                <div className="tier-dot" />
                <div className="tier-label-group">
                  <span className="tier-level">Unit 3</span>
                  <span className="tier-name">Memory Management &amp; Virtual Memory</span>
                </div>
                <span className="tier-badge">4 Exam Topics</span>
              </div>

              {/* Tier 6 (Active Topic with Live Branches) */}
              <div className="hierarchy-tier tier-terminal active" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="tier-dot" />
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div className="tier-label-group">
                    <span className="tier-level" style={{ color: 'var(--accent)' }}>Target Topic 3.4</span>
                    <span className="tier-name">Virtual Memory &amp; Page Replacement Algorithms</span>
                  </div>
                  <span className="tier-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 700 }}>
                    Active Topic
                  </span>
                </div>

                <div className="tier-branches-row">
                  <div className="tier-branch-card">
                    <span style={{ fontSize: '15px' }}>📝</span>
                    <div>
                      <strong>4 Curated Notes</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Student annotations</div>
                    </div>
                  </div>

                  <div className="tier-branch-card">
                    <span style={{ fontSize: '15px' }}>📑</span>
                    <div>
                      <strong>7 Solved PYQs</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>2019–2024 exams</div>
                    </div>
                  </div>

                  <div className="tier-branch-card">
                    <span style={{ fontSize: '15px' }}>💡</span>
                    <div>
                      <strong>3 Key References</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Textbook chapters</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Coverage Section (Exam Preparedness) */}
        <section className="content-section" id="coverage" aria-labelledby="coverage-heading">
          <div className="content-container">
            <div className="text-center">
              <span className="section-eyebrow">Exam Visibility</span>
              <h2 className="section-title" id="coverage-heading">
                Know what your resources actually cover.
              </h2>
              <p className="section-subtitle">
                See your resources directly against the syllabus you're studying. Spot blind spots before exam week, not during it.
              </p>
            </div>

            <div className="coverage-box">
              <div className="coverage-box-header">
                <div className="coverage-crumbs">
                  <span>CS501 · Operating Systems</span>
                  <span style={{ color: 'var(--text-tertiary)', margin: '0 4px' }}>/</span>
                  <strong>Unit 3 — Memory Management</strong>
                </div>
                <div className="coverage-pill">
                  <span>✓</span> 4 of 4 Topics Covered · 100% Exam-Ready
                </div>
              </div>

              <ul className="coverage-item-list">
                <li className="coverage-item">
                  <div className="coverage-left">
                    <div className="coverage-check-circle">✓</div>
                    <span className="coverage-title-text">Virtual Memory, Hardware MMU &amp; Address Translation</span>
                  </div>
                  <div className="coverage-right">
                    <span className="coverage-stats">4 Notes · 3 PYQs</span>
                    <span className="badge-status">Covered</span>
                  </div>
                </li>

                <li className="coverage-item">
                  <div className="coverage-left">
                    <div className="coverage-check-circle">✓</div>
                    <span className="coverage-title-text">Paging Architecture &amp; Multi-level Page Tables</span>
                  </div>
                  <div className="coverage-right">
                    <span className="coverage-stats">5 Notes · 8 PYQs</span>
                    <span className="badge-status">Covered</span>
                  </div>
                </li>

                <li className="coverage-item">
                  <div className="coverage-left">
                    <div className="coverage-check-circle">✓</div>
                    <span className="coverage-title-text">Segmentation &amp; Memory Protection Rings</span>
                  </div>
                  <div className="coverage-right">
                    <span className="coverage-stats">3 Notes · 2 PYQs</span>
                    <span className="badge-status">Covered</span>
                  </div>
                </li>

                <li className="coverage-item">
                  <div className="coverage-left">
                    <div className="coverage-check-circle">✓</div>
                    <span className="coverage-title-text">Page Replacement Algorithms (FIFO, LRU, Optimal, Clock)</span>
                  </div>
                  <div className="coverage-right">
                    <span className="coverage-stats">6 Notes · 12 PYQs</span>
                    <span className="badge-status">Covered</span>
                  </div>
                </li>
              </ul>

              <div className="coverage-box-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--accent-green)' }}>✓</span>
                  <span>18 Verified Student Notes &amp; 25 Past Examination Questions</span>
                </div>
                <div>Strictly filtered to university syllabus</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Connections Section (Study with Context) */}
        <section className="content-section" id="connections" aria-labelledby="connections-heading">
          <div className="content-container">
            <div className="text-center">
              <span className="section-eyebrow">Intelligent Context</span>
              <h2 className="section-title" id="connections-heading">
                Study with context.
              </h2>
              <p className="section-subtitle">
                The platform does more than store resources. It connects them to what you're studying so you can see the complete picture in one view.
              </p>
            </div>

            <div className="context-stage">
              <div className="context-center-hub">
                <div className="hub-eyebrow-text">Active Focus Topic</div>
                <div className="hub-title-text">Page Replacement Algorithms</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Unit 3.4 · Core Weightage: 14 Marks
                </div>
              </div>

              <div className="context-svg-connector">
                <svg viewBox="0 0 900 48" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M 450,0 C 450,24 150,20 150,48" fill="none" stroke="#C84B28" strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
                  <path d="M 450,0 C 450,24 450,24 450,48" fill="none" stroke="#1D58A7" strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
                  <path d="M 450,0 C 450,24 750,20 750,48" fill="none" stroke="#255E2E" strokeWidth="2" strokeDasharray="4 4" opacity="0.75" />
                </svg>
              </div>

              <div className="satellites-grid">
                <div className="satellite-item">
                  <div className="satellite-pill sat-notes">📝 3 Relevant Notes</div>
                  <h3 className="satellite-head">Bélády's Anomaly &amp; LRU Stack</h3>
                  <p className="satellite-body">
                    Step-by-step trace showing why adding frames can increase faults, with LRU stack proofs.
                  </p>
                </div>

                <div className="satellite-item">
                  <div className="satellite-pill sat-pyq">📑 5 Past Questions</div>
                  <h3 className="satellite-head">Midterm &amp; Final Exam Papers</h3>
                  <p className="satellite-body">
                    Featured in 2021 (Q3b), 2023 (Q5), and 2024 university finals with verified step-by-step solutions.
                  </p>
                </div>

                <div className="satellite-item">
                  <div className="satellite-pill sat-resources">💡 2 Visualizers</div>
                  <h3 className="satellite-head">Interactive Simulator</h3>
                  <p className="satellite-body">
                    Simulate page hit/fault ratios in real-time across custom reference strings with FIFO and LRU.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Final CTA Section */}
        <section className="content-section" id="final-cta" aria-labelledby="cta-heading">
          <div className="content-container text-center">
            <span className="section-eyebrow">Start Learning</span>
            <h2 className="section-title serif" id="cta-heading">
              Everything you need to study, organized around your syllabus.
            </h2>
            <p className="section-subtitle">
              Turn academic chaos into structured clarity. Sign in to enter your personalized study space.
            </p>

            <div className="btn-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
              {!isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openAuth('signup')}
                    id="final-signup-btn"
                    style={{ padding: '14px 34px', fontSize: '15px' }}
                  >
                    Create Free Account (Sign Up)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openAuth('signin')}
                    id="final-signin-btn"
                    style={{ padding: '14px 30px', fontSize: '15px' }}
                  >
                    Sign In to Existing Account
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/dashboard')}
                  id="final-enter-space-btn"
                  style={{ padding: '14px 36px', fontSize: '15px' }}
                >
                  Enter Study Space Workspace &rarr;
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal Dialog (Sign In / Sign Up / Forgot Password) */}
      <div
        className={`auth-modal-backdrop ${authModalOpen ? 'active' : ''}`}
        id="auth-modal"
        aria-hidden={!authModalOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAuthModalOpen(false);
        }}
      >
        <div className="auth-modal-card">
          <button
            className="auth-modal-close"
            id="modal-close-btn"
            aria-label="Close dialog"
            onClick={() => setAuthModalOpen(false)}
          >
            &times;
          </button>

          {/* Atelier Brand Emblem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--color-primary, #D95D39)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '1.5px 1.5px 0px rgba(31, 36, 33, 0.12)'
            }}>
              <GraduationCap size={18} color="#FFFFFF" strokeWidth={2} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                fontWeight: 600,
                fontSize: '1.15rem',
                color: 'var(--color-deep, #1F2421)',
                lineHeight: 1.1
              }}>
                Atelier Notes
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted, #706B63)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Academic Study Space
              </div>
            </div>
          </div>

          {/* Tab Switcher for Sign In / Sign Up */}
          <div className="auth-tabs" id="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${authTab === 'signin' ? 'active' : ''}`}
              onClick={() => setAuthTab('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`}
              onClick={() => setAuthTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {authMessage && (
            <div style={{ padding: '8px 12px', background: 'rgba(32, 89, 41, 0.15)', color: 'var(--accent-green)', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
              {authMessage}
            </div>
          )}

          {authError && (
            <div style={{ padding: '8px 12px', background: 'rgba(200, 50, 50, 0.12)', color: '#e85454', borderRadius: '6px', fontSize: '12px', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          {/* 1. Sign In View */}
          {authTab === 'signin' && (
            <div className="auth-view active" id="view-signin">
              <h3 className="auth-title" id="modal-title">Sign in to your account</h3>
              <p className="auth-sub">Enter your credentials to access your Study Space workspace.</p>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label htmlFor="signin-email">Email Address</label>
                  <input
                    type="email"
                    id="signin-email"
                    placeholder="Enter your email address"
                    autoComplete="off"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="signin-password">Password</label>
                    <button
                      type="button"
                      className="btn-inline-link"
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => setAuthTab('forgot')}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    id="signin-password"
                    placeholder="Enter your password"
                    autoComplete="off"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '8px' }} disabled={authSubmitting}>
                  {authSubmitting ? 'Signing in…' : <>Sign In &amp; Enter Study Space &rarr;</>}
                </button>
              </form>

              <div className="auth-footer-text" style={{ marginTop: '16px', fontSize: '13px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthTab('signup');
                    setAuthForm({ name: '', email: '', password: '' });
                    setAuthError(null);
                  }}
                >
                  Create one now (Sign Up)
                </button>
              </div>
            </div>
          )}

          {/* 2. Sign Up View */}
          {authTab === 'signup' && (
            <div className="auth-view active" id="view-signup">
              <h3 className="auth-title">Create your student workspace</h3>
              <p className="auth-sub">Register to explore verified notes, syllabus coverage, and past exam papers.</p>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label htmlFor="signup-name">Full Name</label>
                  <input
                    type="text"
                    id="signup-name"
                    placeholder="Enter your full name"
                    autoComplete="off"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email">Email Address</label>
                  <input
                    type="email"
                    id="signup-email"
                    placeholder="Enter your college or personal email"
                    autoComplete="off"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password">Create Password</label>
                  <input
                    type="password"
                    id="signup-password"
                    placeholder="Create a password (min. 8 characters)"
                    autoComplete="off"
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '8px' }} disabled={authSubmitting}>
                  {authSubmitting ? 'Creating account…' : <>Create Account &amp; Enter Study Space &rarr;</>}
                </button>
              </form>

              <div className="auth-footer-text" style={{ marginTop: '16px', fontSize: '13px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthTab('signin');
                    setAuthForm({ name: '', email: '', password: '' });
                    setAuthError(null);
                  }}
                >
                  Sign In instead
                </button>
              </div>
            </div>
          )}

          {/* 3. Forgot Password View */}
          {authTab === 'forgot' && (
            <div className="auth-view active" id="view-forgot">
              <h3 className="auth-title">Reset your password</h3>
              <p className="auth-sub">Enter your registered email and we'll send you recovery instructions.</p>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Registered Email</label>
                  <input
                    type="email"
                    id="forgot-email"
                    placeholder="Enter your registered email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', marginTop: '8px' }}>
                  Send Recovery Link
                </button>
              </form>

              <div className="auth-footer-text" style={{ marginTop: '16px', fontSize: '13px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Remember your password?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setAuthTab('signin')}
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

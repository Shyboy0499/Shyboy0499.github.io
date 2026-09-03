'use client';

import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

// ---------------------------------------------------------------- Qiuner-style tokens
const BG = '#05070a';
const INK = '#f4f5ef';
const MUTED = '#a1a8ae';
const LINE = 'rgba(244,245,239,0.24)';
const ACID = '#c8ff36';
const BLUE = '#3976ff';
const CORAL = '#ff654b';
const CYAN = '#59e6ff';

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const DISPLAY = "var(--font-serif), Georgia, 'Times New Roman', serif";

// ---------------------------------------------------------------- layout constants
const PAD = 'clamp(18px, 48px, 48px)';
const COPY_W = 'min(560px, 78vw)';

const page: CSSProperties = { background: BG, color: INK, fontFamily: SANS, minHeight: '100vh', paddingTop: 78, position: 'relative' };

// small mono eyebrow:  「01 / STATEMENT」
function Eyebrow({ n, text, accent = ACID }: { n: string; text: string; accent?: string }) {
  return (
    <p style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: MUTED, margin: '0 0 26px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, background: accent }} />
      <span style={{ color: '#e8eae2' }}>{n}</span>
      <span>{text}</span>
    </p>
  );
}

function Chapter({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: `0 ${PAD}`, borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: COPY_W }}>{children}</div>
    </section>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  const routes = [
    ['01', 'Origin', '#origin'],
    ['02', 'About', '#about'],
    ['03', 'Work', '#work'],
    ['04', 'Ship', '#ship'],
  ] as const;

  return (
    <main style={page}>
      {/* ---------- HEADER ---------- */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 78, padding: `0 ${PAD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'rgba(5,7,10,0.7)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${LINE}` }}>
        <a href="#origin" style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none', color: INK }}>
          <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em' }}>SHYBOY0499</span>
        </a>
        <nav style={{ display: 'flex', gap: 26, fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', color: MUTED }}>
          {routes.map((r) => (
            <a key={r[0]} href={r[2]} style={{ color: 'inherit', textDecoration: 'none' }}>{r[1].toUpperCase()}</a>
          ))}
        </nav>
        <a href="https://github.com/Shyboy0499" target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 12, color: INK, textDecoration: 'none' }}>GH ↗</a>
      </header>

      {/* ---------- route rail (right) ---------- */}
      <aside aria-hidden style={{ position: 'fixed', right: 18, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 14, zIndex: 6 }}>
        {routes.map((r, i) => (
          <a key={r[0]} href={r[2]} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: MUTED, fontFamily: MONO, fontSize: 11, flexDirection: 'row-reverse' }}>
            <span style={{ letterSpacing: '0.08em' }}>{r[0]}</span>
            <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: i === 0 ? ACID : LINE }} />
          </a>
        ))}
      </aside>

      {/* ---------- 01 · ORIGIN / HERO ---------- */}
      <section id="origin" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: `0 ${PAD}` }}>
        <div style={{ maxWidth: 980 }}>
          <Reveal>
            <Eyebrow n="01" text="ORIGIN" />
            <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(56px, 8.5vw, 128px)', lineHeight: 0.96, margin: 0 }}>
              Shyboy0499<span style={{ color: ACID }}>.</span>
            </h1>
            <p style={{ color: INK, fontSize: 'clamp(18px, 2.4vw, 24px)', margin: '26px 0 0', maxWidth: 520, lineHeight: 1.6 }}>
              Turning deeps into signals.<br />
              <span style={{ color: ACID }}>DeepSeek, LLMs & ML.</span>
            </p>
            <div style={{ display: 'flex', gap: 26, marginTop: 30, fontFamily: MONO, fontSize: 12, color: MUTED, letterSpacing: '0.06em' }}>
              <span>UTS · Sydney</span>
              <span>Since 2024</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 02 · ABOUT ---------- */}
      <Chapter id="about">
        <Reveal>
          <Eyebrow n="02" text="ABOUT" />
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(38px, 5vw, 72px)', lineHeight: 1.02, margin: '0 0 26px' }}>
            About<span style={{ color: ACID }}>.</span>
          </h2>
          <p style={{ color: INK, fontSize: 17, lineHeight: 1.8, margin: '0 0 20px' }}>
            Second-year computer science student at UTS. I'm drawn to DeepSeek, LLMs, and machine learning — and to what
            they make possible when you actually build with them.
          </p>
          <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.8, margin: 0 }}>
            The best way to learn, I've found, is to build and ship. So I turn ideas into open-source tools and plugins —
            improving the tools I use, fixing what's broken, and publishing what I learn.
          </p>
        </Reveal>
      </Chapter>

      {/* ---------- 03 · WORK ---------- */}
      <Chapter id="work">
        <Reveal>
          <Eyebrow n="03" text="WORK" />
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(38px, 5vw, 72px)', lineHeight: 1.02, margin: '0 0 40px' }}>
            Work<span style={{ color: ACID }}>.</span>
          </h2>
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { t: 'DeepSeek Harness ecosystem', d: 'Plugins for the DeepSeek Harness agent system — docs, fixes and tooling across the ecosystem.' },
            { t: 'dsh-git-tools', d: 'A plugin suite for git and code-review workflows inside DeepSeek-based agents.' },
            { t: 'DeepSeek-Obsidian', d: 'Tooling that connects DeepSeek workflows to knowledge management in Obsidian.' },
          ].map((p, i) => (
            <Reveal key={p.t} delay={i * 0.05}>
              <div style={{ borderTop: `1px solid ${LINE}`, padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
                <h3 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(22px, 3vw, 34px)', margin: 0 }}>{p.t}</h3>
                <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 320, textAlign: 'right' }}>{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Chapter>

      {/* ---------- 04 · SHIP (open source) ---------- */}
      <Chapter id="ship">
        <Reveal>
          <Eyebrow n="04" text="SHIP" accent={CYAN} />
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(38px, 5vw, 72px)', lineHeight: 1.02, margin: '0 0 26px' }}>
            Ship<span style={{ color: CYAN }}>.</span>
          </h2>
          <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.8, margin: 0, maxWidth: 480 }}>
            Open source is how I learn. A growing body of fixes and contributions across public repos — built by reading,
            breaking and fixing real code.
          </p>
        </Reveal>
      </Chapter>

      {/* ---------- 05 · CONTACT ---------- */}
      <section id="contact" style={{ position: 'relative', minHeight: '70vh', padding: `0 ${PAD}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderTop: `1px solid ${LINE}` }}>
        <Reveal>
          <Eyebrow n="05" text="CONTACT" />
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 1, margin: 0 }}>
            Say hi<span style={{ color: ACID }}>.</span>
          </h2>
          <p style={{ color: MUTED, maxWidth: 460, fontSize: 16, lineHeight: 1.8, margin: '26px 0 34px' }}>
            If you're into DeepSeek, LLMs, ML — or building strange, wonderful web things — I'd love to hear from you.
          </p>
          <div style={{ display: 'flex', gap: 30, fontFamily: MONO, fontSize: 15 }}>
            <a href="mailto:saltlight0609@gmail.com" style={{ color: INK, textDecoration: 'none', borderBottom: `1px solid ${ACID}`, paddingBottom: 3 }}>saltlight0609@gmail.com ↗</a>
            <a href="https://github.com/Shyboy0499" target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: 'none', borderBottom: `1px solid ${LINE}`, paddingBottom: 3 }}>GitHub ↗</a>
          </div>
        </Reveal>
      </section>

      <footer style={{ padding: `28px ${PAD}`, borderTop: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: MUTED }}>
        <span>© 2026 Shyboy0499</span>
        <span>STATIC · BUILT ON GITHUB</span>
        <a href="#origin" style={{ color: 'inherit', textDecoration: 'none' }}>BACK TO ORIGIN ↑</a>
      </footer>
    </main>
  );
}

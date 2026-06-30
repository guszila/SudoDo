"use client";

import { useEffect, useState } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────

function Star({ cx, cy, r, delay = 0 }) {
  return (
    <circle
      cx={cx} cy={cy} r={r} fill="white"
      style={{
        animation: `starTwinkle 2.5s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function Cloud({ cx, cy, scale = 1, opacity = 0.6, fill = "white", delay = 0, duration = 8 }) {
  const s = scale;
  return (
    <g
      style={{
        opacity,
        animation: `floatCloud ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <ellipse cx={cx}           cy={cy}        rx={38*s} ry={18*s} fill={fill} />
      <ellipse cx={cx - 22*s}    cy={cy + 5*s}  rx={22*s} ry={13*s} fill={fill} />
      <ellipse cx={cx + 22*s}    cy={cy + 5*s}  rx={26*s} ry={14*s} fill={fill} />
      <ellipse cx={cx}           cy={cy + 8*s}  rx={32*s} ry={14*s} fill={fill} />
    </g>
  );
}

function Moon({ cx, cy, r }) {
  return (
    <g style={{ animation: "moonGlow 4s ease-in-out infinite" }}>
      <circle cx={cx} cy={cy} r={r + 6} fill="rgba(255,230,100,0.12)" />
      <circle cx={cx} cy={cy} r={r}     fill="#ffe066" />
      <circle cx={cx + r*0.38} cy={cy - r*0.28} r={r*0.72} fill="#c8b400" opacity={0.22} />
    </g>
  );
}

function Sun({ cx, cy, r }) {
  return (
    <g style={{ animation: "sunPulse 3s ease-in-out infinite" }}>
      <circle cx={cx} cy={cy} r={r + 20} fill="rgba(255,230,80,0.2)" />
      <circle cx={cx} cy={cy} r={r + 10} fill="rgba(255,230,80,0.3)" />
      <circle cx={cx} cy={cy} r={r}      fill="#ffe840" />
    </g>
  );
}

// ─── theme configs ───────────────────────────────────────────────────────────

function getTheme(hour) {
  if (hour >= 22 || hour < 1) return "night";
  if (hour < 5)  return "latenight";
  if (hour < 7)  return "sunrise";
  if (hour < 17) return "day";
  if (hour < 19) return "sunset";
  return "evening";
}

const THEMES = {
  night: {
    bg: ["#0a0e2e", "#1a1040"],
    label: "ดึก",
    greeting: (n) => `สวัสดีตอนดึก ${n}`,
    badgeBg: "rgba(255,255,255,0.12)",
    badgeColor: "#e0d9ff",
    textColor: "rgba(255,255,255,0.95)",
    subColor:  "rgba(255,255,255,0.6)",
  },
  latenight: {
    bg: ["#050818", "#0d0824"],
    label: "ตีสี่",
    greeting: (n) => `ยังไม่นอนเหรอ ${n}?`,
    badgeBg: "rgba(255,255,255,0.1)",
    badgeColor: "#b8b0e8",
    textColor: "rgba(255,255,255,0.9)",
    subColor:  "rgba(255,255,255,0.5)",
  },
  sunrise: {
    bg: ["#f97316", "#fbbf24"],
    label: "เช้า",
    greeting: (n) => `อรุณสวัสดิ์ ${n}`,
    badgeBg: "rgba(255,255,255,0.25)",
    badgeColor: "#7c2d12",
    textColor: "#3b0a00",
    subColor:  "rgba(59,10,0,0.6)",
  },
  day: {
    bg: ["#38bdf8", "#7dd3fc"],
    label: "กลางวัน",
    greeting: (n) => `สวัสดีตอนกลางวัน ${n}`,
    badgeBg: "rgba(255,255,255,0.3)",
    badgeColor: "#0c4a6e",
    textColor: "#0c4a6e",
    subColor:  "rgba(12,74,110,0.65)",
  },
  sunset: {
    bg: ["#7e22ce", "#f97316"],
    label: "เย็น",
    greeting: (n) => `สวัสดีตอนเย็น ${n}`,
    badgeBg: "rgba(255,255,255,0.18)",
    badgeColor: "#fde68a",
    textColor: "white",
    subColor:  "rgba(255,255,255,0.65)",
  },
  evening: {
    bg: ["#1a1040", "#0a0e2e"],
    label: "ค่ำ",
    greeting: (n) => `สวัสดีตอนค่ำ ${n}`,
    badgeBg: "rgba(255,255,255,0.12)",
    badgeColor: "#c4b5fd",
    textColor: "rgba(255,255,255,0.95)",
    subColor:  "rgba(255,255,255,0.6)",
  },
};

// ─── sky scenes ──────────────────────────────────────────────────────────────

function NightSky() {
  const stars = [
    { cx:80,  cy:28, r:1.5, d:0   },
    { cx:140, cy:18, r:1.0, d:0.5 },
    { cx:220, cy:35, r:1.8, d:1.2 },
    { cx:300, cy:14, r:1.2, d:0.8 },
    { cx:420, cy:22, r:1.0, d:0.3 },
    { cx:500, cy:38, r:1.4, d:1.5 },
    { cx:580, cy:16, r:1.0, d:0.7 },
    { cx:650, cy:30, r:1.8, d:1.0 },
    { cx:360, cy:44, r:0.9, d:0.2 },
    { cx:460, cy:10, r:1.1, d:1.8 },
  ];
  return (
    <>
      {stars.map((s, i) => <Star key={i} {...s} delay={s.d} />)}
      <Moon cx={605} cy={52} r={28} />
      <Cloud cx={480} cy={58} scale={0.7} opacity={0.13} fill="#a090f0" delay={0}  duration={7}  />
      <Cloud cx={150} cy={75} scale={0.9} opacity={0.18} fill="#7060c0" delay={1}  duration={9}  />
      <Cloud cx={340} cy={45} scale={0.6} opacity={0.10} fill="#8878d0" delay={2}  duration={11} />
    </>
  );
}

function LateNightSky() {
  const stars = Array.from({ length: 14 }, (_, i) => ({
    cx: 45 + i * 47,
    cy: 10 + Math.sin(i * 1.3) * 22,
    r:  0.9 + Math.sin(i) * 0.8,
    d:  (i * 0.3) % 2,
  }));
  return (
    <>
      {stars.map((s, i) => <Star key={i} {...s} delay={s.d} />)}
      <Moon cx={630} cy={45} r={22} />
      <Cloud cx={200} cy={90} scale={0.5} opacity={0.08} fill="#6050a0" duration={10} />
    </>
  );
}

function SunriseSky() {
  return (
    <>
      <Sun cx={620} cy={160} r={28} />
      <Cloud cx={180} cy={55} scale={1.0} opacity={0.55} delay={0} duration={7} />
      <Cloud cx={400} cy={38} scale={0.8} opacity={0.45} delay={1} duration={9} />
      <Cloud cx={560} cy={72} scale={0.7} opacity={0.38} delay={2} duration={11} />
    </>
  );
}

function DaySky() {
  return (
    <>
      <Sun cx={640} cy={30} r={22} />
      <Cloud cx={120} cy={52} scale={1.1} opacity={0.82} delay={0} duration={8}  />
      <Cloud cx={360} cy={36} scale={0.9} opacity={0.75} delay={1} duration={10} />
      <Cloud cx={530} cy={65} scale={0.7} opacity={0.65} delay={2} duration={12} />
    </>
  );
}

function SunsetSky() {
  return (
    <>
      <Sun cx={660} cy={140} r={26} />
      <Cloud cx={150} cy={55} scale={1.0} opacity={0.5}  fill="#e0b0ff" delay={0} duration={7}  />
      <Cloud cx={380} cy={40} scale={0.85} opacity={0.45} fill="#ffb0c0" delay={1} duration={9}  />
      <Cloud cx={540} cy={75} scale={0.7} opacity={0.38} fill="#ffd0a0" delay={2} duration={11} />
      <Star cx={90}  cy={22} r={1.5} delay={0} />
      <Star cx={200} cy={16} r={1.0} delay={0.8} />
    </>
  );
}

function EveningSky() {
  const stars = [
    { cx:60,  cy:20, r:1.2, d:0   },
    { cx:180, cy:32, r:1.0, d:0.6 },
    { cx:280, cy:15, r:1.5, d:1.1 },
    { cx:420, cy:28, r:0.9, d:0.4 },
    { cx:550, cy:18, r:1.3, d:1.4 },
  ];
  return (
    <>
      {stars.map((s, i) => <Star key={i} {...s} delay={s.d} />)}
      <Moon cx={590} cy={55} r={24} />
      <Cloud cx={200} cy={65} scale={0.8} opacity={0.15} fill="#a090f0" delay={0} duration={8}  />
      <Cloud cx={420} cy={48} scale={0.6} opacity={0.12} fill="#8070c0" delay={1} duration={10} />
    </>
  );
}

const SKY_SCENES = {
  night:     NightSky,
  latenight: LateNightSky,
  sunrise:   SunriseSky,
  day:       DaySky,
  sunset:    SunsetSky,
  evening:   EveningSky,
};

// ─── main component ──────────────────────────────────────────────────────────

/**
 * GreetingBanner
 *
 * @param {string}  name       - ชื่อผู้ใช้ เช่น "โฟกัส"
 * @param {string}  dateLabel  - วันที่แสดงใต้ชื่อทักทาย เช่น "อังคาร 9 มิ.ย. 2569"
 * @param {number}  [forceHour] - (optional) ล็อคเวลาเพื่อทดสอบ เช่น forceHour={23}
 * @param {string}  [className] - Tailwind / CSS class เพิ่มเติม
 */
export default function GreetingBanner({ name = "โฟกัส", dateLabel, forceHour, streak = 0, className = "" }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour   = forceHour ?? now.getHours();
  const key    = getTheme(hour);
  const theme  = THEMES[key];
  const Scene  = SKY_SCENES[key];

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  const displayDate = dateLabel ?? now.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "short",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @keyframes starTwinkle {
          0%,100% { opacity:.3; } 50% { opacity:1; }
        }
        @keyframes floatCloud {
          0%,100% { transform:translateX(0);   }
          50%      { transform:translateX(10px); }
        }
        @keyframes moonGlow {
          0%,100% { opacity:.85; } 50% { opacity:1; }
        }
        @keyframes sunPulse {
          0%,100% { opacity:.9;  transform:scale(1);    }
          50%      { opacity:1;   transform:scale(1.04); }
        }
        @keyframes bannerFadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        .greeting-banner-text {
          animation: bannerFadeIn .7s ease-out both;
        }
      `}</style>

      <div
        className={`greeting-banner ${className}`}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          minHeight: 160,
        }}
      >
        {/* sky SVG */}
        <svg
          viewBox="0 0 700 160"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ 
            position:"absolute", 
            inset:0, 
            width:"100%", 
            height:"100%",
          }}
        >
          <defs>
            <linearGradient id={`skyGrad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={theme.bg[0]} />
              <stop offset="100%" stopColor={theme.bg[1]} />
            </linearGradient>
          </defs>
          <rect width="700" height="160" fill={`url(#skyGrad-${key})`} />
          <Scene />
        </svg>

        <div className="max-w-4xl mx-auto w-full h-full relative">
          {/* greeting text */}
          <div
            className="greeting-banner-text absolute bottom-8 left-4 md:bottom-12 md:left-8 z-10 pr-[100px] md:pr-[120px] max-w-full"
          >
            <p style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              color: theme.subColor,
              letterSpacing: "0.3px",
              marginBottom: 4,
            }}>
              {displayDate}
            </p>
            <p style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: theme.textColor,
              lineHeight: 1.2,
            }}>
              {theme.greeting(name)}
            </p>
          </div>

          {/* time badge and streak */}
          <div className="absolute bottom-8 right-4 md:bottom-12 md:right-8 z-10 flex flex-col items-end gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white font-bold text-sm shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
                🔥 {streak}
              </div>
            )}
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 14px",
              borderRadius: 20,
              background: theme.badgeBg,
              color: theme.badgeColor,
              border: `0.5px solid ${theme.badgeColor}50`,
              backdropFilter: "blur(4px)",
            }}>
              {timeStr}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

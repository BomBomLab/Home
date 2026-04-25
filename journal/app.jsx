// Journal — unified warm-paper prototype
// All three views (Daily / Weekly / Monthly) share a single token system.

const { useState, useMemo, useEffect } = React;
const MOBILE_BREAKPOINT = 860;

// ─────────────────────────── Theme definitions ───────────────────────────
// Each palette keeps the SAME structural tokens — only values change.
// All values in oklch; chroma stays very low for a "whisper" feel.
const THEMES = {
  "Warm Paper": {
    '--paper':       'oklch(0.970 0.012 75)',
    '--paper-2':     'oklch(0.988 0.008 80)',
    '--paper-edge':  'oklch(0.945 0.014 70)',
    '--ink':         'oklch(0.305 0.018 55)',
    '--ink-2':       'oklch(0.480 0.014 58)',
    '--ink-3':       'oklch(0.680 0.012 62)',
    '--ink-4':       'oklch(0.820 0.010 68)',
    '--rule':        'oklch(0.880 0.014 65)',
    '--rule-soft':   'oklch(0.935 0.012 70)',
    '--accent':      'oklch(0.660 0.070 42)',
    '--accent-ink':  'oklch(0.520 0.080 40)',
    '--accent-wash': 'oklch(0.955 0.022 50)',
    '--accent-dot':  'oklch(0.880 0.040 48)',
  },
  "Bone + Sepia": {
    '--paper':       'oklch(0.975 0.006 90)',
    '--paper-2':     'oklch(0.992 0.004 90)',
    '--paper-edge':  'oklch(0.950 0.008 88)',
    '--ink':         'oklch(0.285 0.020 60)',
    '--ink-2':       'oklch(0.460 0.016 60)',
    '--ink-3':       'oklch(0.660 0.012 65)',
    '--ink-4':       'oklch(0.810 0.008 70)',
    '--rule':        'oklch(0.870 0.010 70)',
    '--rule-soft':   'oklch(0.930 0.008 75)',
    '--accent':      'oklch(0.600 0.060 55)',
    '--accent-ink':  'oklch(0.460 0.070 50)',
    '--accent-wash': 'oklch(0.950 0.018 65)',
    '--accent-dot':  'oklch(0.870 0.035 55)',
  },
  "Aged Linen": {
    '--paper':       'oklch(0.955 0.020 68)',
    '--paper-2':     'oklch(0.975 0.015 72)',
    '--paper-edge':  'oklch(0.925 0.022 64)',
    '--ink':         'oklch(0.310 0.022 45)',
    '--ink-2':       'oklch(0.490 0.018 48)',
    '--ink-3':       'oklch(0.690 0.015 55)',
    '--ink-4':       'oklch(0.820 0.014 60)',
    '--rule':        'oklch(0.870 0.020 58)',
    '--rule-soft':   'oklch(0.920 0.018 62)',
    '--accent':      'oklch(0.640 0.080 35)',
    '--accent-ink':  'oklch(0.500 0.090 32)',
    '--accent-wash': 'oklch(0.935 0.032 42)',
    '--accent-dot':  'oklch(0.860 0.050 40)',
  },
};

const ACCENT_DENSITY = {
  whisper:   { washAlpha: 0.55, chipOpacity: 0.85 },
  muted:     { washAlpha: 0.85, chipOpacity: 1.00 },
  confident: { washAlpha: 1.00, chipOpacity: 1.00 },
};

// ─────────────────────────── Icons (inline SVG) ───────────────────────────
const Chevron = ({dir='left', size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left'
      ? <polyline points="15 18 9 12 15 6" />
      : <polyline points="9 18 15 12 9 6" />}
  </svg>
);
const Plus = ({size=12}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

// ─────────────────────────── Data ───────────────────────────
const DOW_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const getIsMobileViewport = () => (
  typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
);

// Pick a single "anchor" event title to summarize a day:
// the longest event that is not rest (sleep), travel, or life.hygiene.
const summarizeDay = (events) => {
  if (!events || !events.length) return '';
  const candidates = events
    .filter(e => e.categoryId !== 'rest')
    .filter(e => !(e.subcategoryId || '').startsWith('life.hygiene'))
    .slice()
    .sort((a, b) => (b.endHour - b.startHour) - (a.endHour - a.startHour));
  return (candidates[0] || events[0]).title;
};

const DATA = window.JOURNAL_DATA;
const ALL_DATE_KEYS = (() => {
  const keys = new Set([
    ...Object.keys((DATA && DATA.eventsByDay) || {}),
    ...Object.keys((DATA && DATA.DIARY_SUMMARY_BY_DAY) || {}),
    ...Object.keys((DATA && DATA.TODO_BY_DAY) || {}),
  ]);
  return Array.from(keys).sort();
})();
const TODAY_KEY = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();
const parseDateKey = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const formatDateKey = (date) => (
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
);

const addDays = (dateKey, days) => {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
};

const addMonths = (dateKey, delta) => {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + delta);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return formatDateKey(date);
};

const formatDisplayDate = (dateKey, options) => (
  parseDateKey(dateKey).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
);

const getOrdinal = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  const mod10 = n % 10;
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
};

const getWeekStartKey = (dateKey) => {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(dateKey, diff);
};

const getWeekDateKeys = (dateKey) => {
  const startKey = getWeekStartKey(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(startKey, index));
};

const getDateMeta = (dateKey) => {
  const date = parseDateKey(dateKey);
  return {
    key: dateKey,
    date,
    dayNumber: date.getUTCDate(),
    dayLabel: DOW_LABELS[date.getUTCDay()],
    monthLabel: formatDisplayDate(dateKey, { month: 'short' }).toLowerCase(),
  };
};

const getDayTodos = (dateKey, limit = 6) => {
  if (DATA && DATA.journal && DATA.journal.day && DATA.journal.day[dateKey]) {
    const tasks = DATA.journal.day[dateKey].tasks || [];
    return Array.from({ length: limit }, (_, index) => tasks[index] || { text: '', done: false });
  }
  const todos = ((DATA && DATA.TODO_BY_DAY[dateKey]) || []).filter((item) => item.status !== 'dropped');
  return Array.from({ length: limit }, (_, index) => {
    const item = todos[index];
    return { text: item ? item.text : '', done: item ? item.status === 'done' : false };
  });
};

const getWeekTodos = (dateKeys, limit = 6) => {
  const weekKey = dateKeys[0];
  if (DATA && DATA.journal && DATA.journal.week && DATA.journal.week[weekKey]) {
    const tasks = DATA.journal.week[weekKey].tasks || [];
    return Array.from({ length: limit }, (_, index) => tasks[index] || { text: '', done: false });
  }
  const merged = [];
  const seen = new Set();
  dateKeys.forEach((dateKey) => {
    (((DATA && DATA.TODO_BY_DAY[dateKey]) || []).filter((item) => item.status !== 'dropped')).forEach((item) => {
      if (seen.has(item.text)) return;
      seen.add(item.text);
      merged.push({ text: item.text, done: item.status === 'done' });
    });
  });
  return Array.from({ length: limit }, (_, index) => merged[index] || { text: '', done: false });
};

const getWeekData = (dateKey) => {
  const todayKey = TODAY_KEY;
  const weekKey = getWeekStartKey(dateKey);
  if (DATA && DATA.journal && DATA.journal.week && DATA.journal.week[weekKey]) {
    return (DATA.journal.week[weekKey].days || []).map((day) => ({
      dateKey: day.dateKey,
      date: day.dayNumber,
      day: String(day.weekday || '').toLowerCase(),
      month: formatDisplayDate(day.dateKey, { month: 'short' }).toLowerCase(),
      events: day.events || [],
      tasks: day.metrics ? day.metrics.eventCount : (day.events || []).length,
      isToday: day.dateKey === todayKey,
    }));
  }
  return getWeekDateKeys(dateKey).map((dk) => {
    const meta = getDateMeta(dk);
    const events = (DATA && DATA.eventsByDay[dk]) || [];
    return {
      dateKey: dk,
      date: meta.dayNumber,
      day: meta.dayLabel,
      month: meta.monthLabel,
      events,
      tasks: events.length,
      isToday: dk === todayKey,
    };
  });
};

const getWeekPriorities = (dateKeys, limit = 3) => {
  const weekKey = dateKeys[0];
  if (DATA && DATA.journal && DATA.journal.week && DATA.journal.week[weekKey]) {
    const priorities = DATA.journal.week[weekKey].priorities || [];
    return Array.from({ length: limit }, (_, index) => priorities[index] || '');
  }
  const all = [];
  dateKeys.forEach((dk) => {
    ((DATA && DATA.eventsByDay[dk]) || []).forEach((e) => {
      if (e.categoryId === 'rest' || e.categoryId === 'travel') return;
      all.push({ ...e, dk });
    });
  });
  all.sort((a, b) => (b.endHour - b.startHour) - (a.endHour - a.startHour));
  return Array.from({ length: limit }, (_, index) => all[index] ? all[index].title : '');
};

const getWeekNotes = (dateKeys, limit = 2) => {
  const weekKey = dateKeys[0];
  if (DATA && DATA.journal && DATA.journal.week && DATA.journal.week[weekKey]) {
    return (DATA.journal.week[weekKey].notes || []).slice(0, limit);
  }
  return dateKeys
    .map((dateKey) => {
      const summary = (DATA && DATA.DIARY_SUMMARY_BY_DAY[dateKey]) || '';
      const text = summary
        ? summary.replace(/\s+/g, ' ').trim()
        : summarizeDay((DATA && DATA.eventsByDay[dateKey]) || []);
      return { dateKey, text };
    })
    .filter((item) => item.text)
    .slice(0, limit);
};

const getWeeklyReflection = (dateKeys) => {
  const weekKey = dateKeys[0];
  if (DATA && DATA.journal && DATA.journal.week && DATA.journal.week[weekKey]) {
    return (((DATA.journal.week[weekKey] || {}).summary || {}).body) || 'No recorded rhythm for this week yet.';
  }
  const categoryTotals = {};
  let longestEvent = null;
  dateKeys.forEach((dateKey) => {
    ((DATA && DATA.eventsByDay[dateKey]) || []).forEach((event) => {
      const duration = event.endHour - event.startHour;
      categoryTotals[event.categoryId] = (categoryTotals[event.categoryId] || 0) + duration;
      if (!longestEvent || duration > (longestEvent.endHour - longestEvent.startHour)) {
        longestEvent = event;
      }
    });
  });
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => (DATA && DATA.CATEGORY_PALETTE[id] && DATA.CATEGORY_PALETTE[id].label) || id.toUpperCase());
  if (!topCategories.length) return 'No recorded rhythm for this week yet.';
  if (!longestEvent) return `${topCategories.join(' and ')} set the pace for this week.`;
  return `${topCategories.join(' and ')} set the pace this week, with "${longestEvent.title}" taking the longest single stretch.`;
};

const getMonthLabel = (dateKey) => formatDisplayDate(dateKey, { month: 'long' });

const toSingleLineSentence = (text) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const match = normalized.match(/.+?[.!?。！？](?=\s|$)/);
  return (match ? match[0] : normalized).trim();
};

const getISOWeek = (dateKey) => {
  const date = parseDateKey(dateKey);
  const dayNum = date.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 4 - dayNum));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7),
    year: thursday.getUTCFullYear(),
  };
};
const getWeekNumber = (dateKey) => getISOWeek(dateKey).week;

const buildMonthlyCells = (dateKey) => {
  const monthKey = dateKey.slice(0, 7);
  if (DATA && DATA.journal && DATA.journal.month && DATA.journal.month[monthKey]) {
    const active = parseDateKey(dateKey);
    const year = active.getUTCFullYear();
    const monthIndex = active.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, monthIndex, 1));
    const leading = (firstDay.getUTCDay() + 6) % 7;
    const gridStart = new Date(Date.UTC(year, monthIndex, 1 - leading));
    const monthDays = new Map((DATA.journal.month[monthKey].days || []).map((day) => [day.dateKey, day]));
    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart.getTime() + index * 86400000);
      const cellKey = formatDateKey(cellDate);
      const dayEntry = monthDays.get(cellKey);
      return {
        key: cellKey,
        n: cellDate.getUTCDate(),
        muted: cellDate.getUTCMonth() !== monthIndex,
        events: dayEntry ? (dayEntry.events || []) : [],
        cats: dayEntry ? (dayEntry.categories || []) : [],
        isToday: cellKey === TODAY_KEY,
      };
    });
  }
  const active = parseDateKey(dateKey);
  const year = active.getUTCFullYear();
  const monthIndex = active.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const leading = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - leading));
  const todayMeta = getDateMeta(TODAY_KEY);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart.getTime() + index * 86400000);
    const cellKey = formatDateKey(cellDate);
    const events = (DATA && DATA.eventsByDay[cellKey]) || [];
    const totals = {};
    events.forEach((event) => {
      totals[event.categoryId] = (totals[event.categoryId] || 0) + (event.endHour - event.startHour);
    });
    const cats = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    return {
      key: cellKey,
      n: cellDate.getUTCDate(),
      muted: cellDate.getUTCMonth() !== monthIndex,
      events,
      cats,
      isToday: cellKey === todayMeta.key,
    };
  });
};

// ─────────────────────────── Small building blocks ───────────────────────────
const Eyebrow = ({ children, rule = true, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...(style||{}) }}>
    <span className="eyebrow">{children}</span>
    {rule && <hr className="divider-rule" />}
  </div>
);

const Tick = ({ on, onClick }) => (
  <span className="tick" data-on={on ? 'true' : 'false'} onClick={onClick} role="checkbox" aria-checked={on} tabIndex={0} />
);

const TODO_TEXT_STYLE = {
  fontFamily: "'Cormorant Garamond', 'Garamond', serif",
  fontSize: 12,
  lineHeight: 1.4,
  fontStyle: 'italic',
};

const EVENT_BLOCK_GAP_PX = 2;

const EventChip = ({ event, block = false }) => {
  const cat = (DATA && DATA.CATEGORY_PALETTE[event.categoryId]) || { fill: '#eee', ink: '#333' };
  return (
    <span style={{
      display: block ? 'block' : 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: block ? '2px 6px' : '2px 8px',
      borderRadius: block ? 6 : 999,
      background: cat.fill,
      color: cat.ink,
      fontFamily: "'Cormorant Garamond', 'Garamond', serif",
      fontSize: 11.5,
      lineHeight: 1.35,
      fontStyle: 'italic',
      whiteSpace: block ? 'nowrap' : 'normal',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {event.title}
    </span>
  );
};

// ─────────────────────────── Header ───────────────────────────
const Header = ({ view, setView, label, onPrev, onNext, isMobile }) => (
  <header style={{
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
    alignItems: 'center',
    justifyItems: isMobile ? 'center' : 'stretch',
    marginBottom: isMobile ? 22 : 28,
    padding: isMobile ? '0' : '0 6px',
    rowGap: isMobile ? 12 : 0,
  }}>
    <div style={{ display: isMobile ? 'none' : 'block' }} />
    <div className="pill-group" role="tablist">
      {['daily','weekly','monthly'].map(v => (
        <button key={v} className="pill" data-on={view===v} onClick={() => setView(v)}>
          {v[0].toUpperCase()+v.slice(1)}
        </button>
      ))}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: isMobile ? 'center' : 'end' }}>
      <button type="button" className="icon-btn" onClick={onPrev} aria-label="Previous">
        <Chevron dir="left" />
      </button>
      <span style={{
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--ink-2)', minWidth: isMobile ? 0 : 120, textAlign: 'center', fontWeight: 500,
      }}>
        {label}
      </span>
      <button type="button" className="icon-btn" onClick={onNext} aria-label="Next">
        <Chevron dir="right" />
      </button>
    </div>
  </header>
);

// ─────────────────────────── Weekly: left page ───────────────────────────
const WeeklyLeft = ({ checks, toggleCheck, priorities, weekDays, isMobile }) => (
  <div className="paper-surface spine-shadow-r" style={{
    borderRadius: isMobile ? 14 : '14px 0 0 14px',
    padding: isMobile ? '28px 22px 24px' : '44px 46px 40px',
    width: isMobile ? '100%' : '50%',
    minHeight: isMobile ? 'auto' : 820,
    display: 'flex', flexDirection: 'column',
    position: 'relative',
  }}>
    {/* Section: priorities */}
    <section style={{ marginBottom: 36 }}>
      <Eyebrow>This Week · Priorities</Eyebrow>
      <ol style={{
        listStyle: 'none', margin: '18px 0 0', padding: 0,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {priorities.map((p, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
            paddingBottom: 6, borderBottom: '1px solid var(--rule-soft)' }}>
            <span className="font-serif" style={{
              fontSize: 18, color: 'var(--ink-3)', width: 18,
              fontStyle: 'italic', fontVariantNumeric: 'oldstyle-nums',
            }}>{i+1}.</span>
            <span className="font-serif" style={{
              flex: 1, fontSize: 12, color: 'var(--ink)', fontStyle: 'italic', fontWeight: 400,
            }}>{p || '—'}</span>
            <Tick on={checks.priorities[i]} onClick={() => toggleCheck('priorities', i)} />
          </li>
        ))}
      </ol>
    </section>

    {/* Section: days */}
    <section style={{ flex: 1 }}>
      <Eyebrow>The Week</Eyebrow>
      <ul style={{
        listStyle: 'none', margin: '16px 0 0', padding: 0,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {weekDays.map((d, i) => (
          <li key={i} style={{
            display: 'grid',
            gridTemplateColumns: '44px 54px 1fr auto',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 0',
            borderBottom: '1px solid var(--rule-soft)',
            background: d.isToday ? 'color-mix(in oklch, var(--accent-wash) 60%, transparent)' : 'transparent',
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              color: d.isToday ? '#E8704E' : 'var(--ink)',
            }}>
              <span className="font-serif" style={{ fontSize: 22, fontWeight: 500, fontVariantNumeric: 'oldstyle-nums' }}>
                {String(d.date).padStart(2,'0')}
              </span>
            </div>
            <span style={{
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--ink-3)', fontWeight: 500,
            }}>
              {d.day}
            </span>
              <span style={{
                fontSize: 12, color: 'var(--ink-2)',
                display: 'flex', flexWrap: 'wrap', columnGap: EVENT_BLOCK_GAP_PX, rowGap: EVENT_BLOCK_GAP_PX, alignItems: 'center',
              }}>
              {d.events.length === 0 && <span style={{ color: 'var(--ink-4)' }}>—</span>}
              {d.events.map((ev, j) => <EventChip key={j} event={ev} />)}
            </span>
            <span style={{
              fontSize: 10, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
              minWidth: 28, textAlign: 'right',
            }}>
              {d.tasks > 0 ? `${d.tasks} ☐` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </section>

    {/* Foot: page number */}
    <footer style={{
      marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
    }}>
      <span>Mon — Sun</span>
      <span>I</span>
    </footer>
  </div>
);

// ─────────────────────────── Weekly: right page ───────────────────────────
const WeeklyRight = ({ checks, toggleCheck, setTodoText, todoTexts, weekStartKey, weekNumber, weekNotes, weekReflection, isMobile }) => (
  <div className="paper-surface spine-shadow-l" style={{
    borderRadius: isMobile ? 14 : '0 14px 14px 0',
    padding: isMobile ? '28px 22px 24px' : '44px 46px 40px',
    width: isMobile ? '100%' : '50%',
    minHeight: isMobile ? 'auto' : 820,
    display: 'flex', flexDirection: 'column',
    position: 'relative',
  }}>
    {/* Week-of header */}
    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
      <div>
        <div className="eyebrow">Week of</div>
        <h2 className="font-serif" style={{
          margin: '4px 0 0', fontWeight: 400, letterSpacing: '0.02em',
          color: 'var(--ink)', lineHeight: 1,
        }}>
          <span style={{ fontVariantNumeric: 'oldstyle-nums', fontSize: 72 }}>
            {parseDateKey(weekStartKey).getUTCDate()}
            <sup style={{ fontSize: '0.45em', verticalAlign: 'super', marginLeft: 2 }}>
              {getOrdinal(parseDateKey(weekStartKey).getUTCDate())}
            </sup>
          </span>
          <span style={{ color: 'rgba(132, 53, 13, 0.35)', fontStyle: 'italic', fontSize: 36 }}> of </span>
          <span style={{ fontSize: 64 }}>{getMonthLabel(weekStartKey)}</span>
        </h2>
        <div className="font-serif" style={{
          fontSize: 18, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 4,
        }}>
          {parseDateKey(weekStartKey).getUTCFullYear()}
        </div>
      </div>
      <div>
        <div className="eyebrow" style={{ textAlign: 'right', marginBottom: 6 }}>Week</div>
        <div className="week-num" style={{ textAlign: 'right' }}>{weekNumber}</div>
      </div>
    </section>

    {/* Dot-grid note area */}
    <section style={{
      flex: 1, padding: 20,
      border: '1px solid var(--rule-soft)',
      borderRadius: 8,
      background: 'var(--paper-2)',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div className="dot-grid" style={{
        position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none',
      }} />
      <div className="font-serif" style={{
        position: 'relative', fontSize: 12, color: 'var(--ink)',
        lineHeight: 1.7, fontStyle: 'italic',
      }}>
        {weekNotes.map((note) => (
          <p key={note.dateKey} style={{ margin: '0 0 14px' }}>
            <span className="accent-chip">
              {formatDisplayDate(note.dateKey, { month: 'short', day: 'numeric' }).toLowerCase()}
            </span>
            <span style={{ marginLeft: 8 }}>{note.text}</span>
          </p>
        ))}
        <p style={{ margin: 0, color: 'var(--ink-2)', fontStyle: 'italic' }}>
          {weekReflection}
        </p>
      </div>
    </section>

    {/* Two-column to-do */}
    <section>
      <Eyebrow>To Do</Eyebrow>
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1px 1fr', gap: 18,
        marginTop: 14,
      }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todoTexts.slice(0, 3).map((t, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
              paddingBottom: 6, borderBottom: '1px solid var(--rule-soft)' }}>
              <Tick on={checks.todos[i]} onClick={() => toggleCheck('todos', i)} />
              <input
                value={t}
                onChange={e => setTodoText(i, e.target.value)}
                style={{
                  ...TODO_TEXT_STYLE,
                  color: checks.todos[i] ? 'var(--ink-3)' : 'var(--ink)',
                  textDecoration: checks.todos[i] ? 'line-through' : 'none',
                  textDecorationColor: 'var(--ink-4)',
                }}
              />
            </li>
          ))}
        </ul>
        <div className="pagebreak" />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todoTexts.slice(3).map((t, i) => (
            <li key={i+3} style={{ display: 'flex', alignItems: 'center', gap: 10,
              paddingBottom: 6, borderBottom: '1px solid var(--rule-soft)' }}>
              <Tick on={checks.todos[i+3]} onClick={() => toggleCheck('todos', i+3)} />
              <input
                value={t}
                onChange={e => setTodoText(i+3, e.target.value)}
                style={{
                  ...TODO_TEXT_STYLE,
                  color: checks.todos[i+3] ? 'var(--ink-3)' : 'var(--ink)',
                  textDecoration: checks.todos[i+3] ? 'line-through' : 'none',
                  textDecorationColor: 'var(--ink-4)',
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* Foot */}
    <footer style={{
      marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
    }}>
      <span>{`${formatDisplayDate(weekStartKey, { month: 'short', day: 'numeric' })} — ${formatDisplayDate(addDays(weekStartKey, 6), { month: 'short', day: 'numeric' })}`}</span>
      <span>II</span>
    </footer>
  </div>
);

// ─────────────────────────── Daily ───────────────────────────
const SCHEDULE_START_HOUR = 0;   // midnight
const SCHEDULE_END_HOUR   = 23;  // through 11 pm (last row is 11pm–12am)
const HOUR_PX = 57;
const COMPRESS_END = 8;     // hours [0..7] are compressed to 1/4 height (sleep band)
const COMPRESS_RATIO = 0.25;
const compressedHourPx = HOUR_PX * COMPRESS_RATIO;
// Cumulative top offset for a given hour (supports fractional)
const hourTop = (h) => {
  if (h <= COMPRESS_END) return h * compressedHourPx;
  return COMPRESS_END * compressedHourPx + (h - COMPRESS_END) * HOUR_PX;
};
// Which hour labels to render (sparse in compressed band)
const SHOW_LABEL = (h) => h >= COMPRESS_END || h === 0 || h === 4;

const EVENT_CATEGORIES = (DATA && DATA.CATEGORY_PALETTE) || {};

const Daily = ({ checks, toggleCheck, dateKey, events, mustDo, isMobile }) => {
  const scheduleLabelWidth = isMobile ? 70 : 104;
  const scheduleHeaderFont = isMobile ? 44 : 64;
  return (
  <div className="paper-surface page-shadow fadein" style={{
    borderRadius: 14,
    padding: isMobile ? '26px 18px 22px' : '48px 56px',
    maxWidth: 1240, margin: '0 auto',
    minHeight: isMobile ? 'auto' : 820,
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
    gridTemplateRows: isMobile ? 'auto auto auto' : 'auto 1fr',
    columnGap: isMobile ? 0 : 44,
    rowGap: isMobile ? 18 : 24,
  }}>
    {/* Header */}
    <div style={{ gridColumn: '1 / -1' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {formatDisplayDate(dateKey, { weekday: 'long' })} · {dateKey.slice(8, 10)} · {dateKey.slice(5, 7)} · {dateKey.slice(0, 4)}
      </div>
      <h2 className="font-serif" style={{
        margin: 0, fontSize: scheduleHeaderFont, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.05,
      }}>
        <span style={{ color: 'var(--ink)', fontStyle: 'normal' }}>
          {parseDateKey(dateKey).getUTCDate()}
          <sup style={{ fontSize: '0.45em', verticalAlign: 'super', marginLeft: 2, marginRight: 4 }}>
            {getOrdinal(parseDateKey(dateKey).getUTCDate())}
          </sup>
        </span>
        <span style={{ fontStyle: 'italic', color: 'var(--ink)' }}>
          {' '}
          {getMonthLabel(dateKey)}
        </span>
        <span style={{ color: 'rgba(132, 53, 13, 0.35)', fontStyle: 'italic' }}> · Journal</span>
      </h2>
    </div>

    {/* Left: schedule */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <div className="cal-column" style={{
          position: 'relative',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          overflow: 'hidden',
        }}>
          {/* Hour rows */}
          {(() => {
            const rows = [
              // Compressed sleep band: two rows of 4 hours each, but rendered at compressed height (4 × ¼ = 1 × HOUR_PX)
              { h: 0, label: '12 am', height: 4 * compressedHourPx },
              { h: 4, label: '4 am',  height: 4 * compressedHourPx },
            ];
            for (let h = COMPRESS_END; h <= SCHEDULE_END_HOUR; h++) {
              const label = h === 0 ? '12 am' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h-12} pm`;
              rows.push({ h, label, height: HOUR_PX });
            }
            return rows.map((row, i) => {
              const isLast = i === rows.length - 1;
              return (
                <div key={row.h} style={{
                  display: 'grid', gridTemplateColumns: `${scheduleLabelWidth}px 1fr`,
                  height: row.height,
                  borderBottom: isLast ? 'none' : '1px solid var(--rule-soft)',
                }}>
                  <div style={{
                    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums',
                    padding: '4px 10px 0 12px',
                    background: 'transparent',
                  }}>
                    {row.label}
                  </div>
                  <div />
                </div>
              );
            });
          })()}

          {/* Absolute-positioned event blocks */}
          <div style={{
            position: 'absolute',
            left: scheduleLabelWidth, right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}>
            {events.map((e, i) => {
              const cat = EVENT_CATEGORIES[e.categoryId] || { fill: '#eee', ink: '#333', label: e.categoryId };
              const rawTop    = hourTop(e.startHour) - hourTop(SCHEDULE_START_HOUR);
              const rawBottom = hourTop(e.endHour) - hourTop(SCHEDULE_START_HOUR);
              const top    = Math.round(rawTop);
              // Reserve 2px gap to the next event
              const height = Math.max(12, Math.round(rawBottom - rawTop) - EVENT_BLOCK_GAP_PX);
              const duration = e.endHour - e.startHour;
              const hh = DATA ? DATA.hourLabel : ((v) => {
                const h = Math.floor(v);
                const m = Math.round((v - h) * 60);
                const suffix = h >= 12 ? 'pm' : 'am';
                const h12 = ((h + 11) % 12) + 1;
                return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2,'0')} ${suffix}`;
              });
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: 6, right: 6, top, height,
                  background: cat.fill,
                  color: cat.ink,
                  borderRadius: 6,
                  padding: duration < 0.8 ? '2px 10px' : '6px 10px',
                  fontSize: 12,
                  lineHeight: 1.3,
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: duration < 0.8 ? 'row' : 'column',
                  justifyContent: duration < 0.8 ? 'space-between' : 'flex-start',
                  alignItems: duration < 0.8 ? 'center' : 'flex-start',
                  gap: 4,
                  overflow: 'hidden',
                  pointerEvents: 'auto',
                }}>
                  <span style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}>
                    {e.title}
                  </span>
                  <span style={{
                    fontSize: 10,
                    opacity: 0.75,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}>
                    {hh(e.startHour)} – {hh(e.endHour)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>

    {/* Right: must-do → weather/mood → one line → morning pages (moved bottom) */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule-soft)',
        borderRadius: 10,
        padding: isMobile ? '16px 16px' : '20px 22px',
      }}>
        <Eyebrow rule={false}>Must Do</Eyebrow>
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0,
          display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mustDo.map((t, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ paddingTop: 4 }}>
                <Tick on={checks.daily[i]} onClick={() => toggleCheck('daily', i)} />
              </span>
              <span className="font-serif" style={{
                flex: 1,
                ...TODO_TEXT_STYLE,
                color: checks.daily[i] ? 'var(--ink-3)' : 'var(--ink)',
                textDecoration: checks.daily[i] ? 'line-through' : 'none',
                textDecorationColor: 'var(--ink-4)',
              }}>
                {t.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--rule-soft)',
        borderRadius: 10,
        padding: isMobile ? '16px 16px' : '20px 22px',
      }}>
        <Eyebrow rule={false}>Weather · Mood</Eyebrow>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 14,
        }}>
          <div>
            <div className="font-serif" style={{ fontSize: 26, color: 'var(--ink)', fontWeight: 500 }}>
              −2°<span style={{ color: 'var(--ink-3)', fontSize: 18 }}> / 4°</span>
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
              cold · clear
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{
                  width: 16, height: 16, borderRadius: 999,
                  border: '1px solid var(--rule)',
                  background: n <= 4 ? 'var(--accent)' : 'transparent',
                }}/>
              ))}
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)', textTransform: 'uppercase', marginTop: 6 }}>
              steady · hopeful
            </div>
          </div>
        </div>
      </section>

      <section style={{
        padding: isMobile ? '16px 16px' : '20px 22px',
        border: '1px dashed var(--rule)',
        borderRadius: 10,
      }}>
        <Eyebrow rule={false}>One Line</Eyebrow>
        <p className="font-serif" style={{
          margin: '10px 0 0', fontSize: 12, color: 'var(--ink)',
          fontStyle: 'italic', lineHeight: 1.5,
        }}>
          "The new year smelled of pine and cold paper."
        </p>
      </section>

      <section style={{
        position: 'relative', padding: isMobile ? 16 : 20,
        border: '1px solid var(--rule-soft)',
        borderRadius: 10,
        background: 'var(--paper-2)',
        overflow: 'hidden',
      }}>
        <div className="dot-grid" style={{
          position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
        }} />
        <div className="eyebrow" style={{ position: 'relative', marginBottom: 10 }}>Diary Summary</div>
        <div className="font-serif" style={{
          position: 'relative', margin: 0, fontSize: 12, lineHeight: 1.7,
          color: 'var(--ink)',
          maxHeight: isMobile ? 'none' : 280, overflowY: 'auto', paddingRight: 4,
        }}>
          {((DATA && DATA.journal && DATA.journal.day && DATA.journal.day[dateKey] && DATA.journal.day[dateKey].summary && DATA.journal.day[dateKey].summary.body)
            || (DATA && DATA.DIARY_SUMMARY_BY_DAY[dateKey])) ? (
            <p style={{
              margin: 0, fontSize: 12, lineHeight: 1.7,
              color: 'var(--ink)', fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}>
              {((DATA && DATA.journal && DATA.journal.day && DATA.journal.day[dateKey] && DATA.journal.day[dateKey].summary && DATA.journal.day[dateKey].summary.body)
                || (DATA && DATA.DIARY_SUMMARY_BY_DAY[dateKey]))}
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              No summary yet for today.
            </p>
          )}
        </div>
      </section>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end',
        color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        <span>Day {Math.floor((parseDateKey(dateKey) - parseDateKey(`${parseDateKey(dateKey).getUTCFullYear()}-01-01`)) / 86400000) + 1} / 365</span>
      </div>
    </div>
  </div>
);
};

// ─────────────────────────── Monthly ───────────────────────────
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const Monthly = ({ dateKey }) => {
  const cells = buildMonthlyCells(dateKey);
  const palette = (window.JOURNAL_DATA && window.JOURNAL_DATA.CATEGORY_PALETTE) || {};
  const monthDate = parseDateKey(dateKey);
  const activeMonth = getMonthLabel(dateKey);
  const year = monthDate.getUTCFullYear();
  const daysInMonth = new Date(Date.UTC(year, monthDate.getUTCMonth() + 1, 0)).getUTCDate();
  const weekCount = new Set(cells.map((_, index) => Math.floor(index / 7))).size;
  const monthSummary = toSingleLineSentence(
    (((DATA && DATA.journal && DATA.journal.month && DATA.journal.month[dateKey.slice(0, 7)] || {}).summary || {}).body)
      || getWeeklyReflection(DATA ? DATA.dateRange(`${year}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}-01`, `${year}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`) : [])
  );

  return (
    <div className="paper-surface page-shadow fadein" style={{
      borderRadius: 14,
      padding: '44px 48px',
      maxWidth: 1160, margin: '0 auto',
      minHeight: 820,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        paddingBottom: 20, borderBottom: '1px solid var(--rule)', marginBottom: 20,
      }}>
        <div>
          <div className="eyebrow">Month · {String(monthDate.getUTCMonth() + 1).padStart(2, '0')} of 12</div>
          <h2 className="font-serif" style={{
            margin: '4px 0 0', fontSize: 72, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 0.95,
          }}>
            {activeMonth}
          </h2>
          <div className="font-serif" style={{
            fontSize: 18, fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 6,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 680,
          }}>
            focus — {monthSummary}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Year</div>
          <div className="font-serif" style={{ fontSize: 32, color: 'var(--ink)', fontVariantNumeric: 'oldstyle-nums' }}>
            {year}
          </div>
        </div>
      </header>

      {/* Week header */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1,
        marginBottom: 8,
      }}>
        {DOW.map(d => (
          <div key={d} style={{
            padding: '8px 10px',
            fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--ink-3)', fontWeight: 500,
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1,
        background: 'var(--rule-soft)',
        border: '1px solid var(--rule-soft)',
        borderRadius: 10, overflow: 'hidden',
        flex: 1,
      }}>
        {cells.map((c, i) => {
          const events = (!c.muted && c.events) || [];
          const cats = (!c.muted && c.cats) || [];
          return (
            <div key={c.key || i} className="cal-cell" data-muted={c.muted} data-today={c.isToday}>
              <span className="cal-num">{c.n}</span>
              {events.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: EVENT_BLOCK_GAP_PX,
                  marginTop: 8,
                }}>
                  {events.slice(0, 2).map((event, j) => (
                    <EventChip key={j} event={event} block={true} />
                  ))}
                </div>
              )}
              {events.length === 0 && cats.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', columnGap: 6, rowGap: 2,
                  marginTop: 8,
                  fontSize: 9.5, lineHeight: 1.3,
                  letterSpacing: '0.04em',
                  fontStyle: 'italic',
                }}>
                  {cats.slice(0, 3).map((catId, j) => {
                    const p = palette[catId];
                    if (!p) return null;
                    return (
                      <span key={j} style={{ color: p.ink || 'var(--ink-2)', whiteSpace: 'nowrap' }}>
                        <span style={{ color: p.fill, marginRight: 3 }}>•</span>
                        {p.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer rail */}
      <footer style={{
        marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        color: 'var(--ink-3)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        <span>{weekCount} weeks · {daysInMonth} days</span>
        <span>{String(monthDate.getUTCMonth() + 1).padStart(2, '0')}</span>
      </footer>
    </div>
  );
};

// ─────────────────────────── App ───────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Warm Paper",
  "accent": "whisper",
  "showPaperGrain": true,
  "fontScale": 1.0
}/*EDITMODE-END*/;

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState('daily');
  const [cursorKey, setCursorKey] = useState(TODAY_KEY);
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const weekDateKeys = useMemo(() => getWeekDateKeys(cursorKey), [cursorKey]);
  const weekDays = useMemo(() => getWeekData(cursorKey), [cursorKey]);
  const weekPriorities = useMemo(() => getWeekPriorities(weekDateKeys), [weekDateKeys]);
  const weekTodos = useMemo(() => getWeekTodos(weekDateKeys), [weekDateKeys]);
  const dailyTodos = useMemo(() => getDayTodos(cursorKey, 5), [cursorKey]);
  const dailyEvents = useMemo(() => (
    (DATA && DATA.journal && DATA.journal.day && DATA.journal.day[cursorKey] && DATA.journal.day[cursorKey].events)
    || (DATA && DATA.eventsByDay[cursorKey])
    || []
  ), [cursorKey]);
  const weekNotes = useMemo(() => getWeekNotes(weekDateKeys), [weekDateKeys]);
  const weekReflection = useMemo(() => getWeeklyReflection(weekDateKeys), [weekDateKeys]);
  const [checks, setChecks] = useState({
    priorities: [false, false, false],
    todos: weekTodos.map(x => x.done),
    daily: dailyTodos.map(x => x.done),
  });
  const [todoTexts, setTodoTexts] = useState(weekTodos.map(x => x.text));

  const toggleCheck = (key, i) => setChecks(c => {
    const arr = [...c[key]]; arr[i] = !arr[i];
    return { ...c, [key]: arr };
  });
  const setTodoText = (i, v) => setTodoTexts(prev => {
    const arr = [...prev]; arr[i] = v; return arr;
  });

  // Apply theme + accent density via CSS vars on :root
  useEffect(() => {
    const palette = THEMES[t.theme] || THEMES['Warm Paper'];
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));

    // Accent intensity — tweak the wash alpha without changing the hue
    const { washAlpha } = ACCENT_DENSITY[t.accent] || ACCENT_DENSITY.whisper;
    // Parse base wash OKLCH and adjust as alpha layer via overlay
    // Simpler: scale --accent-wash toward --paper-2 by mixing
    const base = palette['--accent-wash'];
    root.style.setProperty('--accent-wash',
      `color-mix(in oklch, ${base} ${Math.round(washAlpha*100)}%, var(--paper-2))`);

    root.style.setProperty('font-size', `${16 * t.fontScale}px`);

    // Paper grain toggle
    document.body.dataset.grain = t.showPaperGrain ? 'on' : 'off';
  }, [t.theme, t.accent, t.fontScale, t.showPaperGrain]);

  useEffect(() => {
    setChecks(c => ({
      ...c,
      priorities: [false, false, false],
      todos: weekTodos.map(x => x.done),
    }));
    setTodoTexts(weekTodos.map(x => x.text));
  }, [weekTodos]);

  useEffect(() => {
    setChecks(c => ({ ...c, daily: dailyTodos.map(x => x.done) }));
  }, [dailyTodos]);

  useEffect(() => {
    const onResize = () => setIsMobile(getIsMobileViewport());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const label = view === 'daily'
    ? formatDisplayDate(cursorKey, { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', ' ·')
    : view === 'weekly'
      ? (() => { const { week, year } = getISOWeek(cursorKey); return `Week ${week} · ${year}`; })()
      : `${getMonthLabel(cursorKey)} ${parseDateKey(cursorKey).getUTCFullYear()}`;

  const onPrev = () => {
    setCursorKey((current) => (
      view === 'daily' ? addDays(current, -1)
      : view === 'weekly' ? addDays(current, -7)
      : addMonths(current, -1)
    ));
  };
  const onNext = () => {
    setCursorKey((current) => (
      view === 'daily' ? addDays(current, 1)
      : view === 'weekly' ? addDays(current, 7)
      : addMonths(current, 1)
    ));
  };

  return (
    <div className="app-bg" data-screen-label={`Journal · ${view}`}>
      <div className="max-shell">
        <Header view={view} setView={setView} label={label} onPrev={onPrev} onNext={onNext} isMobile={isMobile} />

        <main>
          {view === 'weekly' && (
            <div className="fadein" style={{
              display: 'flex', alignItems: 'stretch', justifyContent: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 16 : 0,
            }}>
              <WeeklyLeft
                checks={checks}
                toggleCheck={toggleCheck}
                priorities={weekPriorities}
                weekDays={weekDays}
                isMobile={isMobile}
              />
              <WeeklyRight
                checks={checks}
                toggleCheck={toggleCheck}
                todoTexts={todoTexts}
                setTodoText={setTodoText}
                weekStartKey={getWeekStartKey(cursorKey)}
                weekNumber={getWeekNumber(cursorKey)}
                weekNotes={weekNotes}
                weekReflection={weekReflection}
                isMobile={isMobile}
              />
            </div>
          )}
          {view === 'daily' && (
            <Daily
              checks={checks}
              toggleCheck={toggleCheck}
              dateKey={cursorKey}
              events={dailyEvents}
              mustDo={dailyTodos}
              isMobile={isMobile}
            />
          )}
          {view === 'monthly' && (
            <Monthly dateKey={cursorKey} />
          )}
        </main>

        <footer style={{
          marginTop: 48, textAlign: 'center',
          fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          Digital Stationery · mmxxv
        </footer>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <TweakSelect label="Theme"
          value={t.theme}
          options={Object.keys(THEMES)}
          onChange={v => setTweak('theme', v)} />
        <TweakRadio label="Accent"
          value={t.accent}
          options={['whisper','muted','confident']}
          onChange={v => setTweak('accent', v)} />

        <TweakSection label="Paper" />
        <TweakToggle label="Paper grain"
          value={t.showPaperGrain}
          onChange={v => setTweak('showPaperGrain', v)} />
        <TweakSlider label="Type scale"
          value={t.fontScale}
          min={0.9} max={1.15} step={0.01}
          onChange={v => setTweak('fontScale', v)} />
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

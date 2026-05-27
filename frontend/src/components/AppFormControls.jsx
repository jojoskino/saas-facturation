import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalPortal from "./ModalPortal";

/** Astérisque rouge pour champs obligatoires (usage cohérent dans toute l'app). */
export function FieldLabel({ children, htmlFor, required = false, className = "" }) {
  const Tag = htmlFor ? "label" : "span";
  const classes = ["field-label", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...(htmlFor ? { htmlFor } : {})}>
      {children}
      {required ? (
        <span className="field-required" aria-hidden>
          {" "}
          *
        </span>
      ) : null}
    </Tag>
  );
}

export function AppSelect({ value, onChange, options, placeholder = "Selectionner", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || null;

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const maxWidth = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - maxWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left,
      width: maxWidth,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: "var(--z-dropdown-portal, 46)",
    });
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setHighlightedIndex(-1);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    function onLayoutChange() {
      updateMenuPosition();
    }
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, options, value]);

  function choose(index) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    setHighlightedIndex(-1);
    if (triggerRef.current) triggerRef.current.focus();
  }

  function onTriggerKeyDown(event) {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((prev) => Math.min(options.length - 1, prev + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      choose(highlightedIndex >= 0 ? highlightedIndex : 0);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div className={`ui-select ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-select__trigger"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{selected ? selected.label : placeholder}</span>
        <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} />
      </button>
      {open ? (
        <ModalPortal>
          <div
            ref={menuRef}
            className="ui-select__menu ui-select__menu--portal"
            role="listbox"
            style={menuStyle || undefined}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`ui-select__option ${option.value === value ? "is-selected" : ""} ${index === highlightedIndex ? "is-highlighted" : ""}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => {
                  choose(index);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}

export function AppDateField({ value, onChange, placeholder = "JJ/MM/AAAA" }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [viewDate, setViewDate] = useState(value ? parseIsoDate(value) : new Date());
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const inputWrapRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = useCallback(() => {
    const anchor = inputWrapRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const panelWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - panelWidth - viewportPadding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left,
      width: panelWidth,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: "var(--z-dropdown-portal, 510)",
    });
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setEditing(false);
      setDraft(value ? toDisplayDate(value) : "");
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }
    updatePanelPosition();
    function onLayoutChange() {
      updatePanelPosition();
    }
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, updatePanelPosition]);

  const commitDraft = useCallback(() => {
    const parsed = parseUserDate(draft);
    if (!parsed) {
      if (draft.trim() === "") onChange("");
      setDraft(value ? toDisplayDate(value) : "");
      return;
    }
    const iso = toIsoDate(parsed);
    onChange(iso);
    setDraft(toDisplayDate(iso));
    setViewDate(parsed);
  }, [draft, onChange, value]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(false);
        setDraft(value ? toDisplayDate(value) : "");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, value]);

  const monthLabel = useMemo(
    () =>
      viewDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    [viewDate]
  );

  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  return (
    <div className={`ui-date ${open ? "is-open" : ""}`} ref={rootRef}>
      <div className="ui-date__input-wrap" ref={inputWrapRef}>
        <input
          className="ui-date__input"
          type="text"
          value={editing ? draft : value ? toDisplayDate(value) : ""}
          placeholder={placeholder}
          onFocus={() => {
            setEditing(true);
            setDraft(value ? toDisplayDate(value) : "");
            setOpen(true);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setEditing(false);
            }
          }}
          onBlur={() => {
            commitDraft();
            setEditing(false);
            /* Le panneau ne se ferme qu'au clic sur un jour (pas au clic extérieur). */
          }}
        />
        <button type="button" className="ui-date__toggle" onClick={() => setOpen((prev) => !prev)} aria-label="Ouvrir le calendrier">
          <i className="fa-regular fa-calendar" />
        </button>
      </div>
      {open ? (
        <ModalPortal>
          <div
            ref={panelRef}
            className="ui-date__panel ui-date__panel--portal"
            style={panelStyle || undefined}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ui-date__head">
              <button type="button" onClick={() => setViewDate((prev) => addMonths(prev, -1))} aria-label="Mois precedent">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <strong>{monthLabel}</strong>
              <button type="button" onClick={() => setViewDate((prev) => addMonths(prev, 1))} aria-label="Mois suivant">
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <div className="ui-date__weekdays">
              {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="ui-date__grid">
              {days.map((day) => {
                const iso = toIsoDate(day.date);
                const active = value === iso;
                const todayIso = toIsoDate(new Date());
                const isToday = iso === todayIso;
                return (
                  <button
                    key={`${iso}-${day.isCurrentMonth ? "current" : "other"}`}
                    type="button"
                    className={`ui-date__day ${day.isCurrentMonth ? "" : "is-outside"} ${active ? "is-active" : ""} ${isToday ? "is-today" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(iso);
                      setDraft(toDisplayDate(iso));
                      setViewDate(day.date);
                      setOpen(false);
                      setEditing(false);
                    }}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - firstWeekday);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push({ date, isCurrentMonth: date.getMonth() === month });
  }
  return days;
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
}

function parseUserDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const frMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!frMatch) return null;
  const date = new Date(Number(frMatch[3]), Number(frMatch[2]) - 1, Number(frMatch[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date, diff) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + diff);
  return next;
}

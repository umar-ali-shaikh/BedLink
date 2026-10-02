import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { geocodeApi } from './api';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 450;

/**
 * Type a place name or address → pick a suggestion → `onChange({ lat, lng, label })`.
 * "Use my location" fills it from GPS (with the address looked up). `value` is the chosen
 * place or null. No map clicking: the place always comes from a real address.
 */
export function LocationSearch({ value, onChange, placeholder = 'Search area, street, landmark or hospital', error, id, gps = true, autoFocus }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState('');
  const seq = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const found = await geocodeApi.search(q);
        if (mine !== seq.current) return;
        setResults(found);
        setActive(found.length ? 0 : -1);
        setProblem('');
      } catch (err) {
        if (mine === seq.current) setProblem(errorMessage(err));
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const choose = (place) => {
    onChange(place);
    setQuery('');
    setResults([]);
    setOpen(false);
    setProblem('');
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setProblem('This device cannot share its location.');
      return;
    }
    setLocating(true);
    setProblem('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        try {
          choose(await geocodeApi.reverse({ lat, lng }));
        } catch {
          choose({ lat, lng, label: 'Current location' });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setProblem('Location permission was denied — search for the address instead.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  if (value) {
    return (
      <div>
        <div className={cn('flex items-start gap-2 rounded-md border bg-surface px-3 py-2.5', error ? 'border-danger' : 'border-success/40')}>
          <MapPin className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden />
          <p className="flex-1 min-w-0 text-small text-text break-words">{value.label}</p>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="shrink-0 text-small font-semibold text-primary hover:underline"
          >
            Change
          </button>
        </div>
        {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
      </div>
    );
  }

  const showList = open && query.trim().length >= MIN_CHARS;
  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn('input h-11 pl-9 pr-9', error && 'border-danger')}
        />
        {loading && <Loader2 className="w-4 h-4 text-text-subtle absolute right-3 top-1/2 -translate-y-1/2 animate-spin" aria-hidden />}
        {!loading && query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-subtle hover:text-text" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-surface shadow-raised py-1">
          {results.map((place, i) => (
            <li
              key={`${place.lat},${place.lng},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(place);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex items-start gap-2 px-3 py-2 text-small cursor-pointer', i === active ? 'bg-primary-soft text-text' : 'text-text')}
            >
              <MapPin className="w-4 h-4 text-text-subtle shrink-0 mt-0.5" aria-hidden />
              <span className="min-w-0 break-words">{place.label}</span>
            </li>
          ))}
          {!loading && !results.length && !problem && <li className="px-3 py-2 text-small text-text-subtle">No places found — try adding the city.</li>}
          {loading && !results.length && <li className="px-3 py-2 text-small text-text-subtle">Searching…</li>}
        </ul>
      )}

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className={cn(error || problem ? 'text-danger' : 'text-text-subtle')}>
          {error || problem || `Type at least ${MIN_CHARS} letters, then pick from the list`}
        </span>
        {gps && (
          <button type="button" onClick={useGps} disabled={locating} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-60">
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <LocateFixed className="w-3.5 h-3.5" aria-hidden />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        )}
      </div>
    </div>
  );
}

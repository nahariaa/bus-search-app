import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { placeSuggestions } from '@/lib/route-matching';

interface PlaceInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  available: string[];
  placeholder: string;
}

export default function PlaceInput({ id, value, onChange, available, placeholder }: PlaceInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = placeSuggestions(value, available).slice(0, 30);
  const choose = (name: string) => { onChange(name); setOpen(false); setActive(-1); };
  return (
    <>
      <Input id={id} role="combobox" autoComplete="off" aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0} aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder} value={value} className="pl-10 h-12 border-gray-300"
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive(index => Math.max(0, Math.min(suggestions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' && open && active >= 0 && suggestions[active]) {
            event.preventDefault(); choose(suggestions[active]);
          }
        }} />
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
          {suggestions.map((name, index) => (
            <li id={`${listId}-${index}`} key={name} role="option" aria-selected={index === active}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 ${index === active ? 'bg-blue-50' : ''}`}
              onMouseDown={event => event.preventDefault()} onClick={() => choose(name)}>{name}</li>
          ))}
        </ul>
      )}
    </>
  );
}

import { useTranslation } from "../i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps): JSX.Element {
  const t = useTranslation();
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("search")}
      className="w-full max-w-xs rounded-lg border border-hud-border bg-hud-bg px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-sky-400/60"
    />
  );
}

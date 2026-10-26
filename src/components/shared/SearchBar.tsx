import { Search } from "lucide-react";

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ placeholder, value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full text-sm pl-10"
      />
    </div>
  );
}

import { Search } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  q: string;
  onQChange: (value: string) => void;
  qPlaceholder?: string;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: Option[];
  filters?: React.ReactNode;
};

export function ListToolbar({ q, onQChange, qPlaceholder, sort, onSortChange, sortOptions, filters }: Props) {
  return (
    <div className="toolbar list-toolbar">
      <div className="search-box">
        <Search size={16} />
        <input placeholder={qPlaceholder ?? "Search..."} value={q} onChange={(e) => onQChange(e.target.value)} />
      </div>
      {filters}
      <label className="sort-control">
        Sort
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

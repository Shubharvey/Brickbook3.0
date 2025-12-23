import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownProps {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onSelect,
  className = "",
  placeholder = "Select",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-500 transition-all flex items-center justify-between group"
      >
        <span className={value ? "text-white" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : "group-hover:text-brand-500"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className="px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-300 hover:text-white flex items-center justify-between transition-colors"
            >
              {option}
              {value === option && (
                <Check size={14} className="text-brand-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

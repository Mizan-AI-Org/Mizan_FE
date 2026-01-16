import React, { useMemo, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search } from "lucide-react";
import { useTaskTemplates } from "@/hooks/useTaskTemplates";

interface TaskTemplateSelectorProps {
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
  showFilters?: boolean;
  // Multiselect mode (backward compatible)
  multiselect?: boolean;
  selectedIds?: string[];
  onChangeSelected?: (ids: string[]) => void;
}

export const TaskTemplateSelector: React.FC<TaskTemplateSelectorProps> = ({ selectedId, onSelect, className, showFilters = true, multiselect = false, selectedIds = [], onChangeSelected }) => {
  const {
    filteredTemplates,
    loading,
    error,
    query,
    setQuery,
    filterType,
    setFilterType,
    filterFrequency,
    setFilterFrequency,
    selectedId: hookSelectedId,
    setSelectedId,
  } = useTaskTemplates({ pollIntervalMs: 10000 });

  const effectiveSelectedId = selectedId ?? hookSelectedId;
  const effectiveSelectedIds = useMemo(() => (selectedIds || []).map(String), [selectedIds]);

  // Keyboard navigation index for multiselect
  const [activeIndex, setActiveIndex] = useState<number>(0);

  return (
    <div className={className}>
      {showFilters && (
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search templates"
            />
          </div>
          <select
            className="border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="">All Types</option>
            <option value="OPENING">Opening</option>
            <option value="SERVICE">Service</option>
            <option value="CLEANING">Cleaning</option>
            <option value="CLOSING">Closing</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="SOP">SOP</option>
          </select>
          <select
            className="border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value)}
            aria-label="Filter by frequency"
          >
            <option value="">All Frequencies</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUALLY">Annually</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
      )}

      {error && (
        <div className="mb-2">
          <Alert variant="destructive" role="alert">
            <AlertTitle>Failed to load templates</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {!multiselect ? (
        <Command className="rounded-md border">
          <CommandInput placeholder={loading ? "Loading templates…" : "Select a template…"} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading…" : "No templates found."}</CommandEmpty>
            <CommandGroup heading="Templates">
              {filteredTemplates.map((t) => (
                <CommandItem
                  key={t.id}
                  onSelect={() => {
                    const id = String(t.id);
                    if (onSelect) onSelect(id);
                    setSelectedId(id);
                  }}
                  aria-selected={String(t.id) === String(effectiveSelectedId)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="flex-1 truncate">{t.name}</span>
                    {t.template_type && (
                      <Badge variant="secondary" className="text-[10px] uppercase">{t.template_type}</Badge>
                    )}
                    {t.frequency && (
                      <Badge variant="outline" className="text-[10px] uppercase">{t.frequency}</Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      ) : (
        <div
          className="rounded-md border p-2 min-h-[240px] max-h-[50vh] overflow-y-auto"
          tabIndex={0}
          onKeyDown={(e) => {
            if (filteredTemplates.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, filteredTemplates.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === " ") {
              e.preventDefault();
              const t = filteredTemplates[activeIndex];
              if (!t) return;
              const id = String(t.id);
              const isSelected = effectiveSelectedIds.includes(id);
              const next = isSelected
                ? effectiveSelectedIds.filter((x) => x !== id)
                : [...effectiveSelectedIds, id];
              if (onChangeSelected) {
                onChangeSelected(next);
              }
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">Selected {effectiveSelectedIds.length}</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const allIds = filteredTemplates.map((t) => String(t.id));
                  if (onChangeSelected) {
                    onChangeSelected(allIds);
                  }
                }}
                aria-label="Select all templates"
              >
                Select All
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (onChangeSelected) {
                    onChangeSelected([]);
                  }
                }}
                aria-label="Clear selected templates"
              >
                Clear
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-muted-foreground">Loading templates…</div>
          )}

          {!loading && filteredTemplates.length === 0 && (
            <div className="text-sm text-muted-foreground">No templates found.</div>
          )}

          <ul className="space-y-1">
            {filteredTemplates.map((t, idx) => {
              const id = String(t.id);
              const checked = effectiveSelectedIds.includes(id);
              const isActive = idx === activeIndex;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left border ${checked ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted'} ${isActive ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      const next = checked
                        ? effectiveSelectedIds.filter((x) => x !== id)
                        : [...effectiveSelectedIds, id];
                      if (onChangeSelected) {
                        onChangeSelected(next);
                      }
                      setActiveIndex(idx);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...effectiveSelectedIds, id]
                          : effectiveSelectedIds.filter((x) => x !== id);
                        if (onChangeSelected) {
                          onChangeSelected(next);
                        }
                        setActiveIndex(idx);
                      }}
                      className="h-4 w-4"
                      aria-label={`Select template ${t.name}`}
                    />
                    <span className="flex-1 truncate">{t.name}</span>
                    <div className="flex items-center gap-2">
                      {t.template_type && (
                        <Badge variant="secondary" className="text-[10px] uppercase">{t.template_type}</Badge>
                      )}
                      {t.frequency && (
                        <Badge variant="outline" className="text-[10px] uppercase">{t.frequency}</Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskTemplateSelector;
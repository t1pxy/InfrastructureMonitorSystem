"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HardwareFiltersProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HardwareFilters({
  value,
  onChange,
}: HardwareFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search hostname / IP / serial / user / department..."
          className="pl-9"
        />
      </div>

      {value && (
        <Button type="button" variant="outline" onClick={() => onChange("")}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}

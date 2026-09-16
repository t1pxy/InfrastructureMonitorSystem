"use client"

import { Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AppTopbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5"></Menu></Button>
        <div className="relative hidden w-64 md:block lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"></Search>
          <Input placeholder="Search..." className="pl-9"></Input>
        </div>
      </div>
    </header>
  );
}
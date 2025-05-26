"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  placeholder?: string
  value?: string
  onSearch: (value: string) => void
  debounceMs?: number
  className?: string
  showClearButton?: boolean
}

export function SearchInput({
  placeholder = "Rechercher...",
  value = "",
  onSearch,
  debounceMs = 300,
  className,
  showClearButton = true
}: SearchInputProps) {
  const [searchValue, setSearchValue] = useState(value)
  const debouncedSearchValue = useDebounce(searchValue, debounceMs)

  useEffect(() => {
    onSearch(debouncedSearchValue)
  }, [debouncedSearchValue, onSearch])

  useEffect(() => {
    setSearchValue(value)
  }, [value])

  const handleClear = () => {
    setSearchValue("")
    onSearch("")
  }

  return (
    <div className={cn("relative flex-1 max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {showClearButton && searchValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
} 
"use client"

import type * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic validation to allow only numbers and ":"
    const newValue = e.target.value.replace(/[^0-9:]/g, "")

    // Further validation to ensure correct format (HH:MM)
    if (/^([0-9]{0,2}:[0-9]{0,2})?$/.test(newValue)) {
      onChange(newValue)
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="HH:MM"
          value={value}
          onChange={handleInputChange}
          className="w-24"
          maxLength={5}
        />
      </div>
    </div>
  )
}

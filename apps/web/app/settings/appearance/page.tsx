"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Palette, Monitor, Moon, Sun, Type, Layout, Eye } from "lucide-react"

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState("system")
  const [fontSize, setFontSize] = useState("medium")
  const [fontFamily, setFontFamily] = useState("inter")
  const [compactMode, setCompactMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [colorScheme, setColorScheme] = useState("blue")

  const themes = [
    { value: "light", label: "Light", icon: Sun, description: "Light theme for daytime use" },
    { value: "dark", label: "Dark", icon: Moon, description: "Dark theme for low-light environments" },
    { value: "system", label: "System", icon: Monitor, description: "Follow your system preference" },
  ]

  const colorSchemes = [
    { value: "blue", label: "Blue", color: "bg-blue-500" },
    { value: "green", label: "Green", color: "bg-green-500" },
    { value: "purple", label: "Purple", color: "bg-purple-500" },
    { value: "orange", label: "Orange", color: "bg-orange-500" },
    { value: "red", label: "Red", color: "bg-red-500" },
    { value: "pink", label: "Pink", color: "bg-pink-500" },
  ]

  const fontSizes = [
    { value: "small", label: "Small", size: "text-sm" },
    { value: "medium", label: "Medium", size: "text-base" },
    { value: "large", label: "Large", size: "text-lg" },
    { value: "extra-large", label: "Extra Large", size: "text-xl" },
  ]

  const fontFamilies = [
    { value: "inter", label: "Inter", family: "font-sans" },
    { value: "roboto", label: "Roboto", family: "font-sans" },
    { value: "system", label: "System Default", family: "font-system" },
    { value: "mono", label: "Monospace", family: "font-mono" },
  ]

  const handleSaveSettings = () => {
    console.log("Saving appearance settings...")
  }

  const handleResetToDefaults = () => {
    setTheme("system")
    setFontSize("medium")
    setFontFamily("inter")
    setCompactMode(false)
    setReducedMotion(false)
    setHighContrast(false)
    setColorScheme("blue")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Palette className="h-8 w-8 text-purple-500 animate-pulse" />
          Appearance Settings
        </h1>
        <p className="text-slate-600 mt-2">Customize the look and feel of your interface</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>Choose your preferred color theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((themeOption) => {
              const IconComponent = themeOption.icon
              return (
                <div
                  key={themeOption.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    theme === themeOption.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setTheme(themeOption.value)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent className="h-5 w-5" />
                    <span className="font-medium">{themeOption.label}</span>
                    {theme === themeOption.value && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{themeOption.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Scheme
          </CardTitle>
          <CardDescription>Choose your preferred accent color</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {colorSchemes.map((scheme) => (
              <div
                key={scheme.value}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  colorScheme === scheme.value
                    ? "border-gray-400 ring-2 ring-offset-2 ring-gray-400"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setColorScheme(scheme.value)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${scheme.color}`} />
                  <span className="text-sm font-medium">{scheme.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>Customize text appearance and readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger id="font-size">
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      <span className={size.size}>{size.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger id="font-family">
                  <SelectValue placeholder="Select font family" />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span className={font.family}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div
              className={`${fontFamilies.find((f) => f.value === fontFamily)?.family} ${fontSizes.find((s) => s.value === fontSize)?.size}`}
            >
              <p>The quick brown fox jumps over the lazy dog.</p>
              <p className="text-slate-600 mt-1">This is how your text will appear with the selected settings.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Layout & Spacing
          </CardTitle>
          <CardDescription>Adjust the layout and spacing of interface elements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Compact Mode</h4>
              <p className="text-sm text-slate-600">Reduce spacing between elements for a denser layout</p>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="rounded"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility
          </CardTitle>
          <CardDescription>Improve accessibility and reduce visual strain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Reduced Motion</h4>
                <p className="text-sm text-slate-600">Minimize animations and transitions</p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">High Contrast</h4>
                <p className="text-sm text-slate-600">Increase contrast for better visibility</p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your settings will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`p-6 border rounded-lg ${compactMode ? "space-y-2" : "space-y-4"} ${
              highContrast ? "border-black" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${colorSchemes.find((c) => c.value === colorScheme)?.color}`} />
              <div>
                <h3
                  className={`font-semibold ${fontSizes.find((s) => s.value === fontSize)?.size} ${fontFamilies.find((f) => f.value === fontFamily)?.family}`}
                >
                  Sample Card Title
                </h3>
                <p
                  className={`text-slate-600 ${fontSizes.find((s) => s.value === fontSize)?.size} ${fontFamilies.find((f) => f.value === fontFamily)?.family}`}
                >
                  This is a preview of how your content will appear.
                </p>
              </div>
            </div>
            <Separator />
            <div className={`flex gap-2 ${compactMode ? "py-1" : "py-2"}`}>
              <Badge variant="default">Sample Badge</Badge>
              <Badge variant="outline">Another Badge</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleResetToDefaults}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSaveSettings}>Save Appearance Settings</Button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Globe, Clock, DollarSign } from "lucide-react"

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState("en")
  const [region, setRegion] = useState("US")
  const [timezone, setTimezone] = useState("America/New_York")
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY")
  const [timeFormat, setTimeFormat] = useState("12")
  const [currency, setCurrency] = useState("USD")
  const [numberFormat, setNumberFormat] = useState("1,234.56")

  const languages = [
    { code: "en", name: "English", nativeName: "English", flag: "🇺🇸", completion: 100 },
    { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", completion: 95 },
    { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", completion: 90 },
    { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", completion: 85 },
    { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", completion: 80 },
    { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", completion: 88 },
    { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", completion: 75 },
    { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", completion: 70 },
    { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", completion: 65 },
    { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳", completion: 72 },
    { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", completion: 60 },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", completion: 55 },
  ]

  const regions = [
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "ES", name: "Spain", flag: "🇪🇸" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "KR", name: "South Korea", flag: "🇰🇷" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "IN", name: "India", flag: "🇮🇳" },
  ]

  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5" },
    { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6" },
    { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8" },
    { value: "Europe/London", label: "Greenwich Mean Time (GMT)", offset: "UTC+0" },
    { value: "Europe/Paris", label: "Central European Time (CET)", offset: "UTC+1" },
    { value: "Europe/Moscow", label: "Moscow Time (MSK)", offset: "UTC+3" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (JST)", offset: "UTC+9" },
    { value: "Asia/Shanghai", label: "China Standard Time (CST)", offset: "UTC+8" },
    { value: "Asia/Kolkata", label: "India Standard Time (IST)", offset: "UTC+5:30" },
    { value: "Australia/Sydney", label: "Australian Eastern Time (AET)", offset: "UTC+10" },
  ]

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
  ]

  const handleSaveSettings = () => {
    console.log("Saving language and regional settings...")
  }

  const selectedLanguage = languages.find((lang) => lang.code === language)
  const selectedRegion = regions.find((reg) => reg.code === region)
  const selectedTimezone = timezones.find((tz) => tz.value === timezone)
  const selectedCurrency = currencies.find((curr) => curr.code === currency)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Globe className="h-8 w-8 text-green-500 animate-pulse" />
          Language & Region
        </h1>
        <p className="text-slate-600 mt-2">Customize your language and regional preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Settings
          </CardTitle>
          <CardDescription>Choose your preferred language for the interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  language === lang.code ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setLanguage(lang.code)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <div className="font-medium">{lang.name}</div>
                      <div className="text-sm text-slate-600">{lang.nativeName}</div>
                    </div>
                  </div>
                  {language === lang.code && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Translation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${lang.completion}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{lang.completion}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedLanguage && selectedLanguage.completion < 100 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">Translation in Progress</span>
              </div>
              <p className="text-sm text-amber-700">
                {selectedLanguage.name} translation is {selectedLanguage.completion}% complete. Some text may appear in
                English until translation is finished.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>Set your region for localized content and formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((reg) => (
                  <SelectItem key={reg.code} value={reg.code}>
                    <div className="flex items-center gap-2">
                      <span>{reg.flag}</span>
                      <span>{reg.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time & Date Settings
          </CardTitle>
          <CardDescription>Configure how time and dates are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex justify-between w-full">
                        <span>{tz.label}</span>
                        <span className="text-slate-500 ml-2">{tz.offset}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-format">Time Format</Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger id="time-format">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="date-format">
                <SelectValue placeholder="Select date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</SelectItem>
                <SelectItem value="DD MMM YYYY">DD MMM YYYY (15 Jan 2024)</SelectItem>
                <SelectItem value="MMM DD, YYYY">MMM DD, YYYY (Jan 15, 2024)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="space-y-1 text-sm">
              <div>Current time: {timeFormat === "12" ? "2:30 PM" : "14:30"}</div>
              <div>
                Today's date:{" "}
                {dateFormat === "MM/DD/YYYY"
                  ? "01/15/2024"
                  : dateFormat === "DD/MM/YYYY"
                    ? "15/01/2024"
                    : dateFormat === "YYYY-MM-DD"
                      ? "2024-01-15"
                      : dateFormat === "DD MMM YYYY"
                        ? "15 Jan 2024"
                        : "Jan 15, 2024"}
              </div>
              <div>
                Timezone: {selectedTimezone?.label} ({selectedTimezone?.offset})
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency & Number Formats
          </CardTitle>
          <CardDescription>Set your preferred currency and number formatting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{curr.symbol}</span>
                        <span>
                          {curr.name} ({curr.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number-format">Number Format</Label>
              <Select value={numberFormat} onValueChange={setNumberFormat}>
                <SelectTrigger id="number-format">
                  <SelectValue placeholder="Select number format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1,234.56">1,234.56 (US/UK)</SelectItem>
                  <SelectItem value="1.234,56">1.234,56 (European)</SelectItem>
                  <SelectItem value="1 234,56">1 234,56 (French)</SelectItem>
                  <SelectItem value="1'234.56">1'234.56 (Swiss)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="space-y-1 text-sm">
              <div>
                Currency: {selectedCurrency?.symbol}1
                {numberFormat.includes(",") ? "," : numberFormat.includes(".") ? "." : " "}234
                {numberFormat.endsWith(".56") ? ".56" : numberFormat.endsWith(",56") ? ",56" : ".56"}
              </div>
              <div>
                Large number:{" "}
                {numberFormat === "1,234.56"
                  ? "1,234,567.89"
                  : numberFormat === "1.234,56"
                    ? "1.234.567,89"
                    : numberFormat === "1 234,56"
                      ? "1 234 567,89"
                      : "1'234'567.89"}
              </div>
              <div>Percentage: 85{numberFormat.endsWith(",56") ? ",5" : ".5"}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>Save Language & Regional Settings</Button>
      </div>
    </div>
  )
}

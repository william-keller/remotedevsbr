# Invoice Print i18n Fix & Browser Language Detection

## Problem Statement

1. **Invoice print dates are locale-locked:** The invoice generator formats dates at creation time (e.g., "31 de agosto de 2026") and stores them as static strings. When an English user prints, the date remains in Portuguese because `InvoicePreview` displays `data.date` directly without re-formatting.

2. **No browser language detection:** The i18n system defaults to Portuguese (`"pt"`) for all first-time visitors, regardless of their browser language. Users must manually toggle.

3. **No cookie persistence:** Language preference is stored only in `localStorage`, which is inaccessible to server-side rendering. No cross-device persistence for logged-in users.

4. **Hardcoded English strings in invoice:** `document.title` in the print view and a toast message contain hardcoded English text.

---

## Design

### 1. Invoice Date Formatting Fix

**File:** `components/InvoicePreview.tsx`

**Change:** Format dates dynamically from `rawDate`/`rawDueDate` using `Intl.DateTimeFormat` instead of displaying the pre-formatted `date`/`dueDate` strings.

```typescript
const formatDate = (isoDate: string | undefined, locale: string) => {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(mapLocale(locale), { month: "long", day: "numeric", year: "numeric" });
};
```

**Usage in component:**
- Line 151: `{formatDate(data.rawDate, locale) || data.date}` (fallback to `data.date` for legacy data without `rawDate`)
- Line 163: `{formatDate(data.rawDueDate, locale) || data.dueDate}` (same fallback)

**Fallback strategy:** If `rawDate` is missing (legacy invoice data), fall back to displaying `data.date` as-is. This ensures backward compatibility.

### 2. Browser Language Detection + Cookie Persistence

**File:** `lib/i18n.tsx`

**Changes to `I18nProvider`:**

Add cookie helpers (reuse pattern from `invoice-generator/page.tsx`):
```typescript
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}
```

Add browser language detection:
```typescript
function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "pt";
  const nav = navigator.language || navigator.languages?.[0] || "";
  return nav.startsWith("en") ? "en" : "pt";
}
```

**Updated locale initialization priority:**
1. Cookie `locale` (highest priority, persists across sessions and accessible server-side)
2. localStorage `locale` (existing behavior, kept for backward compatibility)
3. `navigator.language` detection (new: maps `en-*` to `"en"`, everything else to `"pt"`)
4. Default `"pt"`

```typescript
const [locale, setLocaleState] = useState<Locale>(() => {
  if (typeof window === "undefined") return "pt";
  const cookieLocale = getCookie("locale") as Locale | null;
  if (cookieLocale && ["pt", "en"].includes(cookieLocale)) return cookieLocale;
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored && ["pt", "en"].includes(stored)) return stored;
  return detectBrowserLocale();
});
```

**Updated `setLocale`:**
```typescript
const setLocale = (l: Locale) => {
  setLocaleState(l);
  localStorage.setItem("locale", l);
  setCookie("locale", l);
};
```

### 3. Profile Sync for Logged-in Users

**File:** `app/providers.tsx`

**New component:** `LocaleSync` (sits inside `I18nProvider` and `AuthProvider`)

```typescript
function LocaleSync({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { locale, setLocale } = useI18n();
  const [initialized, setInitialized] = useState(false);

  // On login: fetch profile.locale and apply if it differs
  useEffect(() => {
    if (!user) { setInitialized(true); return; }
    supabase.from("profiles").select("locale").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.locale && ["pt", "en"].includes(data.locale) && data.locale !== locale) {
          setLocale(data.locale as Locale);
        }
        setInitialized(true);
      });
  }, [user]);

  // On locale change: update profile if logged in
  useEffect(() => {
    if (!user || !initialized) return;
    supabase.from("profiles").upsert({ id: user.id, locale }, { onConflict: "id" });
  }, [locale, user, initialized]);

  return <>{children}</>;
}
```

**Updated provider tree:**
```
QueryClientProvider > I18nProvider > AuthProvider > LocaleSync > FeatureTogglesProvider > EnglishLangGuard > ...
```

### 4. Additional Hardcoded String Fixes

**`components/InvoicePreview.tsx` line 87:**
```typescript
// Before:
document.title = `Invoice ${data.invoiceNumber || "1"}`;
// After:
document.title = `${t("invoice.title")} ${data.invoiceNumber || "1"}`;
```

**`app/tools/invoice-generator/page.tsx` line 193:**
```typescript
// Before:
toast.success(t("invoice.invoiceNumber") + " #" + newInvoiceNumber + " updated");
// After:
toast.success(t("invoice.invoiceNumber") + " #" + newInvoiceNumber + " " + t("invoice.updated"));
```

**`lib/i18n.tsx` - New translation keys:**
```typescript
// PT dictionary:
"invoice.updated": "atualizado",

// EN dictionary:
"invoice.updated": "updated",
```

**`lib/i18n.tsx` - Fix Portuguese date placeholder:**
```typescript
// Before (both locales):
"invoice.datePlaceholder": "May 1, 2026",

// After:
// PT:
"invoice.datePlaceholder": "1 de maio de 2026",
// EN:
"invoice.datePlaceholder": "May 1, 2026",
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `components/InvoicePreview.tsx` | Dynamic date formatting from `rawDate`, internationalize `document.title` |
| `lib/i18n.tsx` | Cookie helpers, `navigator.language` detection, cookie persistence in `setLocale`, new translation keys, fix PT date placeholder |
| `app/providers.tsx` | New `LocaleSync` component, update provider tree |
| `app/tools/invoice-generator/page.tsx` | Use `t("invoice.updated")` instead of hardcoded string |

---

## Backward Compatibility

- **Legacy invoice data:** If `rawDate` is missing, fall back to displaying `data.date` as-is
- **Existing localStorage users:** Cookie is written on next `setLocale` call; existing localStorage values are still respected during the priority chain
- **Feature flag guard:** `EnglishLangGuard` continues to force `"pt"` when `is_english_lang_enabled` is off, overriding any detected/delivered locale

---

## Testing

1. **Invoice print:** Create invoice in PT, switch to EN, open print page. Dates should show in English format.
2. **Browser detection:** Clear localStorage and cookies, set browser to English, load site. Should default to EN.
3. **Cookie persistence:** Select EN, reload page. Should persist via cookie.
4. **Profile sync:** Log in, select EN, log out on another device, log in. Should get EN from profile.
5. **Feature flag:** Disable `is_english_lang_enabled`, verify locale forces to PT regardless of cookie/detection.
6. **Legacy data:** Open an invoice without `rawDate`, verify dates still display (using `data.date` fallback).

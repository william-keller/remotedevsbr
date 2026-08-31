"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";
import {
  InvoiceData,
  InvoiceItem,
  SUPPORTED_INVOICE_CURRENCIES,
  calculateSubtotal,
  normalizeInvoiceCurrency,
} from "@/components/InvoicePreview";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const PRINT_STORAGE_KEY = "invoice-generator-print-data";
const CURRENCY_LABELS: Record<(typeof SUPPORTED_INVOICE_CURRENCIES)[number], string> = {
  BRL: "BRL (R$)",
  USD: "USD ($)",
  EUR: "EUR (€)",
};

const todayIso = () => new Date().toISOString().split("T")[0];

function mapLocale(locale: string) {
  return locale === "pt" ? "pt-BR" : "en-US";
}

function formatDateForDisplay(value: string, locale: string) {
  if (!value) return "";
  const asDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(asDate.getTime())) return value;
  return asDate.toLocaleDateString(mapLocale(locale), { month: "long", day: "numeric", year: "numeric" });
}

function buildInitialData(t: (key: string) => string, locale: string): InvoiceData {
  const today = todayIso();
  return {
    logoDataUrl: "",
    invoiceNumber: "1",
    fromText: "",
    billToText: "",
    shipToText: "",
    date: formatDateForDisplay(today, locale),
    paymentTerms: "",
    dueDate: formatDateForDisplay(today, locale),
    poNumber: "",
    items: [{ id: crypto.randomUUID(), description: "", quantity: 1, rate: 5 }],
    notes: "",
    terms: "",
    currency: "USD",
    rawDate: today,
    rawDueDate: today,
  };
}

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

function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function incrementInvoiceNumber(numStr: string): string {
  const parsed = parseInt(numStr, 10);
  if (Number.isNaN(parsed)) return "1";
  return (parsed + 1).toString();
}

export default function InvoiceGeneratorPage() {
  const { t, locale } = useI18n();
  const [invoice, setInvoice] = useState<InvoiceData>(() => buildInitialData(t, locale));

  const [recurrentEnabled, setRecurrentEnabled] = useState(false);
  const [recurrentDays, setRecurrentDays] = useState(7);
  const [autoIncrement, setAutoIncrement] = useState(true);
  const [autoDownload, setAutoDownload] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRINT_STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInvoice(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load previous invoice from localStorage", e);
    }

    const savedEnabled = getCookie("invoice_recurrent_enabled");
    const savedDays = getCookie("invoice_recurrent_days");
    const savedAutoInc = getCookie("invoice_auto_increment");
    const savedAutoDownload = getCookie("invoice_recurrent_autodownload");

    if (savedEnabled) {
      setRecurrentEnabled(savedEnabled === "true");
    }
    if (savedDays) {
      setRecurrentDays(parseInt(savedDays, 10) || 7);
    }
    if (savedAutoInc) {
      setAutoIncrement(savedAutoInc === "true");
    }
    if (savedAutoDownload) {
      setAutoDownload(savedAutoDownload === "true");
    }
  }, []);

  const handleRecurrentEnabledChange = (val: boolean) => {
    setRecurrentEnabled(val);
    setCookie("invoice_recurrent_enabled", val.toString());
  };

  const handleRecurrentDaysChange = (val: number) => {
    setRecurrentDays(val);
    setCookie("invoice_recurrent_days", val.toString());
  };

  const handleAutoIncrementChange = (val: boolean) => {
    setAutoIncrement(val);
    setCookie("invoice_auto_increment", val.toString());
  };

  const handleAutoDownloadChange = (val: boolean) => {
    setAutoDownload(val);
    setCookie("invoice_recurrent_autodownload", val.toString());
  };

  const generateNextInvoice = () => {
    const currentRawDate = invoice.rawDate || todayIso();
    const nextRawDate = addDaysToDateString(currentRawDate, recurrentDays);
    const newDate = formatDateForDisplay(nextRawDate, locale);

    const currentRawDueDate = invoice.rawDueDate || todayIso();
    const nextRawDueDate = addDaysToDateString(currentRawDueDate, recurrentDays);
    const newDueDate = formatDateForDisplay(nextRawDueDate, locale);

    let newInvoiceNumber = invoice.invoiceNumber;
    if (autoIncrement) {
      newInvoiceNumber = incrementInvoiceNumber(invoice.invoiceNumber || "1");
    }

    const nextInvoice: InvoiceData = {
      ...invoice,
      rawDate: nextRawDate,
      date: newDate,
      rawDueDate: nextRawDueDate,
      dueDate: newDueDate,
      invoiceNumber: newInvoiceNumber,
    };

    setInvoice(nextInvoice);

    if (autoDownload) {
      try {
        localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(nextInvoice));
        window.open("/tools/invoice-generator/print", "_blank", "noopener,noreferrer");
      } catch {
        toast.error(t("invoice.printError"));
      }
    } else {
      toast.success(t("invoice.invoiceNumber") + " #" + newInvoiceNumber + " " + t("invoice.updated"));
    }
  };

  const subtotal = useMemo(() => calculateSubtotal(invoice.items), [invoice.items]);

  const setField = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) => {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  };

  const setItem = (id: string, updater: (item: InvoiceItem) => InvoiceItem) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? updater(item) : item)),
    }));
  };

  const addItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }],
    }));
  };

  const removeItem = (id: string) => {
    setInvoice((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.id !== id) };
    });
  };

  const onLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("invoice.logoTypeError"));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t("invoice.logoSizeError"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField("logoDataUrl", typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const openPrint = () => {
    try {
      localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(invoice));
      window.open("/tools/invoice-generator/print", "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("invoice.printError"));
    }
  };

  return (
    <AppLayout>
      <SEO
        title={t("invoice.seoTitle")}
        description={t("invoice.seoDesc")}
        canonicalPath="/tools/invoice-generator"
      />
      <div className="container max-w-5xl py-10 space-y-8">
        <div>
          <h1 className="text-4xl font-bold">{t("invoice.toolTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("invoice.toolSubtitle")}</p>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="space-y-2">
            <Label>{t("invoice.logo")}</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={onLogoUpload} />
              {invoice.logoDataUrl && (
                <Button variant="outline" type="button" onClick={() => setField("logoDataUrl", "")}>
                  {t("invoice.removeLogo")}
                </Button>
              )}
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${recurrentEnabled ? "bg-amber-500 animate-pulse" : "bg-zinc-300"}`} />
                {t("invoice.recurrentTitle")}
              </h2>
              <div className="flex items-center space-x-2">
                <Switch
                  id="recurrent-enable"
                  checked={recurrentEnabled}
                  onCheckedChange={handleRecurrentEnabledChange}
                />
                <Label htmlFor="recurrent-enable" className="cursor-pointer font-medium text-sm">
                  {t("invoice.recurrentEnable")}
                </Label>
              </div>
            </div>

            {recurrentEnabled && (
              <div className="grid md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="recurrent-days">{t("invoice.recurrentDays")}</Label>
                  <Input
                    id="recurrent-days"
                    type="number"
                    min={1}
                    value={recurrentDays}
                    onChange={(e) => handleRecurrentDaysChange(Number(e.target.value) || 7)}
                  />
                </div>
                <div className="space-y-3 flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-increment"
                      checked={autoIncrement}
                      onCheckedChange={handleAutoIncrementChange}
                    />
                    <Label htmlFor="auto-increment" className="cursor-pointer text-sm font-medium">
                      {t("invoice.autoIncrement")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-download"
                      checked={autoDownload}
                      onCheckedChange={handleAutoDownloadChange}
                    />
                    <Label htmlFor="auto-download" className="cursor-pointer text-sm font-medium">
                      {t("invoice.autoDownload")}
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.invoiceNumber")}</Label>
              <Input
                type="number"
                min={1}
                value={invoice.invoiceNumber}
                placeholder="1"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setField("invoiceNumber", "");
                    return;
                  }
                  const parsed = parseInt(val, 10);
                  setField("invoiceNumber", Number.isNaN(parsed) ? "" : parsed.toString());
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.currency")}</Label>
              <Select value={normalizeInvoiceCurrency(invoice.currency)} onValueChange={(value) => setField("currency", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_INVOICE_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {CURRENCY_LABELS[currency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.date")}</Label>
              <Input
                type="date"
                value={invoice.rawDate || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setInvoice((prev) => ({
                    ...prev,
                    rawDate: val,
                    date: formatDateForDisplay(val, locale),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.dueDate")}</Label>
              <Input
                type="date"
                value={invoice.rawDueDate || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setInvoice((prev) => ({
                    ...prev,
                    rawDueDate: val,
                    dueDate: formatDateForDisplay(val, locale),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.paymentTerms")}</Label>
              <Input
                value={invoice.paymentTerms}
                placeholder={t("invoice.paymentTermsPlaceholder")}
                onChange={(e) => setField("paymentTerms", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.poNumber")}</Label>
              <Input
                value={invoice.poNumber}
                placeholder={t("invoice.poNumberPlaceholder")}
                onChange={(e) => setField("poNumber", e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.from")}</Label>
              <Textarea
                rows={3}
                value={invoice.fromText}
                placeholder={t("invoice.fromPlaceholder")}
                onChange={(e) => setField("fromText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.billTo")}</Label>
              <Textarea
                rows={3}
                value={invoice.billToText}
                placeholder={t("invoice.billToPlaceholder")}
                onChange={(e) => setField("billToText", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.shipTo")}</Label>
              <Textarea
                rows={3}
                value={invoice.shipToText}
                placeholder={t("invoice.shipToPlaceholder")}
                onChange={(e) => setField("shipToText", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("invoice.items")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t("invoice.addItem")}
              </Button>
            </div>
            <div className="space-y-3">
              {invoice.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-12 md:col-span-6 space-y-1">
                    <Label>{t("invoice.item")}</Label>
                    <Input
                      value={item.description}
                      placeholder={t("invoice.itemPlaceholder")}
                      onChange={(e) => setItem(item.id, (i) => ({ ...i, description: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    <Label>{t("invoice.quantity")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => setItem(item.id, (i) => ({ ...i, quantity: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 space-y-1">
                    <Label>{t("invoice.rate")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => setItem(item.id, (i) => ({ ...i, rate: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={invoice.items.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.notes")}</Label>
              <Textarea
                rows={4}
                value={invoice.notes}
                placeholder={t("invoice.notesPlaceholder")}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("invoice.terms")}</Label>
              <Textarea
                rows={4}
                value={invoice.terms}
                placeholder={t("invoice.termsPlaceholder")}
                onChange={(e) => setField("terms", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t("invoice.total")}:{" "}
              {new Intl.NumberFormat(mapLocale(locale), {
                style: "currency",
                currency: normalizeInvoiceCurrency(invoice.currency),
              }).format(subtotal)}
            </p>
            <div className="flex items-center gap-3">
              {recurrentEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-500"
                  onClick={generateNextInvoice}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("invoice.generateNext")}
                </Button>
              )}
              <Button type="button" className="gradient-gold text-gold-foreground" onClick={openPrint}>
                <Download className="h-4 w-4 mr-2" />
                {t("invoice.download")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


// Number/money formatting for the English landing page. BRL always renders in
// pt-BR style (the audience is Brazilian), regardless of the page locale.

export function brl(value: number): string {
  const min = Number.isInteger(value) ? 0 : 2;
  const suffix = value >= 1000 ? "R$" : "R$";
  return `${suffix} ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: min,
    maximumFractionDigits: 2,
  })}`;
}

export function brlShort(value: number): string {
  const min = Number.isInteger(value) ? 0 : 2;
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: min,
    maximumFractionDigits: 2,
  });
}
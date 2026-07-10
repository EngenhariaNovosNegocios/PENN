export function normalizeNcm(value) {
  return value?.replace(/\D/g, "") ?? "";
}

export function formatRate(value) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`;
}

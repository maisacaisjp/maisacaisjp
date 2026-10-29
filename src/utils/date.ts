// Horário oficial da loja - São José dos Pinhais / PR (America/Sao_Paulo)
export function getStoreDate() {
  try {
    const now = new Date();
    const spString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const parsed = new Date(spString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {}
  return new Date();
}

import React from 'react';

/**
 * Retorna o nome formatado em texto puro para impressão térmica do cupom.
 */
export function getItemNameTextForPrint(item: any): string {
  if (!item) return '';
  const rawName = (typeof item === 'string' ? item : (item.name || item.menuItem?.name || '')).trim();
  return rawName;
}

/**
 * Componente JSX para exibir nome de item com destaques visuais adequados no painel.
 */
export function formatItemNameForPrint(item: any): React.ReactNode {
  const text = getItemNameTextForPrint(item);
  return <span>{text}</span>;
}

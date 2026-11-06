import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

// Paleta de comandos do gestor (Ctrl+K): ir para qualquer tela ou disparar uma ação pelo teclado.

export interface ComandoPaleta {
  id: string;
  rotulo: string;
  grupo: string;
  Icone: React.ComponentType<{ size?: number; className?: string }>;
  atalho?: string;
  palavras?: string;
  acao: () => void;
}

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PaletaComandos({
  aberto,
  onFechar,
  comandos,
}: {
  aberto: boolean;
  onFechar: () => void;
  comandos: ComandoPaleta[];
}) {
  const [busca, setBusca] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setBusca('');
    setIndice(0);
    setTimeout(() => inputRef.current?.focus(), 20);
  }, [aberto]);

  const filtrados = useMemo(() => {
    const t = normal(busca.trim());
    if (!t) return comandos;
    return comandos.filter(c => normal(`${c.rotulo} ${c.grupo} ${c.palavras || ''}`).includes(t));
  }, [busca, comandos]);

  useEffect(() => setIndice(0), [busca]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-i="${indice}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  if (!aberto) return null;

  const executar = (c?: ComandoPaleta) => {
    if (!c) return;
    onFechar();
    setTimeout(c.acao, 10);
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice(i => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executar(filtrados[indice]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onFechar();
    }
  };

  let grupoAnterior = '';

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 no-print" role="dialog" aria-modal="true" aria-label="Buscar ou ir para">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]" onClick={onFechar} />
      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(28,25,23,0.25)] ring-1 ring-stone-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100">
          <Search size={18} className="text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            data-palette-input="true"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={teclas}
            placeholder="Buscar tela ou ação…"
            style={{ outline: 'none', boxShadow: 'none' }}
            className="flex-1 h-full bg-transparent text-[15px] text-stone-900 placeholder:text-stone-400 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
          <kbd className="text-[11px] font-semibold text-stone-500 bg-stone-100 rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul ref={listaRef} className="max-h-[52vh] overflow-y-auto py-2">
          {filtrados.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-stone-500">Nada encontrado para "{busca}".</li>}
          {filtrados.map((c, i) => {
            const cabecalho = c.grupo !== grupoAnterior ? c.grupo : null;
            grupoAnterior = c.grupo;
            const ativo = i === indice;
            return (
              <React.Fragment key={c.id}>
                {cabecalho && <li className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{cabecalho}</li>}
                <li data-i={i}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => executar(c)}
                    className={`w-full h-11 px-4 flex items-center gap-3 text-left text-[14px] cursor-pointer ${ativo ? 'bg-brand-50 text-brand-800' : 'text-stone-700'}`}
                  >
                    <c.Icone size={18} className={ativo ? 'text-brand-700' : 'text-stone-400'} />
                    <span className="flex-1 truncate font-medium">{c.rotulo}</span>
                    {c.atalho && <kbd className="text-[11px] font-semibold text-stone-500 bg-stone-100 rounded-md px-1.5 py-0.5">{c.atalho}</kbd>}
                    {ativo && <CornerDownLeft size={15} className="text-brand-600" />}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div className="px-4 h-10 border-t border-stone-100 flex items-center gap-4 text-[12px] text-stone-500">
          <span><kbd className="font-semibold">↑ ↓</kbd> navegar</span>
          <span><kbd className="font-semibold">Enter</kbd> abrir</span>
          <span className="ml-auto"><kbd className="font-semibold">F2</kbd> nova venda · <kbd className="font-semibold">/</kbd> buscar na tela</span>
        </div>
      </div>
    </div>
  );
}

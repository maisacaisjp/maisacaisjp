// Peças visuais compartilhadas pelas abas do gestor.
// Objetivo: listas que cabem na tela (sem barra de rolagem na página) e o mesmo padrão em todas as abas.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Quantas linhas de uma lista cabem do topo do elemento até o fim da tela.
 * `reserva` = espaço que fica abaixo da lista (paginação, respiro do card e da página).
 * Depois de desenhar, confere se a página passou da tela e tira as linhas que sobraram (autocorreção),
 * então a reserva só precisa ser aproximada. Recalcula ao redimensionar a janela e quando `deps` mudam.
 */
export function useLinhasQueCabem(
  ref: React.RefObject<HTMLElement | null>,
  alturaLinha: number,
  { reserva = 76, min = 5, max = 60, deps = [] as unknown[] } = {},
) {
  const [linhas, setLinhas] = useState(min);
  const ajuste = useRef(0); // linhas tiradas pela autocorreção (vale até a janela mudar de tamanho)
  const base = useRef(min);
  const quadro = useRef(0);

  const aplicar = () => setLinhas(Math.max(min, Math.min(max, base.current - ajuste.current)));

  const conferir = () => {
    cancelAnimationFrame(quadro.current);
    // espera o navegador desenhar a lista com o novo número de linhas
    quadro.current = requestAnimationFrame(() => {
      quadro.current = requestAnimationFrame(() => {
        const doc = document.scrollingElement;
        if (!doc || !ref.current) return;
        // Dentro de um card (<section>): confere só o card, para uma coluna vizinha mais alta não encolher a lista
        const card = ref.current.closest('section');
        let sobra: number;
        if (card) {
          const main = document.querySelector('main');
          const respiro = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
          sobra = card.getBoundingClientRect().bottom + respiro - window.innerHeight;
        } else {
          sobra = doc.scrollHeight - window.innerHeight;
        }
        if (sobra > 1 && base.current - ajuste.current > min) {
          ajuste.current += Math.ceil(sobra / alturaLinha);
          aplicar();
          conferir();
        }
      });
    });
  };

  const medir = () => {
    const el = ref.current;
    if (!el) return;
    const topo = el.getBoundingClientRect().top + (document.scrollingElement?.scrollTop ?? 0);
    base.current = Math.floor((window.innerHeight - topo - reserva) / alturaLinha);
    aplicar();
    conferir();
  };

  useLayoutEffect(() => {
    medir();
    // Mede de novo quando a fonte termina de carregar e os filtros acabam de quebrar linha
    const t1 = window.setTimeout(medir, 250);
    const t2 = window.setTimeout(medir, 900);
    document.fonts?.ready?.then(() => medir()).catch(() => {});
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(quadro.current);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const aoMudar = () => {
      ajuste.current = 0;
      medir();
    };
    window.addEventListener('resize', aoMudar);
    return () => window.removeEventListener('resize', aoMudar);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  return linhas;
}

/** Fatia a lista na página atual e volta para a 1ª quando a lista encolhe. */
export function usePaginacao<T>(lista: T[], porPagina: number, resetarQuando: unknown[] = []) {
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), resetarQuando); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Math.max(1, Math.ceil(lista.length / Math.max(1, porPagina)));
  const atual = Math.min(pagina, total);
  const inicio = (atual - 1) * porPagina;
  return {
    pagina: atual,
    totalPaginas: total,
    itens: lista.slice(inicio, inicio + porPagina),
    inicio,
    irPara: (p: number) => setPagina(Math.max(1, Math.min(total, p))),
  };
}

/**
 * Atalho: lista que cabe na tela. Devolve o ref para pôr no contêiner da lista,
 * os itens da página atual e as props prontas para <Paginacao>.
 */
export function useListaQueCabe<T>(
  lista: T[],
  alturaLinha: number,
  { reserva = 110, min = 3, deps = [] as unknown[], resetar = [] as unknown[] } = {},
) {
  const ref = useRef<any>(null); // div, ul ou tbody: o contêiner da lista
  const porPagina = useLinhasQueCabem(ref, alturaLinha, { reserva, min, deps: [lista.length > 0, ...deps] });
  const pag = usePaginacao(lista, porPagina, resetar);
  return {
    ref,
    itens: pag.itens,
    paginacao: {
      pagina: pag.pagina,
      totalPaginas: pag.totalPaginas,
      inicio: pag.inicio,
      mostrando: pag.itens.length,
      total: lista.length,
      onIr: pag.irPara,
    },
  };
}

/** Rodapé de paginação: "13–24 de 129" + anterior/próxima + números. */
export function Paginacao({
  pagina,
  totalPaginas,
  inicio,
  mostrando,
  total,
  onIr,
  rotulo = 'itens',
  className = '',
  compacto = false,
}: {
  pagina: number;
  totalPaginas: number;
  inicio: number;
  mostrando: number;
  total: number;
  onIr: (p: number) => void;
  rotulo?: string;
  className?: string;
  /** Para cards estreitos: só setas e "2/13" */
  compacto?: boolean;
}) {
  if (total === 0) return null;
  if (compacto) {
    const seta = 'h-7 w-7 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default';
    return (
      <div className={`flex items-center justify-between gap-2 pt-2 border-t border-stone-100 ${className}`}>
        <span className="text-[12px] text-stone-500 tabular-nums">{inicio + 1}–{inicio + mostrando} de {total}</span>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-0.5">
            <button className={seta} onClick={() => onIr(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior"><ChevronLeft size={15} /></button>
            <span className="text-[12px] font-semibold text-stone-700 tabular-nums px-1">{pagina}/{totalPaginas}</span>
            <button className={seta} onClick={() => onIr(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Próxima página"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>
    );
  }
  // Até 7 botões: 1 … 4 5 6 … 11
  const numeros: (number | '…')[] = [];
  if (totalPaginas <= 7) {
    for (let i = 1; i <= totalPaginas; i++) numeros.push(i);
  } else {
    numeros.push(1);
    const a = Math.max(2, pagina - 1);
    const b = Math.min(totalPaginas - 1, pagina + 1);
    if (a > 2) numeros.push('…');
    for (let i = a; i <= b; i++) numeros.push(i);
    if (b < totalPaginas - 1) numeros.push('…');
    numeros.push(totalPaginas);
  }
  const botao = 'h-8 min-w-8 px-2 rounded-lg text-[13px] font-semibold tabular-nums transition-colors cursor-pointer disabled:cursor-default';
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-t border-stone-100 ${className}`}>
      <p className="text-[13px] text-stone-500 tabular-nums">
        {totalPaginas > 1 ? (
          <>
            <span className="font-semibold text-stone-800">{inicio + 1}–{inicio + mostrando}</span> de {total} {rotulo}
          </>
        ) : (
          <>
            <span className="font-semibold text-stone-800">{total}</span> {rotulo}
          </>
        )}
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onIr(pagina - 1)}
            disabled={pagina === 1}
            className={`${botao} text-stone-600 hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent flex items-center justify-center`}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          {numeros.map((n, i) =>
            n === '…' ? (
              <span key={`r${i}`} className="w-6 text-center text-stone-400 text-[13px]">…</span>
            ) : (
              <button
                key={n}
                onClick={() => onIr(n)}
                aria-current={n === pagina ? 'page' : undefined}
                className={`${botao} ${n === pagina ? 'bg-brand-700 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => onIr(pagina + 1)}
            disabled={pagina === totalPaginas}
            className={`${botao} text-stone-600 hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent flex items-center justify-center`}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Chip de filtro com contador (mesmo visual em todas as abas). */
export function ChipFiltro({
  ativo,
  onClick,
  children,
  contador,
  tom = 'marca',
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  contador?: number;
  tom?: 'marca' | 'neutro';
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
        ativo
          ? tom === 'marca'
            ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
            : 'bg-stone-900 text-white border-stone-900'
          : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300 hover:text-brand-700'
      }`}
    >
      {children}
      {contador !== undefined && (
        <span className={`text-[12px] tabular-nums ${ativo ? 'text-white/70' : 'text-stone-400'}`}>{contador}</span>
      )}
    </button>
  );
}

/** Seletor de seção dentro de uma página (uma seção por vez, cada uma do tamanho da tela). */
export function SeletorSecao<T extends string>({
  valor,
  onChange,
  opcoes,
  className = '',
}: {
  valor: T;
  onChange: (v: T) => void;
  opcoes: { id: T; rotulo: string; contador?: number; alerta?: boolean }[];
  className?: string;
}) {
  return (
    <div className={`inline-flex flex-wrap items-center gap-1 bg-stone-100 rounded-xl p-1 ${className}`} role="tablist">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 px-3 rounded-lg text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            valor === o.id ? 'bg-white text-brand-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          {o.rotulo}
          {o.contador !== undefined && (
            <span className={`min-w-5 h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${o.alerta ? 'bg-amber-400 text-[#2a0a3f]' : 'bg-stone-200 text-stone-600'}`}>
              {o.contador}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Altura máxima para uma área (ex.: um demonstrativo contábil) caber até o fim da tela.
 * Use com overflow-y-auto: a área só rola por dentro se não couber; a página continua parada.
 */
export function useAlturaQueCabe(ref: React.RefObject<HTMLElement | null>, reserva = 90, deps: unknown[] = []) {
  const [altura, setAltura] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const medir = () => {
      const el = ref.current;
      if (!el) return;
      const topo = el.getBoundingClientRect().top + (document.scrollingElement?.scrollTop ?? 0);
      setAltura(Math.max(220, Math.floor(window.innerHeight - topo - reserva)));
    };
    medir();
    const t = window.setTimeout(medir, 300);
    window.addEventListener('resize', medir);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', medir);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return altura;
}

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { dadosIniciais, migrar } from './constantes';
import type { AdicionalCardapio, Dados, Pedido, ProdutoCardapio, SecaoContabil } from './types';

// Os dados do Financeiro ficam na tabela financeiro_maisacai (FINANCEIRO_MAIS_ACAI.sql),
// visível só para o dono logado. O navegador guarda uma cópia para não perder nada se a internet cair.
const TABELA = 'financeiro_maisacai';
const LINHA = 'principal';
const CACHE = 'maisacai_financeiro_cache_v1';

export type Aba = 'painel' | 'contabil' | 'fichas' | 'insumos' | 'preparos' | 'fixos' | 'lancamentos' | 'vendas' | 'historico' | 'ajustes';
export type StatusSalvo = 'carregando' | 'salvo' | 'salvando' | 'pendente' | 'erro' | 'conflito' | 'sem-tabela' | 'sem-permissao';

interface Ctx {
  dados: Dados;
  atualizar: (fn: (d: Dados) => Dados) => void;
  substituir: (d: Dados) => void;
  status: StatusSalvo;
  erroSalvar: string | null;
  recarregar: () => void;
  tentarDeNovo: () => void;
  cardapio: ProdutoCardapio[];
  adicionais: AdicionalCardapio[];
  cardapioErro: string | null;
  aba: Aba;
  irPara: (aba: Aba, fichaId?: string) => void;
  fichaSel: string | null;
  setFichaSel: (id: string | null) => void;
  secao: SecaoContabil;
  abrirContabil: (s: SecaoContabil) => void;
}

const DadosCtx = createContext<Ctx | null>(null);

const lerCache = (): Dados | null => {
  try {
    const s = localStorage.getItem(CACHE);
    return s ? migrar(JSON.parse(s)) : null;
  } catch {
    return null;
  }
};
const gravarCache = (d: Dados) => {
  try {
    localStorage.setItem(CACHE, JSON.stringify(d));
  } catch {
    /* sem storage */
  }
};

const ehTabelaAusente = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? '');
const ehSemPermissao = (e: { code?: string; message?: string }) => e.code === '42501' || /permission denied|row-level security/i.test(e.message ?? '');

export function FinanceiroProvider({ children, abaInicial = 'painel', secaoInicial = 'dre' }: { children: ReactNode; abaInicial?: Aba; secaoInicial?: SecaoContabil }) {
  const [dados, setDados] = useState<Dados>(() => lerCache() ?? dadosIniciais());
  const [status, setStatus] = useState<StatusSalvo>('carregando');
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [versaoCarga, setVersaoCarga] = useState(0);
  const [cardapio, setCardapio] = useState<ProdutoCardapio[]>([]);
  const [adicionais, setAdicionais] = useState<AdicionalCardapio[]>([]);
  const [cardapioErro, setCardapioErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [secao, setSecao] = useState<SecaoContabil>(secaoInicial);
  const [fichaSel, setFichaSel] = useState<string | null>(null);

  const ultimaVersao = useRef<string | null>(null); // updated_at conhecido no banco
  const sujo = useRef(false); // há alterações locais não salvas
  const podeSalvar = useRef(false);
  const dadosRef = useRef(dados);
  dadosRef.current = dados;

  const salvar = useCallback(async (d: Dados) => {
    if (!podeSalvar.current) return;
    setStatus('salvando');
    const agora = new Date().toISOString();
    const { data: sessao } = await supabase.auth.getSession();
    const linha = { dados: d, updated_at: agora, updated_by: sessao.session?.user.id ?? null };

    let res;
    if (ultimaVersao.current === null) {
      res = await supabase.from(TABELA).insert({ id: LINHA, ...linha }).select('updated_at');
      if (res.error?.code === '23505') {
        setStatus('conflito');
        return;
      }
    } else {
      res = await supabase.from(TABELA).update(linha).eq('id', LINHA).eq('updated_at', ultimaVersao.current).select('updated_at');
    }
    if (res.error) {
      setErroSalvar(res.error.message);
      setStatus(ehTabelaAusente(res.error) ? 'sem-tabela' : ehSemPermissao(res.error) ? 'sem-permissao' : 'erro');
      return;
    }
    if (!res.data || res.data.length === 0) {
      // Alguém salvou depois de nós (outro aparelho): não sobrescreve
      setStatus('conflito');
      return;
    }
    ultimaVersao.current = res.data[0].updated_at;
    // Só marca como salvo se nada mudou enquanto gravava
    if (dadosRef.current === d) sujo.current = false;
    setErroSalvar(null);
    setStatus(sujo.current ? 'pendente' : 'salvo');
  }, []);

  // Carrega do banco
  useEffect(() => {
    let vivo = true;
    podeSalvar.current = false;
    setStatus('carregando');
    supabase
      .from(TABELA)
      .select('dados, updated_at')
      .eq('id', LINHA)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) {
          setErroSalvar(error.message);
          setStatus(ehTabelaAusente(error) ? 'sem-tabela' : ehSemPermissao(error) ? 'sem-permissao' : 'erro');
          return;
        }
        if (data) {
          const d = migrar(data.dados);
          ultimaVersao.current = data.updated_at;
          sujo.current = false;
          setDados(d);
          gravarCache(d);
        } else {
          ultimaVersao.current = null;
          // Nada no banco ainda: se este navegador já tem dados (ex.: digitados antes de criar a tabela), envia
          sujo.current = lerCache() !== null;
        }
        podeSalvar.current = true;
        setErroSalvar(null);
        if (sujo.current) salvar(dadosRef.current);
        else setStatus('salvo');
      });
    return () => {
      vivo = false;
    };
  }, [versaoCarga]);

  // Cardápio e adicionais (somente leitura)
  useEffect(() => {
    Promise.all([
      supabase.from('menu_items').select('id,name,category,price_single,price_p,price_m,price_g,is_active').order('sort_order'),
      supabase.from('extras').select('id,name,price,is_active').order('sort_order'),
    ]).then(([m, e]) => {
      if (m.error) setCardapioErro(m.error.message);
      else setCardapio((m.data as ProdutoCardapio[]).filter((p) => !String(p.category ?? '').startsWith('system') && !String(p.id).startsWith('system')));
      if (!e.error) setAdicionais(e.data as AdicionalCardapio[]);
    });
  }, []);

  // Grava no cache sempre e no banco com pequena espera
  useEffect(() => {
    gravarCache(dados);
    if (!podeSalvar.current || !sujo.current) return;
    setStatus('pendente');
    const t = setTimeout(() => salvar(dados), 900);
    return () => clearTimeout(t);
  }, [dados, salvar]);

  const ctx: Ctx = {
    dados,
    atualizar: (fn) => {
      sujo.current = true;
      setDados((prev) => fn(prev));
    },
    substituir: (d) => {
      sujo.current = true;
      setDados(d);
    },
    status,
    erroSalvar,
    recarregar: () => setVersaoCarga((v) => v + 1),
    tentarDeNovo: () => {
      if (podeSalvar.current) salvar(dadosRef.current);
      else setVersaoCarga((v) => v + 1);
    },
    cardapio,
    adicionais,
    cardapioErro,
    aba,
    irPara: (a, fichaId) => {
      if (fichaId) setFichaSel(fichaId);
      setAba(a);
    },
    fichaSel,
    setFichaSel,
    secao,
    abrirContabil: (s) => {
      setSecao(s);
      setAba('contabil');
    },
  };
  return <DadosCtx.Provider value={ctx}>{children}</DadosCtx.Provider>;
}

export function useDados() {
  const c = useContext(DadosCtx);
  if (!c) throw new Error('useDados fora do FinanceiroProvider');
  return c;
}

// Intervalo do mês no fuso de São José dos Pinhais (UTC−3)
const inicioMes = (mes: string) => `${mes}-01T00:00:00-03:00`;
const proximoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
};

export async function lerPedidos(de: string, ate: string, campos: string): Promise<Pedido[]> {
  const todos: Pedido[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('orders')
      .select(campos)
      .gte('created_at', de)
      .lt('created_at', ate)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    todos.push(...((data ?? []) as unknown as Pedido[]));
    if (!data || data.length < 1000) break;
  }
  return todos;
}

export function usePedidos(mes: string) {
  const [estado, setEstado] = useState<{ pedidos: Pedido[]; carregando: boolean; erro: string | null }>({ pedidos: [], carregando: true, erro: null });
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    lerPedidos(inicioMes(mes), inicioMes(proximoMes(mes)), 'id,status,order_type,total_amount,created_at,items,motoboy_fee')
      .then((p) => vivo && setEstado({ pedidos: p, carregando: false, erro: null }))
      .catch((e) => vivo && setEstado({ pedidos: [], carregando: false, erro: String(e.message ?? e) }));
    return () => {
      vivo = false;
    };
  }, [mes, versao]);
  return { ...estado, recarregar: () => setVersao((v) => v + 1) };
}

// Faturamento e pedidos por mês (yyyy-mm) de um ano, lidos do gestor
export function useFaturamentoSistema(ano: number) {
  const [porMes, setPorMes] = useState<Record<string, { faturamento: number; pedidos: number }>>({});
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    lerPedidos(`${ano}-01-01T00:00:00-03:00`, `${ano + 1}-01-01T00:00:00-03:00`, 'total_amount,created_at,status')
      .then((lista) => {
        if (!vivo) return;
        const acc: Record<string, { faturamento: number; pedidos: number }> = {};
        for (const p of lista) {
          const mes = new Date(p.created_at).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
          acc[mes] = acc[mes] ?? { faturamento: 0, pedidos: 0 };
          acc[mes].faturamento += Number(p.total_amount) || 0;
          acc[mes].pedidos += 1;
        }
        setPorMes(acc);
      })
      .catch(() => vivo && setPorMes({}))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ano]);
  return { porMes, carregando };
}

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Card({ titulo, acoes, children, className = '' }: { titulo?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs ${className}`}>
      {(titulo || acoes) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-sm font-bold text-stone-900">{titulo}</h2>}
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type Variante = 'primario' | 'neutro' | 'perigo' | 'sucesso' | 'link';
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-[#6a2092] text-white hover:bg-[#521872] font-semibold shadow-2xs',
  neutro: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50',
  perigo: 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50',
  sucesso: 'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-2xs',
  link: 'text-stone-500 hover:text-[#6a2092]',
};

export function Btn({ variante = 'primario', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    />
  );
}

const paraTexto = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '' : String(+v.toFixed(4)).replace('.', ',');

function NumBase({ value, onChange, placeholder, className = '', vazio }: {
  value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; className?: string; vazio: number | null;
}) {
  const [texto, setTexto] = useState(paraTexto(value));
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!foco) setTexto(paraTexto(value));
  }, [value, foco]);
  return (
    <input
      inputMode="decimal"
      value={texto}
      placeholder={placeholder}
      onFocus={(e) => {
        setFoco(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFoco(false)}
      onChange={(e) => {
        setTexto(e.target.value);
        const t = e.target.value.replace(/\s/g, '').replace(',', '.');
        if (t === '') onChange(vazio);
        else if (!Number.isNaN(Number(t))) onChange(Number(t));
      }}
      className={`fin-campo text-right tabular-nums ${className}`}
    />
  );
}

export function Num(props: { value: number; onChange: (v: number) => void; placeholder?: string; className?: string }) {
  return <NumBase {...props} vazio={0} onChange={(v) => props.onChange(v ?? 0)} />;
}

// Campo opcional: vazio = null (usa o valor calculado)
export function NumOpcional(props: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; className?: string }) {
  return <NumBase {...props} vazio={null} />;
}

export function Txt({ value, onChange, placeholder, className = '', type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; type?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`fin-campo ${className}`} />;
}

export function Sel({ value, onChange, opcoes, className = '' }: { value: string; onChange: (v: string) => void; opcoes: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`fin-campo ${className}`}>
      {opcoes.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type Tom = 'ok' | 'alerta' | 'ruim' | 'info' | 'neutro';
const TONS: Record<Tom, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alerta: 'bg-amber-50 text-amber-700 border-amber-200',
  ruim: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-[#f5eefa] text-[#6a2092] border-[#e4d0f2]',
  neutro: 'bg-stone-50 text-stone-600 border-stone-200',
};

export function Selo({ tom = 'neutro', children, title }: { tom?: Tom; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONS[tom]}`}>
      {children}
    </span>
  );
}

export function tomCmv(cmv: number, meta: number): Tom {
  if (!Number.isFinite(cmv) || cmv <= 0) return 'neutro';
  if (cmv <= meta / 100) return 'ok';
  if (cmv <= (meta + 8) / 100) return 'alerta';
  return 'ruim';
}

export function Indicador({ rotulo, valor, sub, tom }: { rotulo: string; valor: ReactNode; sub?: ReactNode; tom?: 'ok' | 'ruim' }) {
  const cor = tom === 'ok' ? 'text-emerald-600' : tom === 'ruim' ? 'text-rose-600' : 'text-stone-900';
  return (
    <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xs">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{rotulo}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${cor}`}>{valor}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">{children}</div>;
}

export function SeletorMes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="month" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className="fin-campo w-44" />;
}

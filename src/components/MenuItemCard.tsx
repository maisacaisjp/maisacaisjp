import React, { useState } from 'react';
import { Plus, Flame } from 'lucide-react';
import { MenuItem } from '../types';
import { findImageForProduct } from '../utils/imageResolver';
import { hapticLight } from '../utils/haptics';
import { getSizeOptions } from '../utils/produto';
import { brl, nomeBonito, limparDescricao } from '../utils/formatacao';

interface MenuItemCardProps {
  item: MenuItem & { isMaisPedido?: boolean; groupOverride?: string };
  catId: string;
  failedImage: boolean;
  onImageError: () => void;
  onClick: () => void;
  onZoom: (src: string) => void;
  /** "lista": linha com foto à direita. "destaque": cartão vertical com foto grande (Mais pedidos). */
  variante?: 'lista' | 'destaque';
}

const EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

/** Menor preço e se o produto tem mais de um tamanho. */
function precoDoCard(item: MenuItem) {
  const tamanhos = getSizeOptions(item);
  if (tamanhos.length > 0) {
    return { valor: Math.min(...tamanhos.map(t => t.price)), aPartirDe: tamanhos.length > 1 };
  }
  return { valor: item.priceSingle || 0, aPartirDe: false };
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  catId,
  failedImage,
  onImageError,
  onClick,
  variante = 'lista',
}) => {
  const [imgAttempt, setImgAttempt] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  let photoSrc = item.imageUrl ? item.imageUrl.replace(/^\//, '') : '';
  if (photoSrc === 'none') {
    photoSrc = '';
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(item);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  // Caminho local sem extensão certa: tenta .png, .jpg, .jpeg e .webp
  const getDisplaySrc = () => {
    if (!photoSrc) return '';
    if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : photoSrc;
    if (imgAttempt > 0) return `/${photoSrc.replace(/\.(png|jpe?g|webp)$/i, '')}${EXTS[imgAttempt - 1]}`;
    return `/${photoSrc}`;
  };

  const currentSrc = getDisplaySrc();
  const hasPhoto = !!currentSrc && !failedImage;
  const nome = nomeBonito(item.name);
  const descricao = limparDescricao(item.ingredients);
  const { valor, aPartirDe } = precoDoCard(item);
  const maisPedido = item.isMaisPedido && catId === 'mais-pedidos';

  const abrir = () => {
    hapticLight();
    onClick();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrir();
    }
  };

  const imagem = (cls: string) => (
    <>
      {!imgLoaded && <div className="absolute inset-0 bg-stone-200/70 animate-pulse" />}
      <img
        src={currentSrc}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          if (imgAttempt < EXTS.length) setImgAttempt(prev => prev + 1);
          else onImageError();
        }}
        className={`${cls} transition-[opacity,transform] duration-500 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.04]`}
      />
    </>
  );

  const preco = (
    <div className="leading-none">
      {aPartirDe && <span className="block text-[11px] font-medium text-stone-500 mb-1">a partir de</span>}
      <span className="font-display text-[16px] font-bold text-stone-900 tabular-nums tracking-tight">{brl(valor)}</span>
    </div>
  );

  const botaoMais = (
    <span
      aria-hidden="true"
      className="w-9 h-9 rounded-full bg-white text-brand-700 shadow-[0_2px_10px_rgba(38,1,58,0.18)] ring-1 ring-black/5 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
    >
      <Plus className="w-[18px] h-[18px]" strokeWidth={2.6} />
    </span>
  );

  // Cartão vertical (carrossel "Mais pedidos")
  if (variante === 'destaque') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={abrir}
        onKeyDown={onKey}
        aria-label={`${nome}, ${aPartirDe ? 'a partir de ' : ''}${brl(valor)}`}
        className="group h-full flex flex-col bg-white rounded-2xl overflow-hidden ring-1 ring-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:shadow-[0_8px_24px_rgba(38,1,58,0.10)] transition-shadow duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <div className="relative aspect-square bg-brand-50 overflow-hidden">
          {hasPhoto ? imagem('absolute inset-0 w-full h-full object-cover') : (
            <div className="absolute inset-0 flex items-center justify-center font-display text-3xl font-extrabold text-brand-200">+A</div>
          )}
          {maisPedido && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-gold text-stone-900 text-[10px] font-bold uppercase tracking-wide px-2 py-1 shadow-sm">
              <Flame className="w-3 h-3 fill-current" /> Mais pedido
            </span>
          )}
          <span className="absolute bottom-2 right-2">{botaoMais}</span>
        </div>
        <div className="p-3 flex flex-col flex-1 gap-1">
          <h3 className="font-display text-[14px] sm:text-[15px] font-bold leading-snug text-stone-900 line-clamp-2">{nome}</h3>
          {descricao && <p className="text-[12px] leading-relaxed text-stone-500 line-clamp-2">{descricao}</p>}
          <div className="mt-auto pt-2">{preco}</div>
        </div>
      </article>
    );
  }

  // Linha com foto à direita (todas as outras seções)
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={abrir}
      onKeyDown={onKey}
      aria-label={`${nome}, ${aPartirDe ? 'a partir de ' : ''}${brl(valor)}`}
      className="group h-full bg-white rounded-2xl p-3 sm:p-3.5 flex items-stretch gap-3 sm:gap-4 ring-1 ring-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:shadow-[0_8px_24px_rgba(38,1,58,0.08)] hover:ring-brand-200 transition-[box-shadow,ring-color] duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <div className="flex-1 min-w-0 flex flex-col py-0.5">
        <h3 className="font-display text-[15px] sm:text-[16px] font-bold leading-snug text-stone-900 line-clamp-2">{nome}</h3>
        {descricao && (
          <p className="mt-1 text-[13px] leading-relaxed text-stone-500 line-clamp-2">{descricao}</p>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          {preco}
          {!hasPhoto && botaoMais}
        </div>
      </div>
      {hasPhoto && (
        <div className="relative w-[116px] h-[116px] sm:w-[128px] sm:h-[128px] lg:w-[108px] lg:h-[108px] xl:w-[116px] xl:h-[116px] shrink-0 self-center rounded-xl overflow-hidden bg-brand-50">
          {imagem('absolute inset-0 w-full h-full object-cover')}
          <span className="absolute bottom-1.5 right-1.5">{botaoMais}</span>
        </div>
      )}
    </article>
  );
};

export default MenuItemCard;

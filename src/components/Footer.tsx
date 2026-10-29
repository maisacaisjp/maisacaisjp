
import React from 'react';
import { Instagram, ShieldCheck } from "lucide-react";


export default function Footer() {
  return (
    <footer className="bg-[#1c0524] text-gray-300 py-12 px-4 mt-8 lg:mt-12 border-t-[6px] border-[#6a2092]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div className="font-extrabold text-white text-2xl flex items-center gap-2 justify-center md:justify-start">
            <div className="w-8 h-8 bg-black rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <img
                src="/logo.png"
                alt="Mais Açaí"
                className="w-full h-full object-cover absolute inset-0 z-20"
              />
            </div>
            Mais Açaí
          </div>
          <p className="text-sm text-gray-400 mt-2">
            © 2026 Mais Açaí · Desde 2016 · São José dos Pinhais - PR
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-purple-400 mt-2 justify-center md:justify-start">
            <ShieldCheck className="w-4 h-4" />
            <span>Site Seguro</span>
          </div>
          <a
            href="https://www.instagram.com/maisacaisjp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 mt-2 hover:text-white transition-colors"
          >
            <Instagram className="w-5 h-5" />
            @maisacaisjp
          </a>
        </div>
        <div className="text-center">
          <p className="text-xl md:text-2xl font-black text-purple-300 uppercase tracking-wider">
            O MELHOR AÇAÍ DE SJP! 💜
          </p>
        </div>
        <div className="text-center md:text-right space-y-1.5">
          <p className="font-bold text-white text-lg flex items-center gap-2 justify-center md:justify-end">
            WhatsApp: (41) 99734-9076
          </p>
          <p className="text-sm font-medium text-purple-200">Entrega rápida para toda São José dos Pinhais</p>
          <p className="text-sm font-medium text-gray-300">
            Rua Almirante Alexandrino, 909 sala 02 - Parque da Fonte
          </p>
          <p className="text-xs text-gray-400 pt-1">
            São José dos Pinhais - PR | Consumo no local, retirada e delivery
          </p>
        </div>
      </div>
    </footer>
  );
}

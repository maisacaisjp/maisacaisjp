import { Globe, Instagram, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { RESTAURANT_WHATSAPP_PHONE } from "../data/menu";

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-white/70 mt-6 lg:mt-10">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10 lg:py-12 grid gap-8 md:grid-cols-3 md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20" />
            <div>
              <p className="font-display text-white text-[18px] font-extrabold leading-tight">Mais Açaí</p>
              <p className="text-[13px] text-white/50">Desde 2016 · São José dos Pinhais</p>
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed max-w-xs">
            Açaí de verdade, montado do seu jeito. Consumo no local, retirada e delivery.
          </p>
        </div>

        <ul className="space-y-3 text-[14px]">
          <li>
            <a href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white transition-colors">
              <MessageCircle className="w-4 h-4 text-brand-300" /> (41) 99734-9076
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/maisacaisjp/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white transition-colors">
              <Instagram className="w-4 h-4 text-brand-300" /> @maisacaisjp
            </a>
          </li>
          <li>
            <a href="https://maisacaisjpbr.netlify.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white transition-colors">
              <Globe className="w-4 h-4 text-brand-300" /> maisacaisjpbr.netlify.app
            </a>
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-brand-300 mt-0.5 shrink-0" />
            <span>Rua Almirante Alexandrino, 909, sala 02 – Parque da Fonte, São José dos Pinhais – PR</span>
          </li>
        </ul>

        <div className="md:text-right">
          <p className="font-display text-[20px] font-extrabold text-white leading-snug">O melhor açaí de SJP 💜</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-white/50">
            <ShieldCheck className="w-4 h-4" /> Site seguro
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-6xl mx-auto px-4 lg:px-6 py-4 text-[12px] text-white/40">© 2026 Mais Açaí. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

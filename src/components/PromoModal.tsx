import React, { useState, useEffect } from 'react';
import { X } from "lucide-react";
import { RESTAURANT_WHATSAPP_PHONE } from "../data/menu";
import { supabase } from '../lib/supabase';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromoModal({ isOpen, onClose }: PromoModalProps) {
  const [config, setConfig] = useState({
    active: false,
    image_url: '/capa.png',
    title: '🎉 Bem-vindo(a) ao Mais Açaí!',
    message: 'Obrigado pela visita! 💜\\nMonte seu açaí do seu jeito ou escolha um dos nossos combos.\\nSe precisar de ajuda, é só chamar a gente no WhatsApp!',
    button_text: 'Falar no WhatsApp'
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase.from('menu_items').select('*').eq('id', 'system_config_promo').single();
        if (data && data.ingredients) {
          const parsed = JSON.parse(data.ingredients);
          setConfig(parsed);
        }
      } catch (e) {
        // Fallback to default if error
      }
      setLoaded(true);
    }
    loadSettings();
  }, []);

  // Use useEffect to handle auto-close if inactive
  useEffect(() => {
    if (loaded && isOpen && !config.active) {
      onClose(); // Automatically close if promo is disabled
    }
  }, [loaded, isOpen, config.active, onClose]);

  // Dismiss on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !loaded || !config.active) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white text-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-700 hover:bg-white z-10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {config.image_url && (
          <img
            src={config.image_url.startsWith('http') ? config.image_url : (config.image_url.startsWith('/') ? config.image_url : '/' + config.image_url)}
            alt="Promoções"
            className="w-full h-[30vh] sm:h-[300px] object-cover object-center"
          />
        )}
        <div className="p-6 text-center shrink-0">
          <h3 className="font-extrabold text-2xl mb-4 text-[#4d0471]">
            {config.title}
          </h3>
          <div className="text-gray-600 mb-6 leading-relaxed space-y-3 whitespace-pre-line">
            {config.message}
          </div>
          {config.button_text && (
            <a
              href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="block w-full bg-[#4d0471] hover:bg-[#380252] text-white font-bold py-3.5 px-4 rounded-xl transition-colors"
            >
              {config.button_text}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bot, Power, Loader2, MessageSquare, 
  Send, User, Search, PauseCircle, PlayCircle, X,
  Image as ImageIcon, FileText, Music, ZoomIn, Download, ExternalLink, ShieldCheck, CheckCheck,
  Users, Clock, TrendingUp, Sparkles, ChevronDown, ChevronUp, RefreshCw, Trash2,
  CreditCard, Coins, CheckCircle2, ArrowUpRight, Copy, Check, ArrowLeft,
  Crown, BarChart3, Zap, Layers, HelpCircle
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  caption?: string | null;
  timestamp: string;
}

export interface ChatConversation {
  phone: string;
  name: string;
  paused: boolean;
  paused_at?: string | null;
  last_message?: string;
  last_sender?: 'client' | 'bot' | 'human';
  updated_at: string;
  messages: ChatMessage[];
}

export interface ParsedMessage {
  mediaType: 'image' | 'audio' | 'document' | 'sticker' | 'text';
  mediaUrl: string | null;
  caption: string | null;
  displayText: string;
  isReceipt: boolean;
}

export function parseMessageContent(
  text: string, 
  mediaUrlProp?: string | null, 
  mediaTypeProp?: string | null, 
  captionProp?: string | null
): ParsedMessage {
  const isReceiptPattern = /(?:comprovante|pix|transfer[eê]ncia|paguei|pago|recibo)/i;

  if (mediaUrlProp) {
    const isImage = mediaTypeProp === 'image' || (!mediaTypeProp && (mediaUrlProp.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)/i.test(mediaUrlProp)));
    const isSticker = mediaTypeProp === 'sticker' || (!mediaTypeProp && mediaUrlProp.startsWith('data:image/webp'));
    const isAudio = mediaTypeProp === 'audio' || (!mediaTypeProp && (mediaUrlProp.startsWith('data:audio') || /\.(mp3|ogg|wav|opus|m4a)/i.test(mediaUrlProp)));
    const isDoc = mediaTypeProp === 'document' || (!mediaTypeProp && /\.(pdf|docx?|xlsx?)/i.test(mediaUrlProp));
    const cap = captionProp || (text && !text.startsWith('[') ? text : null);
    const mType = isSticker ? 'sticker' : (isImage ? 'image' : (isAudio ? 'audio' : (isDoc ? 'document' : 'text')));

    return {
      mediaType: mType,
      mediaUrl: mediaUrlProp,
      caption: cap,
      displayText: cap || (isSticker ? 'Figurinha' : (isImage ? 'Foto / Comprovante' : (isAudio ? 'Mensagem de voz' : (isDoc ? 'Documento' : text)))),
      isReceipt: Boolean(cap && isReceiptPattern.test(cap))
    };
  }

  if (!text) return { mediaType: 'text', mediaUrl: null, caption: null, displayText: '', isReceipt: false };

  // 1. Detecta marcação [FOTO: URL] ou [IMAGEM: URL]
  const fotoMatch = text.match(/^\[(?:FOTO|IMAGEM):\s*([^\]]+)\]\s*(.*)$/is);
  if (fotoMatch) {
    const url = fotoMatch[1].trim();
    const cap = fotoMatch[2].trim() || null;
    return {
      mediaType: 'image',
      mediaUrl: url.length > 5 ? url : null,
      caption: cap,
      displayText: cap || 'Foto / Comprovante',
      isReceipt: Boolean(cap && isReceiptPattern.test(cap)) || (url.length > 5 && isReceiptPattern.test(text))
    };
  }

  // 2. Detecta marcação [AUDIO: URL]
  const audioMatch = text.match(/^\[AUDIO:\s*([^\]]+)\]\s*(.*)$/is);
  if (audioMatch) {
    const url = audioMatch[1].trim();
    return {
      mediaType: 'audio',
      mediaUrl: url.length > 5 ? url : null,
      caption: null,
      displayText: 'Mensagem de voz',
      isReceipt: false
    };
  }

  // 3. Detecta marcação [DOC: URL]
  const docMatch = text.match(/^\[DOC:\s*([^\]]+)\]\s*(.*)$/is);
  if (docMatch) {
    const url = docMatch[1].trim();
    const title = docMatch[2].trim() || 'Documento';
    return {
      mediaType: 'document',
      mediaUrl: url.length > 5 ? url : null,
      caption: title,
      displayText: title,
      isReceipt: isReceiptPattern.test(title)
    };
  }

  // 4. Detecta marcação [FIGURINHA: URL]
  const stickerMatch = text.match(/^\[FIGURINHA:\s*([^\]]+)\]/is);
  if (stickerMatch) {
    const url = stickerMatch[1].trim();
    return {
      mediaType: 'sticker',
      mediaUrl: url.length > 5 ? url : null,
      caption: null,
      displayText: 'Figurinha',
      isReceipt: false
    };
  }

  // 5. Fallbacks para figurinhas descritivas
  if (text.includes('[Figurinha') || text.includes('🏷️') || text.includes('[sticker')) {
    return {
      mediaType: 'sticker',
      mediaUrl: null,
      caption: null,
      displayText: 'Figurinha WhatsApp',
      isReceipt: false
    };
  }

  // 6. Fallbacks para áudios descritivos
  if (text.includes('[Mensagem de voz') || text.includes('[Áudio') || text.includes('[Audio') || text.includes('🎵')) {
    return {
      mediaType: 'audio',
      mediaUrl: null,
      caption: null,
      displayText: 'Mensagem de voz',
      isReceipt: false
    };
  }

  // 7. Fallback para fotos/comprovantes descritivos sem link
  if (text.includes('[Foto/Comprovante') || text.includes('[📷 Foto') || text.includes('[Arquivo/Midia]')) {
    return {
      mediaType: 'image',
      mediaUrl: null,
      caption: text.replace(/^\[(?:Foto\/Comprovante[^\]]*|📷 Foto[^\]]*|Arquivo\/Midia)\]\s*:?\s*/i, '').trim() || null,
      displayText: text,
      isReceipt: isReceiptPattern.test(text)
    };
  }

  return {
    mediaType: 'text',
    mediaUrl: null,
    caption: null,
    displayText: text,
    isReceipt: false
  };
}

// Atalhos de Respostas Rápidas para o Operador
const QUICK_RESPONSES = [
  { label: '🍧 Em Preparo', text: 'Seu açaí já está sendo preparado com muito carinho e logo sai para entrega! 🍇' },
  { label: '🛵 Saiu p/ Entrega', text: 'Seu pedido acabou de sair com o entregador! Fique de olho no portão 🛵✨' },
  { label: '🪙 Precisa de Troco?', text: 'Com certeza! Você tem o valor exato ou precisa de troco para quanto (ex: R$ 50, R$ 100)?' },
  { label: '✅ PIX Confirmado', text: 'Confirmamos o recebimento do seu PIX com sucesso! Muito obrigado pela preferência 💜' },
  { label: '💳 Chave PIX', text: 'Nossa chave PIX oficial é o celular: 41997349076 (Michele Alvarez - Mais Açaí).' }
];

export default function AgentManager() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'ai' | 'manual' | 'directors'>('all');
  const [viewMode, setViewMode] = useState<'cockpit' | 'gestor_info'>('cockpit');

  const handleCopyPhone = useCallback((phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }, []);

  // Estado das Conversas
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const selectedPhoneRef = useRef<string | null>(null);

  // Mensagens da conversa atualmente aberta
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [togglingChatPause, setTogglingChatPause] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string; sender?: string; timestamp?: string } | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // Métricas do Dia (Cockpit de Atendimento)
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metrics, setMetrics] = useState({
    totalConversationsToday: 0,
    aiHandledConversations: 0,
    humanHandledConversations: 0,
    totalClientMessages: 0,
    totalBotMessages: 0,
    totalHumanMessages: 0,
    avgResponseTimeSec: 0
  });

  const fetchDailyMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const { data: allMsgs } = await supabase
        .from('chat_messages')
        .select('phone, sender, created_at')
        .gte('created_at', todayIso);

      const msgs = allMsgs || [];

      let clientMsgs = 0;
      let botMsgs = 0;
      let humanMsgs = 0;
      const activePhones = new Set<string>();
      const aiPhones = new Set<string>();
      const humanPhones = new Set<string>();
      const responseTimes: number[] = [];
      const phoneGroups: Record<string, any[]> = {};

      for (const m of msgs) {
        if (m.phone) activePhones.add(m.phone);
        if (m.sender === 'client') {
          clientMsgs++;
        } else if (m.sender === 'bot') {
          botMsgs++;
          if (m.phone) aiPhones.add(m.phone);
        } else if (m.sender === 'human') {
          humanMsgs++;
          if (m.phone) humanPhones.add(m.phone);
        }

        if (m.phone) {
          if (!phoneGroups[m.phone]) phoneGroups[m.phone] = [];
          phoneGroups[m.phone].push(m);
        }
      }

      for (const list of Object.values(phoneGroups)) {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let lastClientTime = 0;
        for (const m of list) {
          if (m.sender === 'client') {
            lastClientTime = new Date(m.created_at).getTime();
          } else if (lastClientTime > 0) {
            const diffSec = (new Date(m.created_at).getTime() - lastClientTime) / 1000;
            if (diffSec >= 0 && diffSec < 400) {
              responseTimes.push(diffSec);
            }
            lastClientTime = 0;
          }
        }
      }

      const avgSec = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : (botMsgs > 0 ? 3 : 0);

      setMetrics({
        totalConversationsToday: activePhones.size || conversations.length,
        aiHandledConversations: aiPhones.size,
        humanHandledConversations: humanPhones.size || conversations.filter(c => c.paused).length,
        totalClientMessages: clientMsgs,
        totalBotMessages: botMsgs,
        totalHumanMessages: humanMsgs,
        avgResponseTimeSec: avgSec
      });
    } catch (err) {
      console.warn('Erro ao carregar métricas:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fecha o modal de imagem ao pressionar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    fetchBotStatus();
    loadConversations();
    fetchDailyMetrics();
    
    // Realtime listener
    const subscription = supabase
      .channel('chat_agent_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        const item = (payload.new || payload.old) as any;
        if (!item || !item.key) return;

        if (item.key === 'bot_active') {
          setIsActive(Boolean(item.value));
          if (item.updated_at) {
            setLastUpdated(new Date(item.updated_at).toLocaleTimeString('pt-BR'));
          }
        }

        if (typeof item.key === 'string' && item.key.startsWith('chat_conversation_')) {
          if (payload.eventType === 'DELETE') {
            const rawPhone = item.key.replace('chat_conversation_', '');
            setConversations(prev => prev.filter(c => c.phone !== rawPhone));
          } else if (item.value) {
            const conv = item.value as ChatConversation;
            setConversations(prev => {
              const exists = prev.some(c => c.phone === conv.phone);
              if (exists) {
                return prev.map(c => c.phone === conv.phone ? { ...c, ...conv } : c)
                  .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
              }
              return [conv, ...prev];
            });

            if (selectedPhoneRef.current === conv.phone && Array.isArray(conv.messages)) {
              setActiveMessages(conv.messages.slice(-100));
            }
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedPhone = (payload.old as any)?.phone;
          if (deletedPhone) {
            setConversations(prev => prev.filter(c => c.phone !== deletedPhone));
            if (selectedPhoneRef.current === deletedPhone) {
              setSelectedPhone(null);
              setActiveMessages([]);
            }
          }
        } else if (payload.new) {
          const newConv = payload.new as any;
          setConversations(prev => {
            const exists = prev.some(c => c.phone === newConv.phone);
            if (exists) {
              return prev.map(c => c.phone === newConv.phone ? {
                ...c,
                name: newConv.name || c.name,
                paused: Boolean(newConv.paused),
                paused_at: newConv.paused_at,
                last_message: newConv.last_message || c.last_message,
                last_sender: newConv.last_sender || c.last_sender,
                updated_at: newConv.updated_at || new Date().toISOString()
              } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
            }
            return [{
              phone: newConv.phone,
              name: newConv.name || 'Cliente',
              paused: Boolean(newConv.paused),
              paused_at: newConv.paused_at,
              last_message: newConv.last_message,
              last_sender: newConv.last_sender,
              updated_at: newConv.updated_at || new Date().toISOString(),
              messages: []
            }, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (!newMsg) return;

        if (selectedPhoneRef.current === newMsg.phone) {
          setActiveMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              sender: newMsg.sender as 'client' | 'bot' | 'human',
              text: newMsg.text,
              media_url: newMsg.media_url || null,
              media_type: newMsg.media_type || null,
              caption: newMsg.caption || null,
              timestamp: newMsg.created_at || new Date().toISOString()
            }].slice(-100);
          });
        }

        setConversations(prev => {
          return prev.map(c => c.phone === newMsg.phone ? {
            ...c,
            last_message: newMsg.text,
            last_sender: newMsg.sender,
            updated_at: newMsg.created_at || new Date().toISOString()
          } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      loadMessagesForPhone(selectedPhone);
    } else {
      setActiveMessages([]);
    }
  }, [selectedPhone]);

  const prevPhoneRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedPhone && messagesEndRef.current) {
      const isSwitchingPhone = prevPhoneRef.current !== selectedPhone;
      prevPhoneRef.current = selectedPhone;
      messagesEndRef.current.scrollIntoView({ 
        behavior: isSwitchingPhone ? 'auto' : 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedPhone, activeMessages]);

  const fetchBotStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value, updated_at')
        .eq('key', 'bot_active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setIsActive(Boolean(data.value));
        if (data.updated_at) {
          setLastUpdated(new Date(data.updated_at).toLocaleTimeString('pt-BR'));
        }
      } else {
        setIsActive(true);
      }
    } catch (err) {
      console.error('Erro ao buscar status do bot:', err);
      setIsActive(true);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      let loadedFromRelational = false;
      try {
        const { data: convRows, error: convError } = await supabase
          .from('chat_conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!convError && Array.isArray(convRows) && convRows.length > 0) {
          loadedFromRelational = true;
          const convList: ChatConversation[] = convRows.map(r => ({
            phone: r.phone,
            name: r.name || 'Cliente',
            paused: Boolean(r.paused),
            paused_at: r.paused_at,
            last_message: r.last_message || '',
            last_sender: r.last_sender || 'client',
            updated_at: r.updated_at || new Date().toISOString(),
            messages: []
          }));
          setConversations(convList);
        }
      } catch (relErr) {
        console.warn('Aviso tabela relacional conversas:', relErr);
      }

      if (!loadedFromRelational) {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value, updated_at')
          .like('key', 'chat_conversation_%');

        if (error) throw error;
        if (data) {
          const list: ChatConversation[] = [];
          for (const item of data) {
            try {
              if (item.value && typeof item.value === 'object') {
                const c = item.value as ChatConversation;
                if (c.phone) list.push(c);
              }
            } catch (e) {
              console.warn('Conversa corrompida:', item.key);
            }
          }
          list.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
          setConversations(list);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessagesForPhone = async (phone: string) => {
    setLoadingMessages(true);
    try {
      let loaded = false;
      try {
        const { data: msgRows, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('phone', phone)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!msgError && Array.isArray(msgRows) && msgRows.length > 0) {
          loaded = true;
          const parsedMsgs: ChatMessage[] = msgRows.map(r => ({
            id: r.id,
            sender: r.sender as 'client' | 'bot' | 'human',
            text: r.text,
            media_url: r.media_url || null,
            media_type: r.media_type || null,
            caption: r.caption || null,
            timestamp: r.created_at || new Date().toISOString()
          }));
          setActiveMessages(parsedMsgs);
        }
      } catch (relErr) {
        console.warn('Aviso relacional chat_messages:', relErr);
      }

      if (!loaded) {
        const conv = conversations.find(c => c.phone === phone);
        if (conv && Array.isArray(conv.messages)) {
          setActiveMessages(conv.messages.slice(-100));
        } else {
          setActiveMessages([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setActiveMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const toggleBot = async () => {
    const nextState = !isActive;
    setUpdating(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'bot_active',
          value: nextState,
          updated_at: nowIso
        }, { onConflict: 'key' });

      if (error) throw error;
      setIsActive(nextState);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao alternar status do bot:', err);
      alert('Falha ao atualizar o status do Agente no banco.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleChatPause = async (phone: string, currentPaused: boolean) => {
    const nextPaused = !currentPaused;
    setTogglingChatPause(true);
    const nowIso = new Date().toISOString();
    try {
      try {
        await supabase
          .from('chat_conversations')
          .update({
            paused: nextPaused,
            paused_at: nextPaused ? nowIso : null,
            updated_at: nowIso
          })
          .eq('phone', phone);
      } catch (relErr) {
        console.warn('Aviso update relacional pausa:', relErr);
      }

      const convKey = `chat_conversation_${phone}`;
      const conv = conversations.find(c => c.phone === phone);
      if (conv) {
        const updatedConv: ChatConversation = {
          ...conv,
          paused: nextPaused,
          paused_at: nextPaused ? nowIso : null,
          updated_at: nowIso
        };

        await supabase
          .from('settings')
          .upsert({
            key: convKey,
            value: updatedConv,
            updated_at: nowIso
          }, { onConflict: 'key' });

        setConversations(prev => prev.map(c => c.phone === phone ? updatedConv : c));
      }
    } catch (err) {
      console.error('Erro ao alternar pausa do chat:', err);
      alert('Não foi possível alterar o status de atendimento deste chat.');
    } finally {
      setTogglingChatPause(false);
    }
  };

  const sendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !manualMessage.trim() || sendingManual) return;

    const messageText = manualMessage.trim();
    setSendingManual(true);
    setManualMessage('');
    const nowIso = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: 'human',
      text: messageText,
      timestamp: nowIso
    };

    setActiveMessages(prev => [...prev, optimisticMsg].slice(-100));

    try {
      try {
        await supabase
          .from('chat_messages')
          .insert({
            phone: selectedPhone,
            sender: 'human',
            text: messageText
          });

        await supabase
          .from('chat_conversations')
          .upsert({
            phone: selectedPhone,
            last_message: messageText,
            last_sender: 'human',
            paused: true,
            paused_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'phone' });
      } catch (relErr) {
        console.warn('Aviso gravação relacional manual:', relErr);
      }

      const conv = conversations.find(c => c.phone === selectedPhone);
      const convKey = `chat_conversation_${selectedPhone}`;
      const updatedMessages = [...(conv?.messages || []), optimisticMsg].slice(-100);

      const updatedConv: ChatConversation = {
        phone: selectedPhone,
        name: conv?.name || 'Cliente',
        paused: true,
        paused_at: conv?.paused ? conv.paused_at : nowIso,
        last_message: messageText,
        last_sender: 'human',
        updated_at: nowIso,
        messages: updatedMessages
      };

      await supabase
        .from('settings')
        .upsert({
          key: convKey,
          value: updatedConv,
          updated_at: nowIso
        }, { onConflict: 'key' });

      setConversations(prev => prev.map(c => c.phone === selectedPhone ? updatedConv : c)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()));

      fetch('/.netlify/functions/whatsapp-send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          message: messageText
        })
      }).catch(err => console.warn('Aviso envio WhatsApp:', err));

    } catch (err) {
      console.error('Erro ao enviar mensagem manual:', err);
      alert('Falha ao registrar mensagem manual.');
    } finally {
      setSendingManual(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta conversa do histórico?')) return;

    try {
      try {
        await supabase.from('chat_conversations').delete().eq('phone', phone);
        await supabase.from('chat_messages').delete().eq('phone', phone);
      } catch (relErr) {
        console.warn('Aviso delete relacional:', relErr);
      }

      await supabase.from('settings').delete().eq('key', `chat_conversation_${phone}`);

      setConversations(prev => prev.filter(c => c.phone !== phone));
      if (selectedPhone === phone) {
        setSelectedPhone(null);
        setActiveMessages([]);
      }
      fetchDailyMetrics();
    } catch (err) {
      console.error('Erro ao excluir conversa:', err);
      alert('Erro ao excluir conversa.');
    }
  };

  const deleteAllConversations = async () => {
    if (!window.confirm('ATENÇÃO: Deseja apagar TODO o histórico de conversas do espelho?')) return;

    setDeletingAll(true);
    try {
      try {
        await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('chat_conversations').delete().neq('phone', '');
      } catch (relErr) {
        console.warn('Aviso delete all relacional:', relErr);
      }

      try {
        await supabase.from('settings').delete().like('key', 'chat_conversation_%');
      } catch (setErr) {
        console.warn('Aviso delete all settings:', setErr);
      }

      setConversations([]);
      setSelectedPhone(null);
      setActiveMessages([]);
      fetchDailyMetrics();
    } catch (err) {
      console.error('Erro ao excluir todas as conversas:', err);
      alert('Erro ao excluir todas as conversas.');
    } finally {
      setDeletingAll(false);
    }
  };

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.phone === selectedPhone);
  }, [conversations, selectedPhone]);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return conversations.filter(c => {
      const matchesSearch = !term || (c.name || '').toLowerCase().includes(term) || (c.phone || '').includes(term);
      if (!matchesSearch) return false;
      if (conversationFilter === 'manual') return c.paused;
      if (conversationFilter === 'ai') return !c.paused;
      if (conversationFilter === 'directors') {
        return ['996560080', '96560080', '997349076', '97349076'].some(d => c.phone.endsWith(d));
      }
      return true;
    });
  }, [conversations, searchTerm, conversationFilter]);

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#4d0471]/10 text-[#4d0471] flex items-center justify-center border border-[#4d0471]/20 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#4d0471]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-stone-800">Conectando com Maya Intelligence</p>
          <p className="text-xs text-stone-400 mt-0.5">Sincronizando estado do WhatsApp & n8n...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER COMPACTO, CLEAN & MINIMALISTA (MAIS AÇAÍ SJP)
      ========================================================================= */}
      <header className="relative overflow-hidden bg-white rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5 transition-all">
        {/* Hairline de assinatura das cores oficiais Mais Açaí */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4d0471] via-[#7d129a] to-[#fdde58]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Identidade da Maya & Status */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              isActive 
                ? 'bg-gradient-to-br from-[#4d0471] to-[#6a2092] text-white ring-4 ring-[#4d0471]/10 shadow-xs' 
                : 'bg-stone-100 text-stone-500 ring-4 ring-stone-200/50'
            }`}>
              <Bot size={22} className={updating ? "animate-spin" : ""} />
              {/* Badge pulsante de status */}
              <span 
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white flex items-center justify-center ${
                  isActive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isActive ? "Maya Ativa no WhatsApp" : "Maya Pausada (Atendimento Manual)"}
              >
                {isActive && (
                  <span className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                )}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-black text-stone-900 tracking-tight font-sans">
                  Maya AI
                </h1>

                {/* Status Pill */}
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isActive ? 'Atendimento no Ar' : 'Modo Manual Ativo'}
                </span>

                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60 hidden sm:inline">
                  Dual Core • Clientes + Sócios
                </span>
              </div>

              <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-2 truncate">
                <span>Atendente Oficial</span>
                <span className="text-stone-300">•</span>
                <span>{conversations.length} conversas sincronizadas</span>
                {lastUpdated && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-[11px] text-stone-400">Sync às {lastUpdated}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Controles de Navegação & Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            {/* Seletor Segmentado de Visualização */}
            <div className="flex items-center p-1 bg-stone-100/80 rounded-xl border border-stone-200/70">
              <button
                type="button"
                onClick={() => setViewMode('cockpit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'cockpit'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <MessageSquare size={13} className={viewMode === 'cockpit' ? 'text-[#4d0471]' : ''} />
                <span>Conversas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('gestor_info')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'gestor_info'
                    ? 'bg-white text-[#4d0471] shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Crown size={13} className="text-amber-500" />
                <span>Maya Gestora</span>
              </button>
            </div>

            {/* Botão de Diretrizes / Regras da Maya */}
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Ver regras de sabores, casadinho e diretrizes oficiais"
            >
              <Sparkles size={13} className="text-[#4d0471]" />
              <span className="hidden sm:inline">Diretrizes</span>
            </button>

            {/* Botão Power (Ativar / Pausar Atendimento Global) */}
            <button
              type="button"
              onClick={toggleBot}
              disabled={updating}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-60 ${
                isActive 
                  ? 'bg-stone-50 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <Power size={13} className={updating ? "animate-spin" : (isActive ? "text-rose-500" : "text-white")} />
              <span>{updating ? 'Atualizando...' : (isActive ? 'Pausar Atendente' : 'Ativar Atendente')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. STRIP DE TELEMETRIA ULTRA-COMPACTA & ELEGANTE (4 KPI CARDS EM 1 LINHA)
      ========================================================================= */}
      {viewMode === 'cockpit' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Clientes Hoje</p>
              <p className="text-xl font-black text-stone-900 font-sans mt-0.5">
                {metrics.totalConversationsToday}
              </p>
              <p className="text-[10px] text-stone-400 font-medium">atendimentos únicos</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Mensagens Trocadas</p>
              <p className="text-xl font-black text-stone-900 font-sans mt-0.5">
                {metrics.totalClientMessages + metrics.totalBotMessages + metrics.totalHumanMessages}
              </p>
              <p className="text-[10px] text-purple-700 font-medium">{metrics.totalBotMessages} pela Maya</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#4d0471] flex items-center justify-center font-bold">
              <MessageSquare size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Intervenções</p>
              <p className="text-xl font-black text-stone-900 font-sans mt-0.5">
                {metrics.humanHandledConversations}
                <span className="text-xs text-stone-400 font-normal ml-1">manuais</span>
              </p>
              <p className="text-[10px] text-amber-700 font-medium">{metrics.aiHandledConversations} com IA ativa</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <User size={16} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200/80 p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">Velocidade da IA</p>
              <p className="text-xl font-black text-emerald-600 font-sans mt-0.5">
                {metrics.avgResponseTimeSec > 0 ? `${metrics.avgResponseTimeSec}s` : '< 3s'}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium">resposta em tempo real</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Zap size={16} />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. SEÇÃO ESPECIAL: MAYA GESTORA (EXECUTIVE BRIEFING DECK)
      ========================================================================= */}
      {viewMode === 'gestor_info' && (
        <section className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4d0471] to-[#3b0257] text-amber-400 flex items-center justify-center font-black shadow-xs shrink-0">
                <Crown size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-stone-900 font-sans flex items-center gap-2">
                  Maya Gestora • Modo Diretoria Executiva
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300/60">
                    Exclusivo Sócios
                  </span>
                </h2>
                <p className="text-xs text-stone-500">
                  Relatórios em tempo real de vendas, CMV, fichas técnicas e custos direto no WhatsApp dos proprietários
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-[#4d0471] border border-purple-200/70">
                <ShieldCheck size={14} className="text-[#4d0471]" />
                Junior & Michele Reconhecidos
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-950 uppercase tracking-wider font-mono">
                <BarChart3 size={15} className="text-[#4d0471]" />
                <span>Vendas & Faturamento</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Consulte o faturamento do dia, quantidade de pedidos abertos, cancelados e formas de pagamento (PIX, Cartão, Dinheiro).
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-900 font-mono">
                  "Quanto vendemos hoje?"
                </span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-900 font-mono">
                  "Resumo do dia"
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider font-mono">
                <Layers size={15} className="text-amber-700" />
                <span>Ficha Técnica & CMV</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Custo de produção por copo, margem de contribuição bruta, insumos cadastrados e produtos mais lucrativos.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-mono">
                  "Ficha do nevado"
                </span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 font-mono">
                  "Ranking margens"
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider font-mono">
                <CheckCircle2 size={15} className="text-emerald-700" />
                <span>Alternar Modos no WhatsApp</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Os sócios podem alternar instantaneamente entre conversar com a assistente ou testar como cliente comum.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-mono">
                  "modo cliente"
                </span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900 font-mono">
                  "modo assistente"
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          4. ESPELHO WHATSAPP COMMAND CENTER (DUAL PANE RESPONSIVO & MINIMALISTA)
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px] lg:h-[calc(100dvh-270px)] min-h-[460px]">
        {/* =======================================================================
            COLUNA ESQUERDA: LISTA DE CONVERSAS (AIRY & CLEAN)
        ======================================================================= */}
        <aside className={`w-full md:w-80 lg:w-88 shrink-0 border-r border-stone-200/80 flex flex-col h-full bg-white ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
          {/* Header da Coluna com Campo de Busca */}
          <div className="p-3.5 border-b border-stone-100 space-y-2.5 shrink-0 bg-white">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200/80 focus:border-[#4d0471] focus:ring-2 focus:ring-[#4d0471]/10 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400 font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-full hover:bg-stone-200 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={() => setConversationFilter('all')}
                className={`flex-1 py-1 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  conversationFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Todas ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setConversationFilter('ai')}
                className={`flex-1 py-1 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  conversationFilter === 'ai'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                IA ({conversations.filter(c => !c.paused).length})
              </button>
              <button
                type="button"
                onClick={() => setConversationFilter('manual')}
                className={`flex-1 py-1 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  conversationFilter === 'manual'
                    ? 'bg-white text-amber-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Manual ({conversations.filter(c => c.paused).length})
              </button>
              <button
                type="button"
                onClick={() => setConversationFilter('directors')}
                className={`flex-1 py-1 px-1 rounded-md text-[11px] font-bold transition-all cursor-pointer text-center ${
                  conversationFilter === 'directors'
                    ? 'bg-white text-[#4d0471] shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sócios
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'conversa' : 'conversas'}
              </span>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={deleteAllConversations}
                  disabled={deletingAll}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Limpar histórico do espelho"
                >
                  <Trash2 size={10} className={deletingAll ? "animate-spin" : ""} />
                  <span>{deletingAll ? 'Limpando...' : 'Limpar Tudo'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de Contatos */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs font-mono text-stone-400 flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-[#4d0471]" />
                Sincronizando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 space-y-1">
                <MessageSquare size={24} className="mx-auto text-stone-300 mb-1" />
                <p className="font-semibold text-stone-600">Nenhuma conversa encontrada</p>
                <p className="text-[11px] text-stone-400">As novas mensagens no WhatsApp aparecem aqui em tempo real.</p>
              </div>
            ) : (
              filteredConversations.map(c => {
                const isSelected = selectedPhone === c.phone;
                const isPizzeriaName = c.name && c.name.toLowerCase().includes("mais açaí");
                const displayName = (!c.name || isPizzeriaName) ? (c.phone || 'Cliente') : c.name;
                const isManagerNumber = ['996560080', '96560080', '997349076', '97349076'].some(d => c.phone.endsWith(d));

                return (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer relative ${
                      isSelected 
                        ? 'bg-purple-50/70 border-l-[3px] border-[#4d0471]' 
                        : 'hover:bg-stone-50 bg-white'
                    }`}
                  >
                    {/* Avatar com inicial e anel de status */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-2xs ${
                        isManagerNumber
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-stone-900 ring-2 ring-amber-300'
                          : (isSelected 
                              ? 'bg-[#4d0471] text-white' 
                              : 'bg-stone-100 text-stone-600')
                      }`}>
                        {displayName.charAt(0)}
                      </div>
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                          c.paused ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        title={c.paused ? "Atendimento Humano (Maya pausada)" : "Maya no Controle"}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-xs truncate font-sans ${isSelected ? 'font-black text-[#4d0471]' : 'font-bold text-stone-900'}`}>
                            {displayName}
                          </span>
                          {isManagerNumber && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
                              <Crown size={9} className="inline text-amber-700" /> Sócio
                            </span>
                          )}
                        </div>
                        {c.updated_at && (
                          <span className="text-[10px] font-mono text-stone-400 shrink-0">
                            {formatMessageTime(c.updated_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] text-stone-500 truncate leading-snug">
                          {c.last_sender === 'bot' && (
                            <span className="text-[#4d0471] font-bold mr-1">🍇 Maya:</span>
                          )}
                          {c.last_sender === 'human' && (
                            <span className="text-sky-700 font-bold mr-1">Operador:</span>
                          )}
                          {c.last_message || 'Nenhuma mensagem recente'}
                        </p>
                        {c.paused && (
                          <span className="text-[9px] font-mono font-bold uppercase text-amber-800 bg-amber-100 px-1 py-0.2 rounded shrink-0">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* =======================================================================
            COLUNA DIREITA: PAINEL DO CHAT ABERTO OU EMPTY STATE
        ======================================================================= */}
        {selectedConversation ? (
          <main className={`flex-1 flex-col h-full min-w-0 bg-[#f8f6f9] ${selectedPhone ? 'flex' : 'hidden md:flex'}`}>
            {/* Topbar do Chat Selecionado */}
            {(() => {
              const isHeaderPizzeriaName = selectedConversation.name && selectedConversation.name.toLowerCase().includes("mais açaí");
              const headerDisplayName = (!selectedConversation.name || isHeaderPizzeriaName) ? (selectedConversation.phone || 'Cliente') : selectedConversation.name;
              const isManagerNumber = ['996560080', '96560080', '997349076', '97349076'].some(d => selectedConversation.phone.endsWith(d));

              return (
                <div className="p-3.5 border-b border-stone-200/80 bg-white shrink-0 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPhone(null)}
                      className="md:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-2xs shrink-0 ${
                      isManagerNumber
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-stone-900 ring-2 ring-amber-300'
                        : 'bg-[#4d0471] text-white'
                    }`}>
                      {headerDisplayName.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-stone-900 truncate font-sans">
                          {headerDisplayName}
                        </h2>
                        {isManagerNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full">
                            <Crown size={10} className="text-amber-700" /> Sócio
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedConversation.paused 
                            ? 'bg-amber-50 text-amber-900 border-amber-300' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedConversation.paused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                          {selectedConversation.paused ? 'Atendimento Manual' : 'Maya no Controle'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-400 font-mono mt-0.5">
                        <span>{selectedConversation.phone}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(selectedConversation.phone, e)}
                          className="hover:text-stone-700 cursor-pointer"
                          title="Copiar número"
                        >
                          {copiedPhone ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Controle de Pausa Individual (Intervir Manualmente) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleChatPause(selectedConversation.phone, Boolean(selectedConversation.paused))}
                      disabled={togglingChatPause}
                      className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        selectedConversation.paused
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/20'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                      title={selectedConversation.paused ? "Retomar respostas automáticas da Maya neste chat" : "Pausar Maya neste chat para atendimento humano"}
                    >
                      {selectedConversation.paused ? (
                        <>
                          <PlayCircle size={15} />
                          <span>Retomar Maya</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle size={15} />
                          <span>Intervir no Chat</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Balões de Mensagem (Tipografia Refinada & Limpa) */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 relative bg-[#f8f6f9]">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-400">
                  <Loader2 size={22} className="animate-spin text-[#4d0471]" />
                  <span className="text-xs font-mono">Carregando histórico...</span>
                </div>
              ) : activeMessages && activeMessages.length > 0 ? (
                activeMessages.map((m, idx) => {
                  const isClient = m.sender === 'client';
                  const isBot = m.sender === 'bot';
                  const isHuman = m.sender === 'human';
                  const parsed = parseMessageContent(m.text, m.media_url, m.media_type, m.caption);
                  const isSticker = parsed.mediaType === 'sticker';

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[88%] sm:max-w-[75%] lg:max-w-[65%] ${
                          isSticker
                            ? 'bg-transparent shadow-none p-0'
                            : `rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs transition-all ${
                                isClient
                                  ? 'bg-white text-stone-900 rounded-tl-xs border border-stone-200/80'
                                  : (isHuman 
                                      ? 'bg-sky-50 text-sky-950 rounded-tr-xs border border-sky-200'
                                      : 'bg-[#4d0471] text-white rounded-tr-xs shadow-sm')
                              }`
                        }`}
                      >
                        {/* Header do Balão com identificação */}
                        {!isClient && !isSticker && (
                          <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${
                            isBot ? 'text-amber-300' : 'text-sky-700'
                          }`}>
                            {isBot ? (
                              <>
                                <Bot size={11} className="inline text-amber-300" />
                                <span>Maya • IA Oficial</span>
                              </>
                            ) : (
                              <>
                                <User size={11} className="inline text-sky-700" />
                                <span>Atendente Humano</span>
                              </>
                            )}
                          </div>
                        )}

                        {isClient && !isSticker && selectedConversation.name && (
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1 text-stone-500">
                            {selectedConversation.name}
                          </div>
                        )}

                        {/* Selo especial para comprovantes de pagamento / PIX */}
                        {parsed.isReceipt && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                            <ShieldCheck size={14} className="text-white shrink-0" />
                            <span>Comprovante de Pagamento PIX</span>
                          </div>
                        )}

                        {/* Mídia Incorporada */}
                        {parsed.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-black/10 border border-black/10">
                            {parsed.mediaType === 'image' || parsed.mediaType === 'sticker' ? (
                              <div 
                                className="relative group cursor-pointer"
                                onClick={() => setSelectedImage({
                                  url: parsed.mediaUrl!,
                                  caption: parsed.caption || parsed.displayText || undefined,
                                  sender: isClient ? (selectedConversation.name || 'Cliente') : (isBot ? 'Maya (IA)' : 'Atendente'),
                                  timestamp: m.timestamp
                                })}
                              >
                                <img
                                  src={parsed.mediaUrl}
                                  alt="Foto enviada no WhatsApp"
                                  className={`w-full object-cover rounded-lg max-h-72 ${isSticker ? 'max-w-[140px] max-h-[140px] bg-transparent' : ''}`}
                                  loading="lazy"
                                />
                                {!isSticker && (
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold backdrop-blur-2xs">
                                    <ZoomIn size={16} />
                                    <span>Visualizar em Tela Cheia</span>
                                  </div>
                                )}
                              </div>
                            ) : parsed.mediaType === 'audio' ? (
                              <div className="p-2.5 flex items-center gap-2">
                                <Music size={18} className={isBot ? "text-amber-300" : "text-stone-600"} />
                                <audio controls src={parsed.mediaUrl} className="w-full max-w-xs h-8" />
                              </div>
                            ) : (
                              <div className="p-3 flex items-center justify-between gap-3 bg-white/10 rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText size={18} />
                                  <span className="text-xs truncate font-mono">Documento / Anexo</span>
                                </div>
                                <a 
                                  href={parsed.mediaUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs font-bold underline shrink-0 flex items-center gap-1"
                                >
                                  <Download size={13} />
                                  <span>Baixar</span>
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Texto da Mensagem */}
                        {parsed.displayText && (
                          <div className="whitespace-pre-wrap break-words font-sans">
                            {parsed.displayText}
                          </div>
                        )}

                        {/* Horário e Check de Leitura */}
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
                          isBot ? 'text-purple-200' : (isHuman ? 'text-sky-700' : 'text-stone-400')
                        }`}>
                          <span>{formatMessageTime(m.timestamp)}</span>
                          {!isClient && <CheckCheck size={12} className={isBot ? "text-amber-300" : "text-sky-600"} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-xs gap-1">
                  <MessageSquare size={26} className="text-stone-300 mb-1" />
                  <p className="font-semibold text-stone-600">Nenhuma mensagem nesta conversa ainda</p>
                  <p className="text-[11px] text-stone-400">As mensagens aparecerão aqui assim que o cliente enviar.</p>
                </div>
              )}
            </div>

            {/* Chips de Resposta Rápida (1-Click) */}
            <div className="p-2 border-t border-stone-200/80 bg-white/90 shrink-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider shrink-0 pl-1">
                Atalhos:
              </span>
              <button
                type="button"
                onClick={() => setManualMessage("Olá! Acompanhe nosso cardápio completo pelo link: https://maisacaisjpbr.netlify.app 🍇")}
                className="text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                📋 Cardápio
              </button>
              <button
                type="button"
                onClick={() => setManualMessage("Nossa chave PIX oficial é o celular: 41 997349076 (Michele Alvarez - Mais Açaí) 💳")}
                className="text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                💳 Chave PIX
              </button>
              <button
                type="button"
                onClick={() => setManualMessage("Nosso prazo médio de entrega hoje é de 15 a 40 minutos em São José dos Pinhais 🛵")}
                className="text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                ⏱️ Prazo de Entrega
              </button>
              <button
                type="button"
                onClick={() => setManualMessage("Ficamos na Rua Almirante Alexandrino, 909, sala 02 – Parque da Fonte, São José dos Pinhais - PR 🏪")}
                className="text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                📍 Endereço da Loja
              </button>
            </div>

            {/* Campo de Envio de Mensagem Manual */}
            <form onSubmit={sendManualMessage} className="p-3 border-t border-stone-200 bg-white shrink-0 flex items-center gap-2">
              <input
                type="text"
                placeholder={selectedConversation.paused ? "Digite sua mensagem como atendente humano..." : "Digite uma mensagem (a Maya continuará ativa após o envio)..."}
                value={manualMessage}
                onChange={e => setManualMessage(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:border-[#4d0471] focus:ring-2 focus:ring-[#4d0471]/15 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400 font-sans"
              />
              <button
                type="submit"
                disabled={!manualMessage.trim() || sendingManual}
                className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold bg-[#4d0471] hover:bg-[#3b0257] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {sendingManual ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar</span>
              </button>
            </form>
          </main>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-stone-50/50">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#4d0471] flex items-center justify-center mb-3 shadow-2xs border border-purple-100">
              <MessageSquare size={26} />
            </div>
            <h3 className="font-black text-base text-stone-800 font-sans">
              Central de Atendimento Maya
            </h3>
            <p className="text-xs text-stone-400 max-w-sm mt-1 leading-relaxed">
              Selecione uma conversa na lista ao lado para acompanhar as mensagens em tempo real ou assumir o atendimento manualmente.
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL DE DIRETRIZES OPERACIONAIS DA MAYA
      ========================================================================= */}
      {showRulesModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowRulesModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#4d0471] text-white flex items-center justify-center font-bold">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900 font-sans">
                    Diretrizes & Comportamento da Maya
                  </h3>
                  <p className="text-xs text-stone-400">Regras oficiais de atendimento configuradas no n8n</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/90 space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between font-bold text-purple-950">
                  <div className="flex items-center gap-1.5">
                    <Layers size={15} className="text-[#4d0471]" />
                    <span className="font-sans font-black text-xs uppercase tracking-wider text-[#4d0471]">Dicionário de Sabores & Casadinho</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4d0471] text-white font-semibold">Regra de Ouro</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-700 pt-1">
                  <div className="p-2 rounded-xl bg-white/80 border border-purple-100">
                    <strong className="text-purple-900 block font-semibold">🥥 Tapioca com Coco:</strong>
                    "Caldo de tapioca", "tapioca" ou "tapioca com coco" é reconhecido imediatamente como o sabor de base <em>Tapioca com Coco</em>.
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-purple-100">
                    <strong className="text-purple-900 block font-semibold">🥜 Paçoca (Base vs Adicional):</strong>
                    Distingue <em>Creme de Paçoca</em> (base grátis) do <em>Adicional de Paçoca</em> (topping cobrado). Se dúbio, pergunta se quer na base ou por cima.
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-purple-100">
                    <strong className="text-purple-900 block font-semibold">🍧 Casadinho (2 Sabores):</strong>
                    Significa 2 sabores de creme no mesmo copo sem custo extra. A Maya pergunta diretamente: <em>"Quais os 2 sabores de creme no seu casadinho?"</em>.
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-purple-100">
                    <strong className="text-purple-900 block font-semibold">🥛 Mousse de Ninho:</strong>
                    Não temos creme de Ninho na base. Se pedirem "creme de ninho", entende como <em>Mousse de Leite Ninho</em> e confirma com o cliente.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Zap size={15} className="text-amber-700" />
                  <span>Fechamento Direto & Objetivo</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Mensagens de 1 a 2 linhas sem enrolação. Foco estrito nas perguntas essenciais: tamanho, sabores, adicionais, entrega/retirada e forma de pagamento.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CreditCard size={15} className="text-emerald-700" />
                  <span>Formas de Pagamento</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Aceita PIX oficial (chave celular 41997349076 - Michele Alvarez), Cartão na maquininha levada pelo entregador e Dinheiro.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <CheckCircle2 size={15} className="text-purple-700" />
                  <span>Cardápio em Tempo Real</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  A cada mensagem a Maya lê o cardápio oficial ao vivo. Tamanhos, receitas de combos, cremes (casadinho até 2 cremes sem custo) e adicionais.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-900">
                  <Clock size={15} className="text-sky-700" />
                  <span>Prazos & Taxas de Entrega</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Calcula a taxa oficial de cada bairro de São José dos Pinhais (Parque da Fonte grátis, Afonso Pena R$ 5, etc.) e informa os prazos exatos.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4d0471] hover:bg-[#3b0257] text-white transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL LIGHTBOX DE COMPROVANTE / FOTO EM TELA CHEIA
      ========================================================================= */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 transition-all"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={18} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-bold truncate">
                {selectedImage.caption || 'Comprovante / Foto do WhatsApp'}
              </span>
              <span className="text-xs text-stone-400 font-mono shrink-0">
                ({selectedImage.sender} • {selectedImage.timestamp ? new Date(selectedImage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''})
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedImage.url && !selectedImage.url.startsWith('data:') && (
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
              )}
              {selectedImage.url && (
                <a
                  href={selectedImage.url}
                  download={`comprovante_${Date.now()}.jpg`}
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Baixar imagem"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-red-900/80 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div 
            className="relative max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-stone-950/80 p-1 border border-stone-800 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || "Imagem em tela cheia"}
              className="max-h-[78vh] max-w-full object-contain rounded-xl select-none"
            />
          </div>

          {selectedImage.caption && (
            <div 
              className="mt-3 px-4 py-1.5 bg-stone-900/90 text-stone-200 text-xs rounded-full max-w-xl text-center truncate border border-stone-800"
              onClick={e => e.stopPropagation()}
            >
              {selectedImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

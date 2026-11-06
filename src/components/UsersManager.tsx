import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Check, UserPlus, Trash2, Key, UserCheck, Lock } from 'lucide-react';

export const PERMISSION_DEFINITIONS = [
  { key: 'ver_pedidos', label: 'Ver e Atualizar Pedidos', description: 'Acesso à aba de Pedidos e alteração de status' },
  { key: 'gerenciar_caixa', label: 'Gerenciar Caixa', description: 'Abertura, fecho e sangrias de caixa' },
  { key: 'gerenciar_produtos', label: 'Gerenciar Produtos', description: 'Adicionar, editar e pausar produtos do cardápio' },
  { key: 'gerenciar_categorias', label: 'Gerenciar Categorias', description: 'Criar e reorganizar categorias' },
  { key: 'ver_relatorios', label: 'Ver Relatórios', description: 'Acesso à aba Visão Geral e Relatórios de Vendas' },
  { key: 'ver_clientes', label: 'Ver Clientes', description: 'Acesso à lista de clientes e histórico' },
  { key: 'gerenciar_configuracoes', label: 'Gerenciar Configurações', description: 'Horários de funcionamento, impressão e lojas' },
  { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários & Permissões', description: 'Criar e definir permissões de funcionários' },
];

export default function UsersManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>({});
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setFeedback("Criando usuário...");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${baseUrl}/functions/v1/manage-staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'create',
            username: newUsername,
            password: newPassword,
            role: newRole,
            full_name: newFullName,
            permissions: newPermissions,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : (result.error?.message || result.message || JSON.stringify(result.error || result));
        setFeedback("Erro: " + errorMsg);
      } else {
        setFeedback("Usuário criado com sucesso!");
        setNewUsername("");
        setNewFullName("");
        setNewPassword("");
        setNewRole("staff");
        setNewPermissions({});
        fetchProfiles();
      }
    } catch (err: any) {
      setFeedback("Erro: " + err.message);
    } finally {
      setCreatingUser(false);
      setTimeout(() => setFeedback(""), 4000);
    }
  };

  const handleDeleteUser = async (profileId: string, name: string) => {
    if (!window.confirm(`Remover o acesso de "${name || profileId}"? Essa ação apaga o login e não pode ser desfeita.`)) return;
    try {
      // 1. Remove diretamente da tabela profiles via client Supabase
      const { error: dbError } = await supabase.from('profiles').delete().eq('id', profileId);
      if (dbError) {
        console.warn("Erro ao deletar profile no banco:", dbError);
      }

      // 2. Tenta remover via Edge Function de Auth se disponível
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await fetch(
            `${baseUrl}/functions/v1/manage-staff`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action: 'delete', userId: profileId }),
            }
          );
        }
      } catch (e) {
        console.warn("Edge function delete call warning:", e);
      }

      setProfiles(prev => prev.filter(p => p.id !== profileId));
      fetchProfiles();
    } catch (err: any) {
      alert("Erro ao remover usuário: " + err.message);
    }
  };

  const handleTogglePermission = async (profileId: string, permKey: string, currentValue: boolean) => {
    setSavingId(profileId);
    try {
      const targetProfile = profiles.find(p => p.id === profileId);
      const currentPermissions = targetProfile?.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        [permKey]: !currentValue
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, permissions: updatedPermissions } : p));
      setFeedback("Permissões atualizadas com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      console.error("Erro ao atualizar permissão:", err);
      alert("Erro ao atualizar permissão: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleChangeRole = async (profileId: string, newRoleValue: string) => {
    setSavingId(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRoleValue })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRoleValue } : p));
      setFeedback("Função atualizada com sucesso!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: any) {
      alert("Erro ao atualizar função: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)]">
        <div className="flex flex-wrap items-baseline gap-x-2 mb-4">
          <h3 className="text-[16px] font-bold text-stone-900 flex items-center gap-2">
            <UserPlus className="text-brand-600" size={18} />
            Novo acesso
          </h3>
          <p className="text-[13px] text-stone-500">usuário e senha para um funcionário, sem precisar de e-mail.</p>
        </div>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-[12px] font-semibold text-stone-500">Nome</label>
              <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} required
                className="w-full h-10 px-3 bg-stone-50/70 border border-stone-200 rounded-xl text-[14px] mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-stone-500">Usuário (sem espaço)</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required
                placeholder="ex: joao"
                className="w-full h-10 px-3 bg-stone-50/70 border border-stone-200 rounded-xl text-[14px] mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-stone-500">Senha</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full h-10 px-3 bg-stone-50/70 border border-stone-200 rounded-xl text-[14px] mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-stone-500">Função</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full h-10 px-3 bg-stone-50/70 border border-stone-200 rounded-xl text-[14px] mt-1 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 focus:border-brand-600">
                <option value="owner">Dono (Owner - Acesso Total)</option>
                <option value="staff">Funcionário (Staff)</option>
                <option value="caixa">Operador de Caixa</option>
                <option value="cozinha">Cozinha / Produção</option>
                <option value="entregador">Entregador</option>
              </select>
            </div>
          </div>

          {newRole !== 'owner' && (
            <div>
              <label className="text-[12px] font-semibold text-stone-500 mb-2 block">Permissões <span className="font-normal text-stone-400">· passe o mouse para ver o que cada uma libera</span></label>
              <div className="flex flex-wrap gap-1.5">
                {PERMISSION_DEFINITIONS.map(perm => (
                  <label key={perm.key} title={perm.description} className={`h-9 pl-2.5 pr-3 rounded-full border transition-colors cursor-pointer inline-flex items-center gap-2 text-[13px] font-semibold ${newPermissions[perm.key] ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300'}`}>
                    <input
                      type="checkbox"
                      checked={!!newPermissions[perm.key]}
                      onChange={() => setNewPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={creatingUser}
            className="h-10 px-5 bg-brand-700 text-white font-semibold rounded-xl text-[14px] hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm cursor-pointer">
            <UserPlus size={17} /> Criar acesso
          </button>
        </form>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-sm">
          {feedback}
        </div>
      )}

      {/* Profiles List */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_16px_-8px_rgba(59,2,87,0.08)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#78716C] font-medium">Carregando usuários...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-[#78716C] font-medium">Nenhum usuário cadastrado.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {profiles.map(profile => {
              const isOwner = profile.role === 'owner';
              const perms = profile.permissions || {};

              return (
                <div key={profile.id} className="px-5 py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-bold text-[14px] flex items-center justify-center shrink-0">
                        {(profile.full_name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="font-semibold text-stone-900 text-[15px] truncate">{profile.full_name || 'Sem nome'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-stone-500">Função</span>
                      <select
                        value={profile.role || 'staff'}
                        onChange={(e) => handleChangeRole(profile.id, e.target.value)}
                        disabled={savingId === profile.id}
                        className="h-9 px-3 bg-white border border-stone-200 rounded-lg text-[13px] font-semibold text-stone-800 outline-none cursor-pointer focus:border-brand-600"
                      >
                        <option value="owner">Dono (Owner - Acesso Total)</option>
                        <option value="staff">Funcionário (Staff)</option>
                        <option value="caixa">Operador de Caixa</option>
                        <option value="cozinha">Cozinha / Produção</option>
                        <option value="entregador">Entregador</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(profile.id, profile.full_name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover acesso"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Permissões Checklist Grid */}
                  <div>
                    {isOwner && <p className="text-[12px] text-stone-400 mb-1.5">Dono tem acesso total automático.</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_DEFINITIONS.map(perm => {
                        const hasPerm = isOwner || !!perms[perm.key];

                        return (
                          <label
                            key={perm.key}
                            title={perm.description}
                            className={`h-8 pl-2.5 pr-3 rounded-full border transition-colors cursor-pointer inline-flex items-center gap-2 text-[13px] font-semibold ${hasPerm ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-stone-200 text-stone-500 hover:border-brand-300'}`}
                          >
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              disabled={isOwner || savingId === profile.id}
                              onChange={() => handleTogglePermission(profile.id, perm.key, !!perms[perm.key])}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            {perm.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useRef } from 'react';
import { Database, Download, Upload, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BackupManagerProps {
  data: any;
  onRestored: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ data, onRestored }) => {
  const [restoring, setRestoring] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_aurilog_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // Lógica de restauração simplificada: Upsert por tabela
      const tables = ['vehicles', 'trips', 'expenses', 'maintenance'];
      for (const table of tables) {
        if (backup[table] && Array.isArray(backup[table])) {
          const rows = backup[table].map((row: any) => ({ ...row, user_id: user.id }));
          const { error } = await supabase.from(table).upsert(rows);
          if (error) console.error(`Erro ao restaurar ${table}:`, error.message);
        }
      }

      setSuccess(true);
      onRestored();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert("Erro ao restaurar: " + err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
          <div className="bg-primary-100 text-primary-600 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Download size={32} />
          </div>
          <h2 className="text-2xl font-black mb-2">Exportar Dados</h2>
          <p className="text-slate-500 mb-8 text-sm">Baixe uma cópia de segurança completa.</p>
          <button onClick={downloadBackup} className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
            <Download size={20} /> Baixar JSON
          </button>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-center">
          <div className="bg-emerald-100 text-emerald-600 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Upload size={32} />
          </div>
          <h2 className="text-2xl font-black mb-2">Restaurar Dados</h2>
          <p className="text-slate-500 mb-8 text-sm">Importe um arquivo de backup anterior.</p>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={restoring} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {restoring ? <Loader2 className="animate-spin" size={20}/> : success ? <Check size={20}/> : <Upload size={20} />}
            {restoring ? 'Restaurando...' : success ? 'Concluído!' : 'Selecionar Arquivo'}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex gap-4">
        <AlertTriangle className="text-amber-500 shrink-0" size={24} />
        <div className="text-sm text-amber-900">
          <p className="font-bold">Atenção!</p>
          A restauração de dados irá mesclar as informações do backup com os registros atuais. Certifique-se de que o arquivo é um backup válido gerado por este aplicativo.
        </div>
      </div>
    </div>
  );
};

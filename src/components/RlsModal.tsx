import { X, ShieldAlert } from 'lucide-react';

interface RlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RlsModal({ isOpen, onClose }: RlsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full shadow-2xl p-space-lg flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-fixed text-primary rounded-xl">
              <ShieldAlert className="w-[1em] h-[1em] text-xl" />
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Supabase Row-Level Security (RLS)</h3>
              <p className="font-body-sm text-xs text-outline">Arhitektura 4-stopenjskih vlog in pravil objavljanja na Portalko</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface">
            <X className="w-[1em] h-[1em] text-2xl" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-xs font-bold text-on-surface">1. Gost (Anonimni uporabnik)</span>
              <span className="font-label-caps text-[10px] bg-surface-container px-2 py-0.5 rounded text-outline">Anon</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Pravice: Branje vseh javnih objav, novic in dogodkov. Brez pravic za ustvarjanje novih objav ali komentiranje.
            </p>
            <code className="font-mono text-[11px] text-primary mt-1">auth.role() = 'anon' (SELECT only)</code>
          </div>
          
          <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-xs font-bold text-on-surface">2. Registriran uporabnik</span>
              <span className="font-label-caps text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded">User</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Pravice: Objava malih oglasov, blog člankov, dogodkov ter oddajanje komentarjev in zaznamkov.
            </p>
            <code className="font-mono text-[11px] text-primary mt-1">auth.role() = 'authenticated'</code>
          </div>
          
          <div className="p-3.5 rounded-xl bg-secondary-fixed/20 flex flex-col gap-1 border border-secondary/20">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-xs font-bold text-secondary">3. Preverjen partner (Verified)</span>
              <span className="font-label-caps text-[10px] bg-secondary text-on-secondary px-2 py-0.5 rounded">Preverjen</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Pravice: Vse zgoraj + objava uradnih kuponov, popustov in komercialnih ugodnosti z značko zaupanja.
            </p>
            <code className="font-mono text-[11px] text-secondary mt-1">user_metadata-&gt;&gt;'is_verified' = true</code>
          </div>
          
          <div className="p-3.5 rounded-xl bg-surface-container-highest flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-xs font-bold text-tertiary">4. Administrator</span>
              <span className="font-label-caps text-[10px] bg-tertiary text-on-tertiary px-2 py-0.5 rounded">Admin</span>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Pravice: Poln dostop do vseh tabel, moderiranje vsebine, potrjevanje novih partnerskih računov in RSS virov.
            </p>
            <code className="font-mono text-[11px] text-tertiary mt-1">user_metadata-&gt;&gt;'role' = 'admin'</code>
          </div>
        </div>
        
        <div className="bg-inverse-surface rounded-xl p-3.5 text-inverse-on-surface flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-outline-variant font-mono">
            <span>SUPABASE RLS POLITIKA PRIMER (deals tabela)</span>
            <span className="text-secondary">AKTIVNO</span>
          </div>
          <pre className="font-mono text-xs text-secondary-container overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`create policy "Ugodnosti lahko objavijo le preverjeni uporabniki"
on public.deals for insert
to authenticated
with check (
  (auth.jwt() -> 'user_metadata' ->> 'is_verified')::boolean = true
);`}
          </pre>
        </div>
        
        <div className="flex items-center justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-colors" type="button">
            Razumem sistem pravic
          </button>
        </div>
      </div>
    </div>
  );
}

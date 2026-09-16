import React from 'react';
import { Edit2, ExternalLink, Sparkles } from 'lucide-react';
import { ProfileMenuItem } from '../../contexts/AuthContext';
import { getMenuTabIcon } from './ProfileMenuEditorModal';

interface CustomTabContentProps {
  item: ProfileMenuItem;
  onEditItem?: (item: ProfileMenuItem) => void;
  canEdit?: boolean;
}

export function CustomTabContent({ item, onEditItem, canEdit = false }: CustomTabContentProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container/50 flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {getMenuTabIcon(item.icon, "w-5 h-5")}
          </div>
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              {item.label}
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Prilagojena vsebina na profilu uporabnika
            </p>
          </div>
        </div>

        {canEdit && onEditItem && (
          <button
            type="button"
            onClick={() => onEditItem(item)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 border border-surface-container"
          >
            <Edit2 className="w-3.5 h-3.5 text-primary" />
            <span>Uredi zavihek</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4">
        {item.type === 'externalLink' ? (
          <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-surface-container-highest text-primary">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                  Povezava na zunanjo spletno stran
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant break-all">
                  {item.url || 'Ni določenega URL naslova'}
                </p>
              </div>
            </div>

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <span>Odpri povezavo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-on-surface leading-relaxed">
            {item.content ? (
              <div className="p-5 rounded-2xl bg-surface-container-low/40 border border-surface-container/60 text-sm whitespace-pre-wrap font-body-md text-on-surface">
                {item.content}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-surface-container text-center flex flex-col items-center gap-2 text-on-surface-variant">
                <Sparkles className="w-6 h-6 text-primary/40" />
                <p className="text-xs font-medium">Ta zavihek trenutno še nima vnesene vsebine.</p>
                {canEdit && onEditItem && (
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="mt-2 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors"
                  >
                    Dodaj vsebino
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { Ticket, Copy, Check, ArrowRight } from 'lucide-react';

export interface DealPostProps {
  id?: string;
  title?: string;
  discount?: string;
  author?: string;
  authorRole?: string;
  date?: string;
  description?: string;
  code?: string;
  link?: string;
  votesCount?: number;
}

export const DealPost: React.FC<DealPostProps> = ({ 
  id = "default",
  title = "Hervis Slovenija: 30% spomladanski popust na vso tekaško obutev (Nike, Salomon, Asics)",
  discount = "-30%",
  author = "Gregor H.",
  authorRole = "Preverjen partner",
  date = "Veljavno do konca meseca",
  description = "Za vse registrirane člane portala je na voljo posebna ugodnost ob začetku tekaške sezone. Koda velja v spletni trgovini ter v vseh poslovalnicah po Sloveniji ob predložitvi digitalnega kupona.",
  code = "TEK30",
  link = "https://www.hervis.si",
  votesCount = 142
}) => {
  const [copied, setCopied] = useState(false);
  const [votes, setVotes] = useState(votesCount);
  const [hasVoted, setHasVoted] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bookmarkData = {
    type: 'deal',
    category: 'deals',
    title,
    price: discount,
    author,
    date,
    description,
  };

  return (
    <article className="bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-secondary-fixed/20 rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm border-l-4 border-l-secondary">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center font-black text-sm">
            {discount}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">{author}</h3>
              <span className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded font-bold">{authorRole}</span>
            </div>
            <p className="font-body-sm text-xs text-outline">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-tertiary text-on-tertiary font-label-caps text-label-caps px-2.5 py-1 rounded-full uppercase font-bold tracking-wider animate-pulse hidden sm:inline-flex">
            Ekskluzivno
          </span>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5">
        <h4 className="font-headline-md text-xl font-bold text-on-surface">
          {title}
        </h4>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {description}
        </p>
      </div>
      
      <div className="bg-surface-container-low rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 border-dashed border-2 border-secondary/40">
        <div className="flex items-center gap-2">
          <Ticket className="w-[1em] h-[1em] text-secondary text-xl" />
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-outline uppercase">Promocijska koda</span>
            <span className="font-headline-sm text-lg font-mono font-bold tracking-wider text-secondary">{code}</span>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Kopirano!' : 'Kopiraj kodo'}</span>
        </button>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1">
          <button 
            onClick={() => {
              if (!hasVoted) {
                setVotes(v => v + 1);
                setHasVoted(true);
              }
            }}
            className="px-3 py-1 rounded-lg bg-surface-container-lowest hover:bg-secondary-fixed text-on-surface font-label-md text-xs font-bold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <span className="text-secondary text-sm">▲</span>
            <span>{votes} glasov</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-xs text-outline">Preverjeno deluje (98%)</span>
          <a className="px-4 py-2 rounded-xl bg-secondary hover:bg-on-secondary-container text-on-secondary font-label-md text-label-md font-semibold transition-all shadow-sm flex items-center gap-1" href={link} rel="noopener noreferrer" target="_blank">
            <span>Uveljavi popust</span>
            <ArrowRight className="w-[1em] h-[1em] text-sm" />
          </a>
        </div>
      </div>
    </article>
  );
};


import React from "react";
import { ShareMenu } from "../ShareMenu";
import { BookmarkButton } from "../BookmarkButton";
import { ExternalLink } from 'lucide-react';

export interface NewsPostProps {
  id?: string;
  source?: string;
  categoryName?: string;
  timeAgo?: string;
  link?: string;
  title?: string;
  summary?: string;
}

export const NewsPost: React.FC<NewsPostProps> = ({ 
  id = "news",
  source = "24ur.com",
  categoryName = "Promet & Varnost",
  timeAgo = "pred 54 min",
  link = "https://www.24ur.com",
  title = "Prometna napoved: Predor Karavanke ponovno odprt za ves promet, popoldne krajše zapore",
  summary = "Vzdrževalna dela na avstrijski strani so bila uspešno zaključena pred predvidenim rokom. Prometno-informacijski center voznike opozarja na meglo v pasovih na primorski avtocesti.",
}) => {
  const bookmarkData = {
    type: 'news',
    category: 'news',
    title,
    source,
    link,
    date: timeAgo,
    description: summary,
  };

  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm border-l-4 border-l-outline-variant">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-surface-variant flex items-center justify-center font-bold text-xs text-on-surface-variant">
            {source.slice(0, 4)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-md text-xs font-bold text-on-surface">{source} • {categoryName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
              <span className="font-body-sm text-xs text-outline">{timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a className="font-label-caps text-label-caps text-primary hover:underline flex items-center gap-0.5 hidden sm:flex" href={link} rel="noopener noreferrer" target="_blank">
            <span>Beri na viru</span>
            <ExternalLink className="w-[1em] h-[1em] text-xs" />
          </a>
          <BookmarkButton id={id} data={bookmarkData} />
          <ShareMenu id={id} url={link} type="news" title={title} description={summary} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h4 className="font-headline-sm text-headline-sm text-on-surface">
          <a className="hover:underline" href={link} rel="noopener noreferrer" target="_blank">
            {title}
          </a>
        </h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {summary}
        </p>
      </div>
    </article>
  );
};

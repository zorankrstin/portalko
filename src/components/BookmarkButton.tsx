import { Bookmark } from 'lucide-react';
import { useBookmarks } from '../contexts/BookmarkContext';

interface BookmarkButtonProps {
  id: string;
  className?: string;
  data?: any;
  showLabel?: boolean;
}

export function BookmarkButton({ id, className = '', data, showLabel = false }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const active = isBookmarked(id);

  return (
    <button 
      onClick={() => toggleBookmark(id, data)}
      className={className || `p-1.5 rounded-lg transition-colors ${active ? 'text-primary hover:bg-surface-container' : 'text-outline hover:text-on-surface hover:bg-surface-container'}`}
      type="button"
      title={active ? 'Odstrani iz shranjenih' : 'Shrani'}
    >
      <Bookmark className={`w-4 h-4 ${active ? 'fill-current text-primary' : 'text-outline'}`} />
      {showLabel && (
        <span className={active ? 'text-primary font-bold' : 'text-on-surface-variant'}>
          {active ? 'Shranjeno' : 'Shrani'}
        </span>
      )}
    </button>
  );
}

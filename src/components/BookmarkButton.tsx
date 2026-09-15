import { Bookmark } from 'lucide-react';
import { useBookmarks } from '../contexts/BookmarkContext';

interface BookmarkButtonProps {
  id: string;
  className?: string;
  data?: any;
}

export function BookmarkButton({ id, className = '', data }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const active = isBookmarked(id);

  return (
    <button 
      onClick={() => toggleBookmark(id, data)}
      className={`p-1.5 rounded-lg transition-colors ${active ? 'text-primary hover:bg-surface-container' : 'text-outline hover:text-on-surface hover:bg-surface-container'} ${className}`}
      type="button"
      title={active ? 'Odstrani iz shranjenih' : 'Shrani'}
    >
      <Bookmark className={`w-[1em] h-[1em] text-lg ${active ? 'fill-current' : ''}`} />
    </button>
  );
}

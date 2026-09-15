import { SavedPostsTab } from './SavedPostsTab';

export function SavedView({ searchQuery = '' }: { searchQuery?: string }) {
  return (
    <main className="lg:col-span-6 flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50">
        <SavedPostsTab searchQuery={searchQuery} />
      </div>
    </main>
  );
}

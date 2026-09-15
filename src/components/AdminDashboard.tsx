import React, { useState, useEffect } from 'react';
import { Settings, Rss, Trash2, Plus, Users, FileText, Shield, Search, Filter, CheckCircle, XCircle, MoreVertical, UserPlus, Crown, AlertCircle, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { useAuth, Role } from '../contexts/AuthContext';
import { 
  RssFeedConfig, 
  DEFAULT_RSS_FEEDS, 
  getAdminRssFeeds, 
  saveAdminRssFeeds, 
  validateRssFeedUrl 
} from '../services/rssService';

export type { RssFeedConfig };

interface AdminPost {
  id: string;
  title: string;
  author: string;
  type: 'blog' | 'ad' | 'event' | 'deal';
  status: 'published' | 'pending' | 'removed';
  date: string;
}

const MOCK_POSTS: AdminPost[] = [
  { id: 'p1', title: 'Potep po dolini Soče: 5 skritih kotičkov', author: 'Maja Zupan', type: 'blog', status: 'published', date: '12. Sep 2026' },
  { id: 'p2', title: 'Prodam Audi A4 2.0 TDI', author: 'Janez Horvat', type: 'ad', status: 'removed', date: '11. Sep 2026' },
  { id: 'p3', title: 'Koncert Joker Out', author: 'Kino Šiška', type: 'event', status: 'published', date: '10. Sep 2026' },
  { id: 'p4', title: '-20% popust na pnevmatike', author: 'Vulkanizerstvo', type: 'deal', status: 'pending', date: '09. Sep 2026' },
];

export function AdminDashboard() {
  const { users, currentUser, updateUser, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'rss' | 'users' | 'posts'>('users');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('geslo123');
  const [newUserRole, setNewUserRole] = useState<Role>('registered');
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');

  // RSS State
  const [feeds, setFeeds] = useState<RssFeedConfig[]>(() => getAdminRssFeeds());
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [isTestingFeed, setIsTestingFeed] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number; sampleTitle?: string } | null>(null);

  useEffect(() => {
    saveAdminRssFeeds(feeds);
  }, [feeds]);

  const handleTestFeed = async () => {
    if (!newUrl) return;
    setIsTestingFeed(true);
    setTestResult(null);
    const result = await validateRssFeedUrl(newUrl, newName || 'Nov vir');
    setTestResult(result);
    setIsTestingFeed(false);
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newName) return;

    setIsTestingFeed(true);
    const validation = await validateRssFeedUrl(newUrl, newName);
    setIsTestingFeed(false);

    if (!validation.success) {
      setTestResult(validation);
      return;
    }

    setFeeds([...feeds, { id: Date.now().toString(), url: newUrl.trim(), name: newName.trim(), active: true }]);
    setNewUrl('');
    setNewName('');
    setTestResult(null);
  };

  const addPresetFeed = (preset: RssFeedConfig) => {
    if (feeds.some(f => f.url.toLowerCase() === preset.url.toLowerCase())) return;
    setFeeds([...feeds, { ...preset, id: Date.now().toString(), active: true }]);
  };

  const resetToDefaultFeeds = () => {
    setFeeds(DEFAULT_RSS_FEEDS);
  };

  const renderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-4 border-b border-surface-container-low pb-3">
      <button 
        onClick={() => setActiveTab('users')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
      >
        <Users className="w-[1em] h-[1em]" /> Uporabniki
      </button>
      <button 
        onClick={() => setActiveTab('posts')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'posts' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
      >
        <FileText className="w-[1em] h-[1em]" /> Objavljene vsebine
      </button>
      <button 
        onClick={() => setActiveTab('rss')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'rss' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
      >
        <Rss className="w-[1em] h-[1em]" /> RSS Viri
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-space-md lg:col-span-9">
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-surface-container-low pb-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center">
            <Shield className="w-[1em] h-[1em] text-2xl" />
          </div>
          <div>
            <h2 className="font-headline-sm text-xl font-bold text-on-surface">Admin Nadzorna Plošča</h2>
            <p className="font-body-sm text-sm text-outline">Upravljanje uporabnikov, vsebin in sistemskih virov.</p>
          </div>
        </div>

        {renderTabs()}

        {/* Tab Content: Users */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Upravljanje uporabnikov</h3>
                <p className="text-xs text-outline">Skupaj registriranih uporabnikov: {users.length}</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input 
                    type="text" 
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Išči po imenu, e-pošti, vlogi..." 
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-transparent focus:border-primary focus:outline-none text-sm font-body-sm" 
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-outline hover:text-on-surface"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {currentUser?.role === 'superadmin' && (
                  <button
                    onClick={() => {
                      setIsAddUserOpen(true);
                      setAddUserError('');
                      setAddUserSuccess('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Dodaj uporabnika</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal for adding user as superadmin */}
            {isAddUserOpen && (
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Ustvari novega uporabnika (kot Superadmin)
                  </h4>
                  <button 
                    onClick={() => setIsAddUserOpen(false)}
                    className="text-outline hover:text-on-surface text-xs"
                  >
                    Zapri
                  </button>
                </div>

                {addUserError && (
                  <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{addUserError}</span>
                  </div>
                )}
                {addUserSuccess && (
                  <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary text-xs flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{addUserSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Ime in priimek *"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none"
                  />
                  <input
                    type="email"
                    placeholder="E-poštni naslov *"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Geslo *"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none font-mono"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="superadmin">⭐ Superadmin</option>
                    <option value="admin">Administrator</option>
                    <option value="verified">Preverjeni uporabnik</option>
                    <option value="registered">Registrirani uporabnik</option>
                    <option value="guest">Gost</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Prekliči
                  </button>
                  <button
                    onClick={() => {
                      setAddUserError('');
                      setAddUserSuccess('');
                      const res = register({
                        name: newUserName,
                        email: newUserEmail,
                        password: newUserPassword,
                        role: newUserRole,
                      });
                      if (!res.success) {
                        setAddUserError(res.error || 'Napaka pri ustvarjanju.');
                      } else {
                        setAddUserSuccess(`Uporabnik ${res.user?.name} z vlogo ${res.user?.role} uspešno ustvarjen!`);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserPassword('geslo123');
                        setNewUserRole('registered');
                        setTimeout(() => {
                          setIsAddUserOpen(false);
                          setAddUserSuccess('');
                        }, 1200);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary-container transition-colors shadow-sm"
                  >
                    Ustvari uporabnika
                  </button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Uporabnik</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Vloga</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Status</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {users
                    .filter(user => {
                      if (!userSearchQuery) return true;
                      const q = userSearchQuery.toLowerCase();
                      return (
                        user.name.toLowerCase().includes(q) ||
                        user.email.toLowerCase().includes(q) ||
                        user.role.toLowerCase().includes(q)
                      );
                    })
                    .map(user => {
                      const isSuperadmin = currentUser?.role === 'superadmin';
                      return (
                        <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-on-surface flex items-center gap-1">
                                  {user.name}
                                  {user.role === 'superadmin' && <Crown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                                </span>
                                <span className="text-xs text-outline truncate">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {isSuperadmin && user.id !== currentUser?.id ? (
                              <select
                                value={user.role}
                                onChange={(e) => updateUser(user.id, { role: e.target.value as any })}
                                className="bg-surface-container-low text-xs p-1 rounded border-none outline-none cursor-pointer"
                              >
                                <option value="superadmin">superadmin</option>
                                <option value="admin">admin</option>
                                <option value="verified">verified</option>
                                <option value="registered">registered</option>
                                <option value="guest">guest</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                                user.role === 'superadmin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 
                                user.role === 'admin' ? 'bg-error/10 text-error' : 
                                user.role === 'verified' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                              }`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {user.status === 'active' ? (
                              <span className="flex items-center gap-1 text-xs text-secondary font-medium"><CheckCircle className="w-3 h-3" /> Aktiven</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-error font-medium"><XCircle className="w-3 h-3" /> Baniran</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {isSuperadmin && user.id !== currentUser?.id ? (
                              <button 
                                onClick={() => updateUser(user.id, { status: user.status === 'active' ? 'banned' : 'active' })}
                                className={`px-3 py-1 rounded text-xs font-bold ${user.status === 'active' ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}
                              >
                                {user.status === 'active' ? 'Blokiraj' : 'Odblokiraj'}
                              </button>
                            ) : (
                              <button className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/10" title="Ni pravic za urejanje"><MoreVertical className="w-4 h-4" /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Posts */}
        {activeTab === 'posts' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Vse objave</h3>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-xs flex items-center gap-1.5 transition-colors">
                  <Filter className="w-3 h-3" /> Filtriraj
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Naslov & Avtor</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Tip</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Status</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Datum</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {MOCK_POSTS.map(post => (
                    <tr key={post.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col max-w-[200px] sm:max-w-xs">
                          <span className="font-bold text-sm text-on-surface truncate">{post.title}</span>
                          <span className="text-xs text-outline">{post.author}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs uppercase font-semibold text-outline">
                        {post.type}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          post.status === 'published' ? 'bg-secondary/10 text-secondary' : 
                          post.status === 'pending' ? 'bg-[#D28E3D]/10 text-[#D28E3D]' : 'bg-error/10 text-error'
                        }`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-on-surface-variant">
                        {post.date}
                      </td>
                      <td className="p-3 text-right">
                        <button className="p-1.5 text-outline hover:text-error transition-colors rounded-lg hover:bg-error/10" title="Odstrani objavo"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: RSS */}
        {activeTab === 'rss' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container-low">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                  <Rss className="w-5 h-5 text-primary" /> Upravljanje RSS novičarskih virov
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                  V novicah se prikazujejo <strong>izključno resnične novice</strong>, pridobljene iz spodnjih virov. Drugi viri se lahko uporabijo le, če so pravilno preneseni in se povezujejo na dejansko objavo v novem oknu.
                </p>
              </div>
              <button
                onClick={resetToDefaultFeeds}
                className="px-3 py-1.5 rounded-lg border border-surface-container text-xs text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Povrni na preverjene privzete slovenske medije"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Privzeti viri</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-2 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container/60">
              <span className="font-label-caps text-xs text-outline uppercase font-semibold">Priporočeni slovenski viri (dodaj z enim klikom):</span>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_RSS_FEEDS.map(preset => {
                  const alreadyAdded = feeds.some(f => f.url.toLowerCase() === preset.url.toLowerCase());
                  return (
                    <button
                      key={preset.id}
                      onClick={() => addPresetFeed(preset)}
                      disabled={alreadyAdded}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        alreadyAdded 
                          ? 'bg-surface-container text-outline opacity-60 cursor-default' 
                          : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer'
                      }`}
                    >
                      <span>+ {preset.name}</span>
                      {alreadyAdded && <span className="text-[10px] text-primary">(dodan)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Feed Form */}
            <form onSubmit={handleAddFeed} className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-xl border border-surface-container">
              <div className="font-label-md text-sm font-semibold text-on-surface flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>Dodaj nov preverjen RSS vir</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 flex flex-col gap-1.5">
                  <label className="font-label-caps text-xs text-outline uppercase">Ime vira (npr. medij)</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setTestResult(null); }}
                    placeholder="Npr. Delo - Novice"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-sm text-on-surface border border-surface-container focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="sm:col-span-5 flex flex-col gap-1.5">
                  <label className="font-label-caps text-xs text-outline uppercase">RSS URL naslov</label>
                  <input 
                    type="url" 
                    value={newUrl}
                    onChange={e => { setNewUrl(e.target.value); setTestResult(null); }}
                    placeholder="https://primer.si/rss"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-sm text-on-surface border border-surface-container focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleTestFeed}
                    disabled={isTestingFeed || !newUrl}
                    className="flex-1 py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Preizkusi, če vir uspešno vrača novice z veljavnimi povezavami"
                  >
                    {isTestingFeed ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Preveri</span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={isTestingFeed || !newUrl || !newName}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                </div>
              </div>

              {/* Feed Validation Feedback */}
              {testResult && (
                <div className={`p-3 rounded-lg text-xs flex flex-col gap-1 ${
                  testResult.success 
                    ? 'bg-secondary/10 border border-secondary/20 text-secondary' 
                    : 'bg-error/10 border border-error/20 text-error'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.sampleTitle && (
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      Primer zadnjega prenesenega članka: <em>"{testResult.sampleTitle}"</em>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* List of active feeds */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-outline px-1">
                <span>Trenutno konfigurirani viri ({feeds.length}):</span>
                <span>Aktivni: {feeds.filter(f => f.active).length}</span>
              </div>
              {feeds.length === 0 ? (
                <div className="text-outline text-sm text-center py-6 bg-surface-container-lowest rounded-xl border border-surface-container">
                  Ni dodanih RSS virov. Kliknite "Privzeti viri" zgoraj za samodejno dodajanje.
                </div>
              ) : (
                feeds.map(feed => (
                  <div key={feed.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-lowest hover:border-primary/40 transition-colors shadow-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button 
                        onClick={() => setFeeds(feeds.map(f => f.id === feed.id ? { ...f, active: !f.active } : f))}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${feed.active ? 'bg-primary' : 'bg-surface-variant'}`}
                        title={feed.active ? 'Kliknite za izklop vira' : 'Kliknite za vklop vira'}
                      >
                        <div className={`w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-all shadow-xs ${feed.active ? 'left-6' : 'left-1'}`}></div>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${feed.active ? 'text-on-surface' : 'text-outline line-through'}`}>
                            {feed.name}
                          </span>
                          {feed.active ? (
                            <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.2 rounded font-bold">Aktiven</span>
                          ) : (
                            <span className="text-[10px] bg-surface-container text-outline px-1.5 py-0.2 rounded">Izklopljen</span>
                          )}
                        </div>
                        <a 
                          href={feed.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-outline font-mono truncate hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span>{feed.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                    <button 
                      onClick={() => setFeeds(feeds.filter(f => f.id !== feed.id))}
                      className="p-2 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Odstrani vir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// replace imports and mock users
code = code.replace(
  "import { Settings, Rss, Trash2, Plus, Users, FileText, Shield, Search, Filter, CheckCircle, XCircle, MoreVertical } from 'lucide-react';",
  "import { Settings, Rss, Trash2, Plus, Users, FileText, Shield, Search, Filter, CheckCircle, XCircle, MoreVertical } from 'lucide-react';\nimport { useAuth } from '../contexts/AuthContext';"
);

code = code.replace(
  `interface User {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'verified' | 'registered' | 'guest';
  status: 'active' | 'banned';
}

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Zoran Krstin', email: 'zoran.krstin@gmail.com', role: 'superadmin', status: 'active' },
  { id: 'u2', name: 'Luka Novak', email: 'luka.n@example.com', role: 'admin', status: 'active' },
  { id: 'u3', name: 'Maja Zupan', email: 'maja.z@example.com', role: 'verified', status: 'active' },
  { id: 'u4', name: 'Janez Horvat', email: 'janez.h@example.com', role: 'registered', status: 'banned' },
];`,
  ""
);

// inside AdminDashboard
code = code.replace(
  "export function AdminDashboard() {",
  "export function AdminDashboard() {\n  const { users, currentUser, updateUser } = useAuth();"
);

// replace MOCK_USERS table body
const mockUsersTableStr = `{MOCK_USERS.map(user => (
                    <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-on-surface">{user.name}</span>
                          <span className="text-xs text-outline">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={\`inline-block px-2 py-0.5 rounded-md text-xs font-semibold \${
                          user.role === 'superadmin' ? 'bg-tertiary/10 text-tertiary' : 
                          user.role === 'admin' ? 'bg-error/10 text-error' : 
                          user.role === 'verified' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                        }\`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.status === 'active' ? (
                          <span className="flex items-center gap-1 text-xs text-secondary font-medium"><CheckCircle className="w-3 h-3" /> Aktiven</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-error font-medium"><XCircle className="w-3 h-3" /> Baniran</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/10"><MoreVertical className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}`;

const newUsersTableStr = `{users.map(user => {
                    const isSuperadmin = currentUser?.role === 'superadmin';
                    return (
                      <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-on-surface">{user.name}</span>
                            <span className="text-xs text-outline">{user.email}</span>
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
                            <span className={\`inline-block px-2 py-0.5 rounded-md text-xs font-semibold \${
                              user.role === 'superadmin' ? 'bg-tertiary/10 text-tertiary' : 
                              user.role === 'admin' ? 'bg-error/10 text-error' : 
                              user.role === 'verified' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                            }\`}>
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
                              className={\`px-3 py-1 rounded text-xs font-bold \${user.status === 'active' ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}\`}
                            >
                              {user.status === 'active' ? 'Blokiraj' : 'Odblokiraj'}
                            </button>
                          ) : (
                            <button className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/10" title="Ni pravic za urejanje"><MoreVertical className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}`;

if (code.includes("{MOCK_USERS.map")) {
  code = code.replace(mockUsersTableStr, newUsersTableStr);
  fs.writeFileSync('src/components/AdminDashboard.tsx', code);
  console.log("AdminDashboard patched successfully.");
} else {
  console.log("Failed to find MOCK_USERS.map inside AdminDashboard.");
}

import { useState, useEffect } from 'react';

export default function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: ''
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: '1',
    dept_id: 1
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/audit-logs');
      const data = await response.json();
      if (response.ok) setAuditLogs(data);
    } catch (error) {
      console.error("Failed to fetch audit logs");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/users');
      const data = await response.json();
      if (response.ok) setUsersList(data);
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (currentUser && userId === currentUser.id && currentStatus === true) {
      alert("Security Protocol: You cannot disable your own active administrative account.");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_active: !currentStatus,
          current_user_id: currentUser ? currentUser.id : null
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchUsers();
        fetchAuditLogs();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (error) {
      alert("Error connecting to server");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/users/${currentUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update password");

      alert(data.message);
      setPasswordData({ current_password: '', new_password: '' });
      if (currentUser.role === 'Admin') fetchAuditLogs();
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'Admin') {
      fetchAuditLogs();
      fetchUsers();
    }
  }, [currentUser]);

  const initializeDatabase = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/init', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert("Failed to connect to backend server.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = { ...formData, role_id: parseInt(formData.role_id) };

    try {
      const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      alert(data.message);
      if (isLogin) {
        setCurrentUser(data.user);
      } else {
        setIsLogin(true);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-8 space-y-8">
        {/* User Profile / Dashboard Header */}
        <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-4xl w-full text-center border border-slate-700">
          <h1 className="text-2xl font-bold mb-2">Secure Dashboard</h1>
          <p className="text-emerald-400 font-medium mb-1">Welcome back, {currentUser.first_name} {currentUser.last_name}!</p>
          <p className="text-xs text-slate-400 mb-2">Email: {currentUser.email}</p>
          <div className="inline-block bg-blue-900/50 text-blue-400 text-xs px-3 py-1 rounded border border-blue-700/50 mb-4 font-semibold uppercase tracking-wider">
            Role: {currentUser.role}
          </div>
          <div>
            <button 
              onClick={() => setCurrentUser(null)} 
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-sm font-semibold transition cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Password Change Panel */}
        <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-4xl w-full border border-slate-700">
          <h2 className="text-lg font-bold text-slate-200 mb-4">Security: Update Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
              <input 
                type="password" 
                placeholder="Enter current password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">New Secure Password</label>
              <input 
                type="password" 
                placeholder="Enter new password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-white text-sm transition cursor-pointer"
            >
              Update Password
            </button>
          </form>
        </div>

        {currentUser.role === 'Admin' ? (
          <>
            {/* User Management Panel */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-4xl w-full border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-200">User Account Management (Admin Privileged View)</h2>
                <button 
                  onClick={fetchUsers}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-blue-400 font-medium transition cursor-pointer"
                >
                  Refresh Users
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-700 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Role</th>
                      <th className="px-4 py-2">Department</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-2 font-medium">{u.first_name} {u.last_name}</td>
                        <td className="px-4 py-2 text-slate-300">{u.email}</td>
                        <td className="px-4 py-2">
                          <span className="bg-blue-900/50 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-700/50">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-2">{u.department}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${u.is_active ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' : 'bg-red-900/50 text-red-400 border-red-700/50'}`}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => toggleUserStatus(u.id, u.is_active)}
                            className={`text-xs px-3 py-1 rounded font-medium transition cursor-pointer ${u.is_active ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Trail Panel */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-4xl w-full border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-200">System Security Audit Trail</h2>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text"
                    placeholder="Filter logs..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={fetchAuditLogs}
                    className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-blue-400 font-medium transition cursor-pointer"
                  >
                    Refresh Logs
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-700 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2">User Email</th>
                      <th className="px-4 py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {auditLogs.filter(log => 
                      log.action_type.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                      log.user_email.toLowerCase().includes(auditSearchQuery.toLowerCase())
                    ).length > 0 ? (
                      auditLogs
                        .filter(log => 
                          log.action_type.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          log.user_email.toLowerCase().includes(auditSearchQuery.toLowerCase())
                        )
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-700/50">
                            <td className="px-4 py-2 font-mono text-xs">{log.id}</td>
                            <td className="px-4 py-2">
                              <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded border border-emerald-700/50">
                                {log.action_type}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-300">{log.user_email}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-400">{log.timestamp}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-slate-500">No matching audit logs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-800 p-6 rounded-xl shadow-xl max-w-2xl w-full border border-slate-700 text-center">
            <h2 className="text-lg font-bold text-slate-300 mb-2">Staff Standard Portal</h2>
            <p className="text-sm text-slate-400">You are logged in with Staff privileges. Administrative user controls and security audit trails are restricted.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <button 
        onClick={initializeDatabase}
        className="mb-8 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded shadow text-sm font-semibold transition cursor-pointer"
      >
        1. Initialize Database (Run Once)
      </button>

      <div className="bg-slate-800 p-8 rounded-xl shadow-xl max-w-md w-full border border-slate-700">
        <div className="flex border-b border-slate-700 mb-6">
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 pb-3 font-semibold text-center cursor-pointer transition ${!isLogin ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400'}`}
          >
            Register
          </button>
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 pb-3 font-semibold text-center cursor-pointer transition ${isLogin ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-400'}`}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="first_name" 
                  placeholder="First Name" 
                  value={formData.first_name} 
                  onChange={handleChange} 
                  required
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
                <input 
                  type="text" 
                  name="last_name" 
                  placeholder="Last Name" 
                  value={formData.last_name} 
                  onChange={handleChange} 
                  required
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select System Role</label>
                <select 
                  name="role_id" 
                  value={formData.role_id} 
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="1">Admin (Full Security Access)</option>
                  <option value="2">Staff (Standard Access)</option>
                </select>
              </div>
            </>
          )}

          <input 
            type="email" 
            name="email" 
            placeholder="Organization Email" 
            value={formData.email} 
            onChange={handleChange} 
            required
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />

          <input 
            type="password" 
            name="password" 
            placeholder="Secure Password" 
            value={formData.password} 
            onChange={handleChange} 
            required
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-semibold text-white transition cursor-pointer"
          >
            {isLogin ? 'Sign In' : 'Register User'}
          </button>
        </form>
      </div>
    </div>
  );
}
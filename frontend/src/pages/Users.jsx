import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, X, User, ShieldCheck, Mail, Phone, Users as UsersIcon, AlertTriangle, Send } from 'lucide-react';
import api from '../api/axios';

const Users = () => {
  const navigate = useNavigate();
  const [usersData, setUsersData] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk pencarian & filter role
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Hanya menampung email dan role untuk keperluan Invite
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'TeamDeveloper'
  });

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
    setCurrentAdmin(JSON.parse(loggedInUser));
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Mengarah ke endpoint sinkronisasi users tenant
      const res = await api.get('/users');
      setUsersData(res.data?.data || res.data || []);
    } catch (err) {
      console.error("GET WORKSPACE USERS ERROR:", err);
      // Fallback Mock Data untuk visualisasi dengan penyesuaian kolom kosong pada user baru
      setUsersData([
        { id: 1, name: "Icha Moderator", email: "icha@cahyacell.com", phone_number: "08123456789", role: "BusinessAnalyst", gender: "female" },
        { id: 2, name: "Zul Co-Host", email: "zul@cahyacell.com", phone_number: "08234567890", role: "ProjectOwner", gender: "male" },
        { id: 3, name: "Fauzi Editor", email: "fauzi@cahyacell.com", phone_number: "08345678901", role: "TeamDeveloper", gender: "male" },
        { id: 4, name: "Alda Audience", email: "alda@cahyacell.com", phone_number: "08456789012", role: "TeamDeveloper", gender: "female" },
        { id: 5, name: null, email: "kandidatbaru@gmail.com", phone_number: null, role: "TeamDeveloper", gender: null } // Contoh state pending
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!newUser.email) {
      alert("Email wajib diisi!");
      return;
    }

    try {
      // SINKRONISASI: Hit ke endpoint invitations yang ada di userRoutes.js
      await api.post('/users/invitations', newUser);
      
      setIsModalOpen(false);
      setNewUser({ email: '', role: 'TeamDeveloper' });
      alert("Email berisi tautan undangan berhasil dikirim ke calon anggota tim!");
      fetchUsers();
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      alert(err?.response?.data?.message || "Gagal mengirimkan undangan workspace.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      alert("Akses pengguna atau tautan undangan berhasil dicabut dari workspace.");
      fetchUsers();
    } catch (err) {
      console.error("REVOKE USER ERROR:", err);
      alert(err?.response?.data?.message || "Gagal menghapus pengguna.");
    }
  };

  const confirmDelete = async () => {
    await handleDelete(deleteTarget);
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const filteredUsers = usersData.filter((user) => {
    // Penanganan pencarian aman jika user.name bernilai null/pending
    const nameString = user.name || "pending menunggu aktivasi";
    const matchesSearch = nameString.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-50 text-[#ee1e2d] border-red-100';
      case 'ProjectOwner':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'BusinessAnalyst':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <UsersIcon className="text-[#ee1e2d]" size={32} /> Manajemen Anggota Tim
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[3px]">
            Kelola Hak Akses, Undang Karyawan, dan Alokasi Peran Scrum Internal Perusahaan.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl text-xs font-black transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} /> Undang Anggota Tim
        </button>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={14} className="text-slate-400 ml-2" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Semua Hak Akses</option>
            <option value="Admin">Admin Perusahaan</option>
            <option value="ProjectOwner">Project Owner</option>
            <option value="BusinessAnalyst">Business Analyst</option>
            <option value="TeamDeveloper">Team Developer</option>
          </select>
        </div>
      </div>

      {/* RE-DESIGNED TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400 w-16 text-center">No</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Anggota</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Kontak Rumah</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Alamat Email</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Struktur Peran</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-24">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ee1e2d] rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-wider">Memuat manifes repositori tim...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Tidak ada anggota tim yang terdaftar atau cocok.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => {
                  // Cek apakah user berstatus pending (belum mengisi profil via tautan email)
                  const isPending = !u.name;

                  return (
                    <tr key={u.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 text-center text-slate-400 font-bold text-xs">{i + 1}</td>
                      
                      {/* NAMA ANGGOTA DENGAN KONDISIONAL AVATAR */}
                      <td className="p-6 font-black text-slate-800 text-sm flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${
                          isPending 
                            ? 'bg-amber-50 border-amber-100 text-amber-500 animate-pulse' 
                            : u.gender === 'female' 
                              ? 'bg-pink-50 border-pink-100 text-pink-500' 
                              : 'bg-blue-50 border-blue-100 text-blue-500'
                        }`}>
                          <User size={16} />
                        </div>
                        {u.name || (
                          <div className="flex flex-col">
                            <span className="text-amber-600 text-xs font-black uppercase tracking-wider">Pending</span>
                            <span className="text-[10px] text-slate-400 font-medium font-mono">Menunggu Aktivasi</span>
                          </div>
                        )}
                      </td>

                      {/* KONTAK TELEPON */}
                      <td className="p-6 text-slate-600 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-400" /> 
                          {u.phone_number || <span className="text-slate-300 font-normal italic">Belum diatur</span>}
                        </span>
                      </td>

                      {/* ALAMAT EMAIL */}
                      <td className="p-6 text-slate-600 font-semibold text-xs">
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {u.email}</span>
                      </td>

                      {/* STRUKTUR PERAN */}
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* AKSI DINAMIS */}
                      <td className="p-6 text-center">
                        {u.role === 'Admin' && currentAdmin?.email === u.email ? (
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                            <ShieldCheck size={12}/> Anda
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setDeleteTarget(u.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white hover:bg-[#ee1e2d] rounded-xl transition-all border border-transparent hover:border-red-200"
                            title={isPending ? "Batalkan Undangan Email" : "Cabut Akses Workspace"}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INVITE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Kirim Undangan Tim</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Alamat Email Calon Anggota</label>
                <input
                  type="email"
                  required
                  placeholder="nama@perusahaan.com"
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Hak Akses Siklus Scrum (Role)</label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Admin">Admin Perusahaan (Workspace Admin)</option>
                  <option value="ProjectOwner">Project Owner (PO)</option>
                  <option value="BusinessAnalyst">Business Analyst (BA)</option>
                  <option value="TeamDeveloper">Team Developer</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full mt-4 py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Send size={14} /> Kirim Tautan Undangan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE / REVOKE */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-sm w-full p-8 text-center transform animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center text-[#ee1e2d] mx-auto mb-4 animate-bounce">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">Cabut Akses Anggota?</h3>
            <p className="text-slate-400 font-medium text-xs mt-2 leading-relaxed">
              Tindakan ini akan menghapus user atau membatalkan tautan undangan pending secara permanen dari organisasi ini.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3 bg-[#ee1e2d] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-colors shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
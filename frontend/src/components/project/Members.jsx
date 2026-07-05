import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Edit,
  UserCircle,
  Shield,
  Briefcase,
  Code2,
  Mail,
  Users,
  AlertCircle
} from 'lucide-react';

import api from '../../api/axios';
import Modal from '../ui/Modal';

const Members = ({ projectId, currentRole, currentUserId }) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(''); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  const localUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUser = {
    id: currentUserId ?? localUser.id,
    role: currentRole ?? localUser.role
  };

  const [formData, setFormData] = useState({
    user_id: '',
    role: 'TeamDeveloper'
  });

  /* =====================================================
      FETCH DATA
     ===================================================== */
  const [fetchError, setFetchError] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setFetchError('');
      const res = await api.get(`/projects/${projectId}/members`);
      const memberData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setMembers(memberData);
    } catch (err) {
      console.error('GET MEMBERS ERROR:', err.response?.data || err.message);
      setMembers([]);
      setFetchError(
        err.response?.data?.message || 'Gagal memuat daftar member. Periksa koneksi atau coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const userData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setUsers(userData);
    } catch (err) {
      console.error('GET USERS ERROR:', err.response?.data || err.message);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchUsers();
  }, [projectId]);

  /* =====================================================
      FILTER USERS (Mencegah Duplikasi Anggota)
     ===================================================== */
  const availableUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    const safeMembers = Array.isArray(members) ? members : [];
    return users.filter(user => !safeMembers.some(member => member.user_id === user.id));
  }, [users, members]);

  /* =====================================================
      RESET FORM
    ===================================================== */
  const resetForm = () => {
    setFormData({
      user_id: '',
      role: 'TeamDeveloper'
    });
    setSelectedMember(null);
    setErrorMsg('');
  };

  /* =====================================================
      HANDLERS (ADD, EDIT, DELETE)
    ===================================================== */
  const handleAddMember = async (e) => {
    e.preventDefault();
    setErrorMsg(''); 

    try {
      await api.post(`/projects/${projectId}/members`, formData);
      setIsAddModalOpen(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error('ADD MEMBER ERROR:', err.response?.data || err.message);
      setErrorMsg(
        err.response?.data?.message || 
        err.response?.data || 
        "Gagal menambahkan anggota. Silakan coba lagi."
      );
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await api.put(`/projects/${projectId}/members/${selectedMember.id}`, {
        role: formData.role
      });
      setIsEditModalOpen(false);
      resetForm();
      fetchMembers();
    } catch (err) {
      console.error('EDIT MEMBER ERROR:', err.response?.data || err.message);
      setErrorMsg(err.response?.data?.message || "Gagal memperbarui role anggota.");
    }
  };

  const handleDeleteMember = async () => {
    try {
      const wasSelf = selectedMember?.user_id === currentUser.id;
      await api.delete(`/projects/${projectId}/members/${selectedMember.id}`);
      setIsDeleteModalOpen(false);
      resetForm();
      if (wasSelf) {
        navigate('/projects');
        return;
      }
      fetchMembers();
    } catch (err) {
      console.error('DELETE MEMBER ERROR:', err.response?.data || err.message);
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      user_id: member.user_id,
      role: member.role
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (member) => {
    setSelectedMember(member);
    setIsDeleteModalOpen(true);
  };

  /* =====================================================
      UI RENDER STYLES
     ===================================================== */
  const roleBadge = (role) => {
    switch (role) {
      case 'ProjectOwner': return 'bg-purple-100 text-purple-700';
      case 'Superadmin': return 'bg-red-100 text-red-600';
      case 'BusinessAnalyst': return 'bg-blue-100 text-blue-600';
      case 'TeamDeveloper': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const roleIcon = (role) => {
    switch (role) {
      case 'ProjectOwner': return <Briefcase size={13} />;
      case 'Superadmin': return <Shield size={13} />;
      case 'BusinessAnalyst': return <UserCircle size={13} />;
      case 'TeamDeveloper': return <Code2 size={13} />;
      default: return <UserCircle size={13} />;
    }
  };

  const currentRoleLower = currentUser?.role?.toString().toLowerCase() || '';
  const canManageMember = ['superadmin', 'admin'].includes(currentRoleLower);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-100 text-red-500">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Project Members</h2>
            <p className="text-sm text-gray-400">Kelola anggota project dan role mereka</p>
          </div>
        </div>

        {canManageMember && (
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-semibold transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Member
          </button>
        )}
      </div>

      {/* MEMBER LIST - CLEAN LIST VIEW */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading members...</div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <AlertCircle size={28} className="text-red-400" />
          <p className="text-sm font-semibold text-red-500">{fetchError}</p>
          <button
            onClick={fetchMembers}
            className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">Belum ada member di project ini.</div>
      ) : (
        /* Pembungkus utama list vertikal */
        <div className="flex flex-col gap-3 w-full">
          {members.map((member) => {
            const isSelf = member.user_id === currentUser.id;

            return (
              <div 
                key={member.id} 
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4 w-full"
              >
                {/* SISI KIRI: Profil Utama (Avatar + Info Nama & Tombol Aksi) */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar Bulat */}
                  <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                    {member.name?.charAt(0)}
                  </div>
                  
                  {/* Blok Nama dan Tombol yang sejajar rapat kiri */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-gray-800 truncate">
                      {member.name}{' '}
                      {isSelf && <span className="text-xs font-normal text-gray-400 ml-1 bg-gray-100 px-1.5 py-0.5 rounded-md">(Anda)</span>}
                    </span>

                    {/* TOMBOL AKSI: Digeser ke Kiri, melekat persis setelah Nama */}
                    {canManageMember && (
                      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                        {!isSelf && (
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100/70 transition-colors"
                            title="Edit Role"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteModal(member)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-100/70 transition-colors"
                          title={isSelf ? 'Keluar dari project' : 'Hapus dari project'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SISI KANAN: Detail Tambahan (Email & Role Badge) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm ml-14 md:ml-0">
                  {/* Email */}
                  <div className="flex items-center gap-1.5 text-gray-500 min-w-0 sm:min-w-[200px]">
                    <Mail size={14} className="text-gray-300 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>

                  {/* Badge Role */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 w-fit ${roleBadge(member.role)}`}>
                    {roleIcon(member.role)}
                    {member.role}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ADD MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title="Add Member">
        <form onSubmit={handleAddMember} className="space-y-5">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold flex items-start gap-3 shadow-sm">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold">Select User</label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full mt-2 p-3 border rounded-2xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
              required
            >
              <option value="">Pilih User</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5 ml-1">Semua user sistem sudah tergabung di proyek ini.</p>
            )}
          </div>
          <div>
            <label className="text-sm font-semibold">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full mt-2 p-3 border rounded-2xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="TeamDeveloper">Team Developer</option>
              <option value="BusinessAnalyst">Business Analyst</option>
              <option value="ProjectOwner">Project Owner</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl font-bold transition-colors">
            Save Member
          </button>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Edit Member">
        <form onSubmit={handleEditMember} className="space-y-5">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full mt-2 p-3 border rounded-2xl bg-white"
            >
              <option value="TeamDeveloper">Team Developer</option>
              <option value="BusinessAnalyst">Business Analyst</option>
              <option value="ProjectOwner">Project Owner</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-2xl font-bold transition-colors">
            Update Member
          </button>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); resetForm(); }} title={selectedMember?.user_id === currentUser.id ? "Keluar dari Project" : "Delete Member"}>
        <div className="space-y-5">
          <p className="text-gray-600">
            {selectedMember?.user_id === currentUser.id
              ? 'Anda akan keluar dari project ini dan kehilangan akses ke seluruh datanya. Yakin ingin melanjutkan?'
              : 'Yakin ingin menghapus member dari project ini?'}
          </p>
          <div className="bg-gray-100 p-4 rounded-2xl">
            <h3 className="font-bold">{selectedMember?.name}</h3>
            <p className="text-sm text-gray-500">{selectedMember?.email}</p>
          </div>
          <button onClick={handleDeleteMember} className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl font-bold transition-colors">
            Hapus Member
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Members;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Search, Filter, Plus, X, User } from 'lucide-react';
import { getUsers, createUser, deleteUser } from '../service/userService';
import '../index.css';

const Users = () => {
  const navigate = useNavigate();
  const [usersData, setUsersData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk pencarian (Search Filter)
  const [searchQuery, setSearchQuery] = useState("");

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'TeamDeveloper',
    gender: 'male' // Default sinkron dengan database enum
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsersData(res.data);
    } catch (err) {
      console.error("GET USERS ERROR:", err);
      if (err?.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Validasi sederhana sebelum hit API
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Nama, Email, dan Password wajib diisi!");
      return;
    }

    try {
      await createUser(newUser);
      setIsModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        role: 'TeamDeveloper',
        gender: 'male'
      });
      alert("Pengguna baru berhasil ditambahkan!");
      fetchUsers();
    } catch (err) {
      console.error("CREATE ERROR:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Gagal menambahkan pengguna baru.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      alert("Pengguna berhasil dihapus.");
      fetchUsers();
    } catch (err) {
      console.error("DELETE ERROR:", err);
      alert(err?.response?.data?.message || "Gagal menghapus pengguna.");
    }
  };

  const confirmDelete = async () => {
    await handleDelete(deleteTarget);
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // LOGIKA FILTER PENCARIAN (Client-side search berdasarkan nama atau email)
  const filteredUsers = usersData.filter((user) => {
    const nameMatch = user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <div className="p-4 md:p-8">
      
      {/* CONTAINER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Manajemen Pengguna
            </h2>
            <p className="text-sm text-gray-400">
              Kelola akun pengguna dalam sistem
            </p>
          </div>

          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Tambah Pengguna
          </Button>
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <button className="px-4 py-2.5 border border-gray-200 rounded-lg flex items-center gap-2 text-sm hover:bg-gray-50">
            <Filter size={16} /> Filter
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              Memuat data pengguna...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              Tidak ada data pengguna yang cocok.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b text-xs uppercase">
                  <th className="py-3 text-left w-12">No</th>
                  <th className="text-left">Nama</th>
                  <th className="text-left">Telepon</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Role</th>
                  <th className="text-center w-20">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-4 text-gray-500">{i + 1}</td>
                    <td className="flex items-center gap-2 font-semibold text-gray-700 py-4">
                      <div className="w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                        <User size={14} />
                      </div>
                      {u.name}
                    </td>
                    <td className="text-gray-600">{u.phone_number || "-"}</td>
                    <td className="text-gray-600">{u.email}</td>
                    <td>
                      <span className="px-3 py-1 text-xs bg-gray-100 rounded-full">
                        {u.role}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => {
                          setDeleteTarget(u.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL CREATE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah User Baru"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nama Lengkap</label>
            <input
              placeholder="Masukkan nama lengkap"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
            <input
              type="email"
              placeholder="contoh@email.com"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
            <input
              placeholder="Masukkan sandi akun"
              type="password"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">No HP</label>
            <input
              placeholder="08xxxxxxxxxx"
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.phone_number}
              onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
            />
          </div>

          {/* PERBAIKAN: Penambahan Opsi Jenis Kelamin yang sebelumnya tertinggal */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Jenis Kelamin</label>
            <select
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.gender}
              onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
            >
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Hak Akses (Role)</label>
            <select
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="Superadmin">Superadmin</option>
              <option value="TeamDeveloper">TeamDeveloper</option>
              <option value="BusinessAnalyst">BusinessAnalyst</option>
              <option value="ProjectOwner">ProjectOwner</option> {/* SINKRONISASI: Koreksi typo 'ProjetOwner' */}
            </select>
          </div>

          <Button className="w-full pt-2.5" type="submit">
            Simpan Pengguna
          </Button>
        </form>
      </Modal>

      {/* MODAL DELETE */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus User"
      >
        <div className="space-y-4 text-center">
          <p className="text-gray-600 text-sm">
            Apakah Anda yakin ingin menghapus user ini secara permanen dari sistem?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-full py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Users;
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom'; // Jika diperlukan untuk navigasi balik
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Search, Filter, Plus, X, User } from 'lucide-react';
import { getUsers, createUser, deleteUser } from '../service/userService';
import '../index.css';

const Users = () => {
  const [usersData, setUsersData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    role: 'TeamDeveloper',
    gender: 'male'
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
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
      fetchUsers();
    } catch (err) {
      console.error("CREATE ERROR:", err?.response?.data || err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (err) {
      console.error("DELETE ERROR:", err);
    }
  };

  const confirmDelete = async () => {
    await handleDelete(deleteTarget);
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 md:p-8"> {/* Padding pengganti layout agar tidak terlalu mepet ke pinggir */}
      
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
              placeholder="Cari nama atau email..."
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
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b text-xs uppercase">
                  <th className="py-3 text-left">No</th>
                  <th className="text-left">Nama</th>
                  <th className="text-left">Telepon</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Role</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {usersData.map((u, i) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-4 text-gray-500">{i + 1}</td>
                    <td className="flex items-center gap-2 font-semibold text-gray-700 py-4">
                      <div className="w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                        <User size={14} />
                      </div>
                      {u.name}
                    </td>
                    <td className="text-gray-600">{u.phone_number}</td>
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
        title="Tambah User"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            placeholder="Nama"
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />
          <input
            placeholder="Email"
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <input
            placeholder="Password"
            type="password"
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <input
            placeholder="No HP"
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            value={newUser.phone_number}
            onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
          />
          <select
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="Superadmin">Superadmin</option>
            <option value="TeamDeveloper">TeamDeveloper</option>
            <option value="BusinessAnalyst">BusinessAnalyst</option>
            <option value="ProjectOwner">ProjetOwner</option>
          </select>
          <Button className="w-full" type="submit">
            Simpan
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
            Yakin ingin menghapus user ini?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-full py-2 border rounded-lg text-sm"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
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
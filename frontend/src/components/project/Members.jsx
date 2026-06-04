import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  UserCircle,
  Shield,
  Briefcase,
  Code2,
  Mail,
  Users
} from 'lucide-react';

import api from '../../api/axios';
import Modal from '../ui/Modal';

const Members = ({ projectId }) => {

  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  const currentUser =
    JSON.parse(localStorage.getItem('user')) || {};

  const [formData, setFormData] = useState({
    user_id: '',
    role: 'TeamDeveloper'
  });

  /* =====================================================
      FETCH MEMBERS
  ===================================================== */

  const fetchMembers = async () => {

    try {

      setLoading(true);

      const res = await api.get(
        `/projects/${projectId}/members`
      );

      setMembers(res.data);

    } catch (err) {

      console.error(
        'GET MEMBERS ERROR:',
        err.response?.data || err.message
      );

    } finally {

      setLoading(false);

    }
  };

  /* =====================================================
      FETCH USERS
  ===================================================== */

  const fetchUsers = async () => {

    try {

      const res = await api.get('/users');

      setUsers(res.data);

    } catch (err) {

      console.error(
        'GET USERS ERROR:',
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {

    fetchMembers();
    fetchUsers();

  }, [projectId]);

  /* =====================================================
      RESET FORM
  ===================================================== */

  const resetForm = () => {

    setFormData({
      user_id: '',
      role: 'TeamDeveloper'
    });

    setSelectedMember(null);
  };

  /* =====================================================
      ADD MEMBER
  ===================================================== */

  const handleAddMember = async (e) => {

    e.preventDefault();

    try {

      await api.post(
        `/projects/${projectId}/members`,
        formData
      );

      setIsAddModalOpen(false);

      resetForm();

      fetchMembers();

    } catch (err) {

      console.error(
        'ADD MEMBER ERROR:',
        err.response?.data || err.message
      );
    }
  };

  /* =====================================================
      EDIT MEMBER
  ===================================================== */

  const handleEditMember = async (e) => {

    e.preventDefault();

    try {

      await api.put(
        `/projects/${projectId}/members/${selectedMember.id}`,
        formData
      );

      setIsEditModalOpen(false);

      resetForm();

      fetchMembers();

    } catch (err) {

      console.error(
        'EDIT MEMBER ERROR:',
        err.response?.data || err.message
      );
    }
  };

  /* =====================================================
      DELETE MEMBER
  ===================================================== */

  const handleDeleteMember = async () => {

    try {

      await api.delete(
        `/projects/${projectId}/members/${selectedMember.id}`
      );

      setIsDeleteModalOpen(false);

      resetForm();

      fetchMembers();

    } catch (err) {

      console.error(
        'DELETE MEMBER ERROR:',
        err.response?.data || err.message
      );
    }
  };

  /* =====================================================
      OPEN EDIT
  ===================================================== */

  const openEditModal = (member) => {

    setSelectedMember(member);

    setFormData({
      user_id: member.user_id,
      role: member.role
    });

    setIsEditModalOpen(true);
  };

  /* =====================================================
      OPEN DELETE
  ===================================================== */

  const openDeleteModal = (member) => {

    setSelectedMember(member);

    setIsDeleteModalOpen(true);
  };

  /* =====================================================
      ROLE STYLE
  ===================================================== */

  const roleBadge = (role) => {

    switch (role) {

      case 'ProjectOwner':
        return 'bg-purple-100 text-purple-700';

      case 'Superadmin':
        return 'bg-red-100 text-red-600';

      case 'BusinessAnalyst':
        return 'bg-blue-100 text-blue-600';

      case 'TeamDeveloper':
        return 'bg-green-100 text-green-600';

      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  /* =====================================================
      ROLE ICON
  ===================================================== */

  const roleIcon = (role) => {

    switch (role) {

      case 'ProjectOwner':
        return <Briefcase size={14} />;

      case 'Superadmin':
        return <Shield size={14} />;

      case 'BusinessAnalyst':
        return <UserCircle size={14} />;

      case 'TeamDeveloper':
        return <Code2 size={14} />;

      default:
        return <UserCircle size={14} />;
    }
  };

  const canManageMember =
    currentUser?.role === 'Superadmin' ||
    currentUser?.role === 'ProjectOwner';

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="p-3 rounded-2xl bg-red-100 text-red-500">
            <Users size={22} />
          </div>

          <div>

            <h2 className="text-2xl font-bold text-gray-800">
              Project Members
            </h2>

            <p className="text-sm text-gray-400">
              Kelola anggota project dan role mereka
            </p>

          </div>

        </div>

        {canManageMember && (

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-semibold"
          >

            <Plus size={18} />

            Add Member

          </button>

        )}

      </div>

      {/* =====================================================
          MEMBER LIST
      ===================================================== */}

      {loading ? (

        <div className="text-center py-20 text-gray-400">
          Loading members...
        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {members.map((member) => (

            <div
              key={member.id}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm"
            >

              <div className="flex items-start justify-between">

                <div>

                  <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center text-xl font-bold">
                    {member.name?.charAt(0)}
                  </div>

                  <h3 className="font-bold text-lg text-gray-800 mt-4">
                    {member.name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">

                    <Mail size={14} />

                    {member.email}

                  </div>

                  <div
                    className={`inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full text-xs font-bold ${roleBadge(member.role)}`}
                  >

                    {roleIcon(member.role)}

                    {member.role}

                  </div>

                </div>

                {canManageMember && (

                  <div className="flex gap-2">

                    {/* EDIT BUTTON */}
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100"
                    >

                      <Edit size={16} />

                    </button>

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() => openDeleteModal(member)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
                    >

                      <Trash2 size={16} />

                    </button>

                  </div>

                )}

              </div>

            </div>

          ))}

        </div>

      )}

      {/* =====================================================
          ADD MODAL
      ===================================================== */}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Member"
      >

        <form
          onSubmit={handleAddMember}
          className="space-y-5"
        >

          <div>

            <label className="text-sm font-semibold">
              Select User
            </label>

            <select
              value={formData.user_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  user_id: e.target.value
                })
              }
              className="w-full mt-2 p-3 border rounded-2xl"
              required
            >

              <option value="">
                Pilih User
              </option>

              {users.map((user) => (

                <option
                  key={user.id}
                  value={user.id}
                >

                  {user.name} - {user.email}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="text-sm font-semibold">
              Role
            </label>

            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value
                })
              }
              className="w-full mt-2 p-3 border rounded-2xl"
            >

              <option value="ProjectOwner">
                Project Owner
              </option>

              <option value="Superadmin">
                Superadmin
              </option>

              <option value="TeamDeveloper">
                Team Developer
              </option>

              <option value="BusinessAnalyst">
                Business Analyst
              </option>

            </select>

          </div>

          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl font-bold"
          >

            Save Member

          </button>

        </form>

      </Modal>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member"
      >

        <form
          onSubmit={handleEditMember}
          className="space-y-5"
        >

          <div>

            <label className="text-sm font-semibold">
              Role
            </label>

            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value
                })
              }
              className="w-full mt-2 p-3 border rounded-2xl"
            >

              <option value="ProjectOwner">
                Project Owner
              </option>

              <option value="Superadmin">
                Superadmin
              </option>

              <option value="TeamDeveloper">
                Team Developer
              </option>

              <option value="BusinessAnalyst">
                Business Analyst
              </option>

            </select>

          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-2xl font-bold"
          >

            Update Member

          </button>

        </form>

      </Modal>

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Member"
      >

        <div className="space-y-5">

          <p className="text-gray-600">
            Yakin ingin menghapus member:
          </p>

          <div className="bg-gray-100 p-4 rounded-2xl">

            <h3 className="font-bold">
              {selectedMember?.name}
            </h3>

            <p className="text-sm text-gray-500">
              {selectedMember?.email}
            </p>

          </div>

          <button
            onClick={handleDeleteMember}
            className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-2xl font-bold"
          >

            Hapus Member

          </button>

        </div>

      </Modal>

    </div>
  );
};

export default Members;
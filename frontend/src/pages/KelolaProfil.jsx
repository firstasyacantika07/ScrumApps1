import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Hash,
  UserCircle
} from 'lucide-react';

import api from '../api/axios';
import Button from '../components/ui/Button';
import '../index.css';

const KelolaProfil = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    gender: "male",
    nik: "",
    alamat: "",
    phone: "",
    email: "",
    password: ""
  });

  // ================= GET USER =================
  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);

    setFormData({
      name: user.name || "",
      // PERBAIKAN: Memastikan format huruf kecil (lowercase) agar cocok dengan value option select ('male'/'female')
      gender: user.gender ? user.gender.toLowerCase().trim() : "male", 
      nik: user.nik || "",
      alamat: user.alamat || "",
      phone: user.phone_number || "",
      email: user.email || "",
      password: ""
    });
  }, [navigate]);

  // ================= HANDLE INPUT =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = localStorage.getItem("user");

      if (!userData) {
        navigate("/login");
        return;
      }

      const user = JSON.parse(userData);

      const payload = {
        name: formData.name,
        email: formData.email,
        gender: formData.gender,
        nik: formData.nik,
        alamat: formData.alamat,
        phone_number: formData.phone,
      };

      if (formData.password?.trim()) {
        payload.password = formData.password;
      }

      // Melakukan HIT ke backend update endpoint
      await api.put(
        `/users/${user.id}`,
        payload
      );

      // Simpan pembaruan data user baru kembali ke localstorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          ...payload,
        })
      );

      alert("Profil berhasil diperbarui!");
      navigate("/dashboard");

    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
        "Gagal memperbarui profil"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl border p-6 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <UserCircle size={32} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Informasi Pribadi
            </h2>
            <p className="text-sm text-gray-400">
              Kelola dan perbarui data akun Anda
            </p>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border p-6 grid grid-cols-1 md:grid-cols-2 gap-5 shadow-sm"
        >

          <InputGroup
            label="Nama Lengkap"
            name="name"
            icon={<User size={16} />}
            value={formData.name}
            onChange={handleChange}
          />

          <InputGroup
            label="Email"
            name="email"
            type="email"
            icon={<Mail size={16} />}
            value={formData.email}
            onChange={handleChange}
          />

          {/* GENDER */}
          <SelectGroup
            label="Jenis Kelamin"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={[
              { label: "Laki-laki", value: "male" },
              { label: "Perempuan", value: "female" }
            ]}
          />

          <InputGroup
            label="NIK"
            name="nik"
            icon={<Hash size={16} />}
            value={formData.nik}
            onChange={handleChange}
          />

          <InputGroup
            label="No. Telepon"
            name="phone"
            icon={<Phone size={16} />}
            value={formData.phone}
            onChange={handleChange}
          />

          {/* ALAMAT */}
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Alamat
            </label>

            <div className="relative">
              <MapPin className="absolute left-4 top-4 text-gray-400" size={16} />

              <textarea
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                className="w-full p-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition"
                rows={4}
              />
            </div>
          </div>

          {/* ACTION */}
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Batal
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};

// ================= INPUT =================
const InputGroup = ({ label, name, icon, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-gray-500 uppercase">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm 
        focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition"
      />
    </div>
  </div>
);

// ================= SELECT =================
const SelectGroup = ({ label, name, value, onChange, options }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-gray-500 uppercase">
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm 
      focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition"
    >
      {options.map((opt, i) => (
        <option 
          key={i} 
          value={opt.value}
          // PERBAIKAN UTAMA: Memaksa opsi ditandai secara eksplisit berdasarkan sinkronisasi state
          selected={value === opt.value}
        >
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default KelolaProfil;
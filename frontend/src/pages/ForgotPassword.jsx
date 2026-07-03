import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import '../index.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Alamat email wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Gagal mengirim tautan reset. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-3">Lupa Kata Sandi</h1>
        <p className="mb-8 text-gray-500">
          Masukkan alamat email Anda untuk menerima tautan atur ulang.
        </p>

        {success ? (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-sm font-semibold">
            Tautan atur ulang kata sandi telah dikirim ke <strong>{email}</strong>.
            Silakan cek kotak masuk (dan folder spam) Anda.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Alamat Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full p-4 mb-8 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D31217] disabled:opacity-60"
            />

            <div className="flex gap-4">
              <Link
                to="/login"
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition text-center"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#D31217] text-white py-4 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-70"
              >
                {isLoading ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
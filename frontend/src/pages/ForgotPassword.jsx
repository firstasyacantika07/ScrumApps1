import { Link } from 'react-router-dom';
import '../index.css';

const ForgotPassword = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-3">Lupa Kata Sandi</h1>
        <p className="mb-8 text-gray-500">Masukkan alamat email Anda untuk menerima tautan atur ulang.</p>
        
        <input 
          type="email" 
          placeholder="Alamat Email" 
          className="w-full p-4 mb-8 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-4">
          <Link to="/login" className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition text-center">
            Batal
          </Link>
          <button className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition">
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
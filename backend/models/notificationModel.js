import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Siapa yang menerima notifikasi ini?
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Isi pesannya (contoh: "Proyek X sudah selesai")
  message: { 
    type: String, 
    required: true 
  },
  
  // Penting untuk ikon lonceng: apakah sudah dilihat user?
  isRead: { 
    type: Boolean, 
    default: false 
  },
  
  // Kategori notifikasi (opsional, untuk membedakan RF-04, RF-13, dll)
  type: { 
    type: String, 
    enum: ['PROJECT_UPDATE', 'SPRINT_REMINDER', 'ASSIGNMENT'],
    required: true 
  },

  // Waktu notifikasi muncul
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export const NotificationModel = mongoose.model('Notification', notificationSchema);
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info as InfoIcon, Mail, Download } from 'lucide-react';

const Info = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const infoItems = [
    {
      title: "Kegunaan Utama Sistem ScrumApps",
      content: "ScrumApps dirancang untuk mempermudah pengelolaan proyek secara kolaboratif menggunakan kerangka kerja Scrum. Pengguna dapat membuat, memantau, dan mengelola tugas dalam proyek sesuai dengan role dan hak akses yang dimiliki."
    },
    {
      title: "Pengguna Sistem",
      content: "Dalam sistem terdapat beberapa pengguna:\n\n- Business Analyst (memberikan requirement dari client)\n- Tim Developer (Backend, Frontend, UI/UX Designer, Software Tester)"
    },
    {
      title: "Hak Akses Pengguna",
      content: "Setiap pengguna memiliki hak akses berbeda:\n\n- Business Analyst: mengelola Vision Board & Backlog\n- Tim Developer: mengerjakan task sesuai sprint"
    },
    {
      title: "Manajemen Vision Board dan Backlog",
      content: "- Vision Board digunakan untuk mendeskripsikan sistem secara terperinci\n- Backlog digunakan untuk mencatat tugas dan prioritas pengembangan"
    },
    {
      title: "Struktur Proyek dan Sprint",
      content: "Proyek terdiri dari beberapa sprint. Setiap sprint berisi task/backlog yang harus diselesaikan dalam periode tertentu untuk membantu pengelolaan waktu dan progres."
    },
    {
      title: "Notifikasi dan Aktivasi Pengguna",
      content: "Sistem memberikan notifikasi untuk perubahan status proyek seperti Done atau Late. Riwayat aktivitas juga dapat dilihat oleh anggota proyek."
    },
    {
      title: "Kontak yang Dapat Dihubungi",
      content: "Jika mengalami kendala, silakan hubungi tim dukungan kami melalui email resmi.",
      link: {
        label: "support@scrumapps.id",
        url: "mailto:tasyaacc7@scrumapps.id",
        icon: <Mail size={14} className="mr-2" />
      }
    },
    {
      title: "Panduan Penggunaan Sistem",
      content: "Pengguna baru dapat mengakses dokumentasi lengkap atau mengikuti tutorial penggunaan sistem yang tersedia untuk memahami alur kerja Scrum di aplikasi ini.",
      link: {
        label: "Download Panduan (PDF)",
        url: "/guide/scrumapps-guide.pdf",
        icon: <Download size={14} className="mr-2" />
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* HEADER SECTION */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
            <InfoIcon size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Pusat Informasi ScrumApps
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto">
            Segala hal yang perlu Anda ketahui tentang sistem, peran pengguna, dan panduan teknis penggunaan aplikasi.
          </p>
        </div>

        {/* ACCORDION CONTAINER */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden transition-all">
          <div className="divide-y divide-slate-100">
            {infoItems.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <div key={index} className="group">
                  {/* TRIGGER */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className={`w-full flex items-center justify-between px-6 sm:px-8 py-6 text-left transition-all duration-300
                    ${isOpen ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 
                        ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                        {isOpen ? <ChevronDown size={20} strokeWidth={2.5} /> : <ChevronRight size={20} strokeWidth={2.5} />}
                      </div>
                      <span className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-300
                        ${isOpen ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.title}
                      </span>
                    </div>
                  </button>

                  {/* CONTENT BODY */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out
                    ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="px-6 sm:px-8 pb-8 pt-2 ml-14 sm:ml-16">
                      <div className="h-px w-full bg-slate-100 mb-6" />
                      <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                        {item.content}
                      </p>

                      {item.link && (
                        <div className="mt-6">
                          <a
                            href={item.link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-5 py-2.5 bg-white border border-blue-200 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 active:scale-95"
                          >
                            {item.link.icon}
                            {item.link.label}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            &copy; 2026 ScrumApps Project Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Info;
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit, Target, Users, ShoppingBag, BarChart3, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

const VisionBoard = ({ projectId }) => {
  const [visions, setVisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    vision: '',
    target_group: '',
    needs: '',
    products: '',
    business_goals: '',
    competitors: ''
  });

  const fetchVisions = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/vision-boards`);
      setVisions(res.data);
    } catch (err) {
      console.error("Error fetching vision boards:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVisions();
  }, [fetchVisions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/projects/vision-boards/${editingId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/vision-boards`, formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchVisions();
    } catch (err) {
      alert("Error saving vision board");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vision board?')) return;
    try {
      await api.delete(`/projects/vision-boards/${id}`);
      fetchVisions();
    } catch (err) {
      alert("Error deleting vision board");
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      vision: item.vision,
      target_group: item.target_group,
      needs: item.needs,
      products: item.products,
      business_goals: item.business_goals,
      competitors: item.competitors
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', vision: '', target_group: '', needs: '',
      products: '', business_goals: '', competitors: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="text-red-500" /> Vision Board
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Product Strategy & Goals</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all"
        >
          <Plus size={18} /> Add Board
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 animate-pulse">Loading boards...</div>
      ) : (
        <div className="grid gap-8">
          {visions.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
              {/* Header Card */}
              <div className="bg-slate-50 px-8 py-4 flex justify-between items-center border-b border-slate-100">
                <h3 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{item.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEditClick(item)} className="p-2 bg-white rounded-xl text-blue-500 shadow-sm hover:bg-blue-50 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 bg-white rounded-xl text-red-500 shadow-sm hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid md:grid-cols-4 gap-px bg-slate-100">
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><Target size={14} className="text-red-500"/> Vision</label>
                  <div className="text-slate-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.vision }} />
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><Users size={14} className="text-blue-500"/> Target Group</label>
                  <div className="text-slate-600 text-sm" dangerouslySetInnerHTML={{ __html: item.target_group }} />
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShoppingBag size={14} className="text-emerald-500"/> Needs</label>
                  <div className="text-slate-600 text-sm" dangerouslySetInnerHTML={{ __html: item.needs }} />
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShoppingBag size={14} className="text-orange-500"/> Products</label>
                  <div className="text-slate-600 text-sm" dangerouslySetInnerHTML={{ __html: item.products }} />
                </div>
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><BarChart3 size={14} className="text-purple-500"/> Business Goals</label>
                  <div className="text-slate-600 text-sm" dangerouslySetInnerHTML={{ __html: item.business_goals }} />
                </div>
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShieldAlert size={14} className="text-amber-500"/> Competitors</label>
                  <div className="text-slate-600 text-sm" dangerouslySetInnerHTML={{ __html: item.competitors }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Vision Board Editor">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Board Name</label>
            <input
              required
              placeholder="Versi 1.0"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Vision</label>
              <textarea
                value={formData.vision}
                onChange={(e) => setFormData({...formData, vision: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Target Group</label>
              <textarea
                value={formData.target_group}
                onChange={(e) => setFormData({...formData, target_group: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Needs</label>
              <textarea
                value={formData.needs}
                onChange={(e) => setFormData({...formData, needs: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Products</label>
              <textarea
                value={formData.products}
                onChange={(e) => setFormData({...formData, products: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Competitors</label>
              <textarea
                value={formData.competitors}
                onChange={(e) => setFormData({...formData, competitors: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase">Business Goals</label>
              <textarea
                value={formData.business_goals}
                onChange={(e) => setFormData({...formData, business_goals: e.target.value})}
                className="w-full p-3 bg-slate-50 border rounded-2xl h-24"
              />
            </div>
          </div>

          <button className="w-full bg-red-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-colors sticky bottom-0 shadow-lg">
            Save Vision Board
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default VisionBoard;
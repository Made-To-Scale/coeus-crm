import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Megaphone, Plus, Mail, Activity,
    ChevronRight, ExternalLink, RefreshCw,
    Send, AlertCircle, CheckCircle2, Clock, X, MapPin, Star, Target
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
                {icon}
            </div>
        </div>
    </div>
);

const OutreachView = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [stats, setStats] = useState(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newHypothesis, setNewHypothesis] = useState({
        city: '',
        icp: '',
        tier: 'GOLD',
        source: 'Google Maps',
        version: 1
    });

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaign) {
            fetchCampaignStats(selectedCampaign.id);
        }
    }, [selectedCampaign]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/outreach/campaigns`);
            if (!response.ok) throw new Error('Failed to fetch campaigns');
            const data = await response.json();
            setCampaigns(data);
            if (data.length > 0 && !selectedCampaign) {
                setSelectedCampaign(data[0]);
            }
        } catch (err) {
            console.error('Error fetching campaigns:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignStats = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/outreach/campaigns/${id}/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await fetch(`${API_URL}/api/outreach/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hypothesis: newHypothesis })
            });

            if (!response.ok) throw new Error('Error al crear campaña');

            const created = await response.json();
            setCampaigns([created, ...campaigns]);
            setSelectedCampaign(created);
            setShowCreateModal(false);
            setNewHypothesis({ city: '', icp: '', tier: 'GOLD', source: 'Google Maps', version: 1 });
        } catch (err) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="text-slate-400 flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin" size={32} />
                    <p className="font-bold">Cargando sistema de outreach...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outreach System</h1>
                    <p className="text-slate-500 font-medium mt-1 italic">Conectado con Instantly.ai | Modo SIMULATION</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={20} /> Nueva Campaña
                </button>
            </div>

            {/* Grid de Stats Global */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Campañas" value={campaigns.length} icon={<Megaphone size={24} />} color="bg-blue-500" />
                <StatCard title="Leads Enviados" value={stats?.enrolled || '--'} icon={<Send size={24} />} color="bg-indigo-500" />
                <StatCard title="Aperturas" value={stats?.opened !== undefined ? `${stats.opened}` : '--'} icon={<Activity size={24} />} color="bg-emerald-500" />
                <StatCard title="Respuestas" value={stats?.replied !== undefined ? `${stats.replied}` : '--'} icon={<Mail size={24} />} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Campañas */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} /> Campañas Recientes
                    </h2>
                    <div className="space-y-3">
                        {campaigns.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCampaign(c)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer group ${selectedCampaign?.id === c.id
                                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500'
                                    : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[150px]">{c.name.replace('EMAIL_ES_', '')}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                    {c.hypothesis?.city && <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{c.hypothesis.city}</span>}
                                    {c.hypothesis?.tier && <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{c.hypothesis.tier}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detalle de Campaña */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedCampaign ? (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{selectedCampaign.name}</h2>
                                        <p className="text-xs text-slate-400 font-medium">ID: {selectedCampaign.id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fetchCampaignStats(selectedCampaign.id)}
                                            className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">Lanzar Batch</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Enrolados</p>
                                        <p className="text-xl font-black text-slate-900">{stats?.enrolled || 0}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Abr.</p>
                                        <p className="text-xl font-black text-slate-900">{stats?.enrolled > 0 ? Math.round((stats.opened / stats.enrolled) * 100) : 0}%</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resp.</p>
                                        <p className="text-xl font-black text-slate-900">{stats?.enrolled > 0 ? Math.round((stats.replied / stats.enrolled) * 100) : 0}%</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bounced</p>
                                        <p className="text-xl font-black text-red-600">{stats?.bounced || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Hipótesis Comercial</h3>
                                        <p className="text-sm text-slate-400 italic">Target: {selectedCampaign.hypothesis?.icp || 'Sin definición'} en {selectedCampaign.hypothesis?.city}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Estado del Embudo</h4>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-bold text-slate-800">Hay leads preparados para envío</p>
                                            <p className="text-sm text-slate-400">Las personalizaciones AI se generan al lanzar el batch.</p>
                                        </div>
                                        <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-white/50 transition-colors">Configurar Batch</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                            <div className="max-w-xs space-y-4">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-slate-300">
                                    <Megaphone size={32} />
                                </div>
                                <h3 className="font-bold text-slate-800">Selecciona una campaña</h3>
                                <p className="text-sm text-slate-500">Haz clic en una campaña de la lista para ver su rendimiento y gestionar los envíos.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Creación Campaña */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !creating && setShowCreateModal(false)}></div>
                    <form onSubmit={handleCreateCampaign} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Nueva Hipótesis</h2>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5"><Target size={12} /> Nicho / ICP</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="ej: Farmacias, Centros de Estética..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newHypothesis.icp}
                                    onChange={e => setNewHypothesis({ ...newHypothesis, icp: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5"><MapPin size={12} /> Ciudad</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="ej: Madrid, Barcelona..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newHypothesis.city}
                                        onChange={e => setNewHypothesis({ ...newHypothesis, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-widest flex items-center gap-1.5"><Star size={12} /> Tier</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        value={newHypothesis.tier}
                                        onChange={e => setNewHypothesis({ ...newHypothesis, tier: e.target.value })}
                                    >
                                        <option value="GOLD">🏆 GOLD</option>
                                        <option value="SILVER">🥈 SILVER</option>
                                        <option value="BRONZE">🥉 BRONZE</option>
                                        <option value="WHATSAPP">🟢 WHATSAPP</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-2">Nombre Generado</p>
                                <code className="text-xs font-black text-blue-800">
                                    EMAIL_ES_{(newHypothesis.city || 'CITY').toUpperCase()}_{(newHypothesis.icp || 'ICP').toUpperCase()}_GOOGLEMAPS_{newHypothesis.tier}_V1
                                </code>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-400 hover:bg-white hover:text-slate-600 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-[2] bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {creating ? 'Creando...' : 'Crear Hipótesis'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default OutreachView;

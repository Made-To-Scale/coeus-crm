import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    Megaphone, Plus, Mail, Activity,
    ChevronRight, ExternalLink, RefreshCw,
    Send, AlertCircle, CheckCircle2, Clock
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

    useEffect(() => {
        fetchCampaigns();
    }, []);

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
                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                    <Plus size={20} /> Nueva Campaña
                </button>
            </div>

            {/* Grid de Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Campañas" value={campaigns.length} icon={<Megaphone size={24} />} color="bg-blue-500" />
                <StatCard title="Leads Enviados" value="6" icon={<Send size={24} />} color="bg-indigo-500" />
                <StatCard title="Aperturas" value="--" icon={<Activity size={24} />} color="bg-emerald-500" />
                <StatCard title="Respuestas" value="--" icon={<Mail size={24} />} color="bg-amber-500" />
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
                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {c.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
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
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedCampaign.name}</h2>
                                    <div className="flex gap-2">
                                        <button className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"><RefreshCw size={18} /></button>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all">Lanzar Batch</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Enviados</p>
                                        <p className="text-xl font-black text-slate-900">0</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Abr.</p>
                                        <p className="text-xl font-black text-slate-900">0%</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Click.</p>
                                        <p className="text-xl font-black text-slate-900">0%</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resp.</p>
                                        <p className="text-xl font-black text-slate-900">0%</p>
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
                                        <p className="text-sm text-slate-400">{selectedCampaign.hypothesis?.icp || 'Sin definición de ICP'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Leads en esta campaña</h4>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-bold text-slate-800">Hay 6 leads preparados para envío</p>
                                            <p className="text-sm text-slate-400">Personalizaciones AI completadas y validadas.</p>
                                        </div>
                                        <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-white/50 transition-colors">Ver Todos</button>
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
        </div>
    );
};

export default OutreachView;

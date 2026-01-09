import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { BarChart3, Users, Mail, Activity, ArrowUpRight, Play, Database } from 'lucide-react'

// Helper for fetching backend API
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

function StatCard({ title, value, subtext, icon, color }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-3xl font-black text-slate-900 leading-tight">{value}</p>
                {subtext && <p className="text-[10px] font-medium text-slate-500 mt-1">{subtext}</p>}
            </div>
            <div className={`p-4 rounded-xl ${color} text-white shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all`}>
                {icon}
            </div>
        </div>
    )
}

function RecentActivity() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-slate-400" /> System Activity
            </h3>
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500"></div>
                    <div>
                        <div className="text-sm font-medium text-slate-800">New stats endpoint deployed</div>
                        <div className="text-xs text-slate-400">Just now</div>
                    </div>
                </div>
                <div className="flex items-start gap-3 opacity-60">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-300"></div>
                    <div>
                        <div className="text-sm font-medium text-slate-800">Lead enrichment job completed</div>
                        <div className="text-xs text-slate-400">1 hour ago</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DashboardView() {
    const [stats, setStats] = useState({ total_leads: 0, tier_a: 0, tier_b: 0, active_runs: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/api/stats`)
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
                <p className="text-slate-500 font-medium">Overview of your outreach operations.</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Leads"
                    value={stats.total_leads}
                    subtext="All stored businesses"
                    icon={<Database size={24} />}
                    color="bg-slate-800"
                />
                <StatCard
                    title="Tier A Opportunities"
                    value={stats.tier_a}
                    subtext="Verified Email Ready"
                    icon={<Users size={24} />}
                    color="bg-gradient-to-br from-indigo-500 to-purple-600"
                />
                <StatCard
                    title="Tier B Prospects"
                    value={stats.tier_b}
                    subtext="Phone Outreach Only"
                    icon={<BarChart3 size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Active Scrapes"
                    value={stats.active_runs}
                    subtext="Jobs processing now"
                    icon={<Play size={24} />}
                    color="bg-emerald-500"
                />
            </div>

            {/* Context/Quick Actions Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:bg-blue-500/30 transition-all duration-700"></div>

                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="text-xs font-black text-blue-300 uppercase tracking-widest mb-2">Simulated Outreach</div>
                            <h2 className="text-3xl font-bold text-white mb-4">Instantly.ai Integration Ready</h2>
                            <p className="text-slate-300 max-w-md leading-relaxed">
                                Your outreach sequences are currently running in <strong>simulation mode</strong>. Leads enrolled from the Leads view will trigger a mock API call, allowing you to verify the data payload before going live.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mt-8">
                            <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                                <ArrowUpRight size={16} /> View Documentation
                            </button>
                            <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10 text-xs font-medium text-white/70">
                                Current Mode: <span className="text-white font-bold">Safe / Dev</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <RecentActivity />
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { Megaphone, Plus, Users, Mail, MousePointerClick, Reply, XCircle, TrendingUp, Play, Pause } from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

function CampaignCard({ campaign, onClick }) {
    const stats = campaign.stats || {}

    return (
        <div
            onClick={() => onClick(campaign)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {campaign.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {campaign.status}
                        </span>
                        {campaign.instantly_campaign_id?.startsWith('SIM_') && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                SIMULATION
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Megaphone size={20} />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center">
                    <div className="text-2xl font-black text-slate-900">{stats.total || 0}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Enrolled</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-blue-600">{stats.opened || 0}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Opened</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-green-600">{stats.replied || 0}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Replied</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-red-600">{stats.bounced || 0}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Bounced</div>
                </div>
            </div>
        </div>
    )
}

export default function CampaignsView() {
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newCampaign, setNewCampaign] = useState({ name: '', settings: {} })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchCampaigns()
    }, [])

    async function fetchCampaigns() {
        try {
            const res = await fetch(`${API_URL}/api/campaigns`)
            if (res.ok) {
                const data = await res.json()
                setCampaigns(data)
            }
        } catch (err) {
            console.error('Failed to fetch campaigns:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateCampaign(e) {
        e.preventDefault()
        if (!newCampaign.name) return

        setCreating(true)
        try {
            const res = await fetch(`${API_URL}/api/campaigns/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCampaign)
            })

            if (res.ok) {
                const campaign = await res.json()
                setCampaigns([campaign, ...campaigns])
                setNewCampaign({ name: '', settings: {} })
                setShowCreateForm(false)
            }
        } catch (err) {
            console.error('Failed to create campaign:', err)
        } finally {
            setCreating(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading campaigns...</div>

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outreach Campaigns</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage your email sequences and enrollments</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                    <Plus size={18} /> New Campaign
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateCampaign} className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900">Create New Campaign</h3>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Campaign Name</label>
                        <input
                            type="text"
                            required
                            value={newCampaign.name}
                            onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Magnesium Launch - Farmacias"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            )}

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Campaigns Yet</h3>
                    <p className="text-slate-500 text-sm mb-6">Create your first outreach campaign to start enrolling leads.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                    >
                        <Plus size={18} /> Create Campaign
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(campaign => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            onClick={(c) => console.log('Campaign clicked:', c)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

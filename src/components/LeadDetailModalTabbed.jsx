import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ExternalLink, Mail, Phone, MapPin, Star, TrendingUp, Activity, X, Send, Globe, Users, CheckCircle2 } from 'lucide-react'

export function LeadDetailModalTabbed({ lead, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('detail')
    const [channels, setChannels] = useState([])
    const [extraContacts, setExtraContacts] = useState([])
    const [enrollment, setEnrollment] = useState(null)
    const [events, setEvents] = useState([])

    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

    useEffect(() => {
        if (lead?.id) {
            fetchData()
        }
    }, [lead])

    async function fetchData() {
        try {
            const [channelsRes, contactsRes, enrollmentRes, eventsRes] = await Promise.all([
                supabase.from('lead_channels').select('*').eq('lead_id', lead.id),
                supabase.from('contacts').select('*').eq('lead_id', lead.id),
                supabase.from('batch_leads').select('*, batches(campaign_id, campaigns(name))').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1),
                supabase.from('outreach_events').select('*').eq('lead_id', lead.id).order('occurred_at', { ascending: false })
            ])

            setChannels(channelsRes.data || [])
            setExtraContacts(contactsRes.data || [])
            setEnrollment(enrollmentRes.data?.[0] || null)
            setEvents(eventsRes.data || [])
        } catch (err) {
            console.error('Error fetching lead data:', err)
        }
    }

    const renderScoringBreakdown = () => {
        const scoreDetail = lead.score_detail || {}
        const reasons = scoreDetail.reasons || []

        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-6 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Scoring Breakdown
                </h3>

                <div className="space-y-4">
                    {reasons.map((item, idx) => {
                        // Handle both string format "Label +10" and object format {reason: "Label", points: 10}
                        let label, points

                        if (typeof item === 'string') {
                            const match = item.match(/(.+?)\s*\+(\d+)/)
                            if (!match) return null
                            label = match[1].trim()
                            points = parseInt(match[2])
                        } else if (item && typeof item === 'object') {
                            label = item.reason || ''
                            points = item.points || 0
                        } else {
                            return null
                        }

                        const percentage = Math.min((points / 100) * 100, 100)

                        return (
                            <div key={idx}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-slate-700">{label}</span>
                                    <span className="text-lg font-black text-emerald-600">+{points}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}

                    <div className="pt-4 mt-4 border-t border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-slate-900 uppercase">Total Score</span>
                            <span className="text-3xl font-black text-rose-600">{lead.lead_score || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black">{lead.business_name}</h2>
                            <div className="flex items-center gap-3 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    {lead.city}
                                </span>
                                {lead.lead_tier && (
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-black ${lead.lead_tier === 'GOLD' ? 'bg-amber-500' :
                                        lead.lead_tier === 'SILVER' ? 'bg-slate-400' :
                                            'bg-emerald-500'
                                        }`}>
                                        {lead.lead_tier}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border-b border-slate-200 px-6">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('detail')}
                            className={`px-6 py-3 font-bold text-sm transition-all ${activeTab === 'detail'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Detalle
                        </button>
                        <button
                            onClick={() => setActiveTab('outreach')}
                            className={`px-6 py-3 font-bold text-sm transition-all ${activeTab === 'outreach'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Outreach
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'detail' ? (
                        <>
                            {/* 1. AI Intelligence */}
                            {lead.meta?.ai_summary_deep && (
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Activity size={16} />
                                        AI Intelligence
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{lead.meta.ai_summary_deep}</p>

                                    {lead.meta.contexto_personalizado && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <p className="text-xs font-bold text-blue-900 mb-1">Contexto Personalizado</p>
                                            <p className="text-sm text-blue-700">{lead.meta.contexto_personalizado}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. Decision Makers & Channels */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Users size={16} />
                                    Decision Makers & Channels
                                </h3>

                                <div className="space-y-3">
                                    {channels.map(channel => (
                                        <div key={channel.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            {channel.type === 'email' ? <Mail size={16} className="text-blue-600" /> : <Phone size={16} className="text-emerald-600" />}
                                            <div className="flex-1">
                                                <div className="font-bold text-sm text-slate-900">{channel.value}</div>
                                                {channel.meta?.name && (
                                                    <div className="text-xs text-slate-500">{channel.meta.name} • {channel.meta.role}</div>
                                                )}
                                            </div>
                                            {channel.is_primary && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">Primary</span>
                                            )}
                                        </div>
                                    ))}

                                    {extraContacts.map(contact => (
                                        <div key={contact.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <Mail size={16} className="text-slate-400" />
                                            <div className="flex-1">
                                                <div className="font-bold text-sm text-slate-900">{contact.name}</div>
                                                <div className="text-xs text-slate-500">{contact.role} • {contact.email}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Website */}
                            {lead.website && (
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <Globe size={16} />
                                        Website
                                    </h3>
                                    <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                                    >
                                        {lead.website}
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* 4. Scoring Breakdown */}
                            {renderScoringBreakdown()}
                        </>
                    ) : (
                        <>
                            {/* Outreach Tab */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Send size={16} />
                                    Campaign Enrollment
                                </h3>

                                {enrollment ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 size={18} className="text-green-600" />
                                                <span className="font-bold text-green-900">Enrolled in Campaign</span>
                                            </div>
                                            <div className="text-sm text-green-700">
                                                Status: <span className="font-bold">{enrollment.enrollment_status}</span>
                                            </div>
                                            <div className="text-sm text-green-700">
                                                Personalization: <span className="font-bold">{enrollment.personalization_status}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-600">This lead is not enrolled in any campaign yet.</p>
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-xs text-blue-700 mb-2">
                                                💡 To enroll this lead, create a batch in the Outreach section and add leads based on filters.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Activity size={16} />
                                    Activity Timeline
                                </h3>

                                {events.length > 0 ? (
                                    <div className="space-y-3">
                                        {events.map(event => (
                                            <div key={event.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                                                <div className="text-xs text-slate-500 w-24">{new Date(event.occurred_at).toLocaleDateString()}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-900">{event.event_type}</div>
                                                    <div className="text-xs text-slate-500">{event.provider}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No activity yet</p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

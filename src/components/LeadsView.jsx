import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ExternalLink, Mail, Phone, MapPin, Star, TrendingUp, Activity } from 'lucide-react'

function Timeline({ leadId }) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (leadId) fetchEvents()
    }, [leadId])

    async function fetchEvents() {
        setLoading(true)
        const { data, error } = await supabase
            .from('comm_events')
            .select('*')
            .eq('lead_id', leadId)
            .order('occurred_at', { ascending: false })

        if (!error) setEvents(data || [])
        setLoading(false)
    }

    if (loading) return <div className="text-sm text-slate-400">Loading history...</div>
    if (events.length === 0) return <div className="text-sm text-slate-400 italic">No activity recorded yet.</div>

    return (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-100">
            {events.map((event) => (
                <div key={event.id} className="relative group">
                    <div className={`absolute -left-[1.375rem] w-4 h-4 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125 ${event.event_type === 'sent' ? 'bg-blue-500' :
                            event.event_type === 'opened' ? 'bg-purple-500' :
                                event.event_type === 'clicked' ? 'bg-cyan-500' :
                                    event.event_type === 'replied' ? 'bg-green-500' :
                                        event.event_type === 'bounced' ? 'bg-red-500' :
                                            'bg-slate-400'
                        }`}></div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1 select-none">
                        {new Date(event.occurred_at).toLocaleDateString()} · {new Date(event.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-sm">
                        <span className="font-bold text-slate-800 capitalize">{event.event_type.replace('_', ' ')}</span>
                        <span className="text-slate-500"> via </span>
                        <span className="font-medium text-slate-700 capitalize">{event.provider}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function LeadsView() {
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null)

    useEffect(() => {
        fetchLeads()
    }, [])

    async function fetchLeads() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setLeads(data || [])
        } catch (err) {
            console.error('Error fetching leads:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-6">Loading leads...</div>
    if (error) return <div className="p-6 text-red-600">Error: {error}</div>

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Leads</h1>
                <div className="text-sm text-slate-600">
                    Total: <span className="font-semibold">{leads.length}</span>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score/Tier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {leads.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-slate-500">No leads found.</td></tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{lead.business_name || 'N/A'}</div>
                                            {lead.domain && (
                                                <div className="text-xs text-slate-500">{lead.domain}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900">{lead.city || 'N/A'}</div>
                                            {lead.country && (
                                                <div className="text-xs text-slate-500">{lead.country}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {lead.lead_score && (
                                                    <span className="text-sm font-semibold text-slate-900">{lead.lead_score}</span>
                                                )}
                                                {lead.lead_tier && (
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${lead.lead_tier === 'A' ? 'bg-green-100 text-green-800' :
                                                        lead.lead_tier === 'B' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        Tier {lead.lead_tier}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {lead.email && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                                        <Mail size={12} />
                                                        <span className="truncate max-w-[150px]">{lead.email}</span>
                                                    </div>
                                                )}
                                                {lead.phone_number && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                                        <Phone size={12} />
                                                        <span>{lead.phone_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.routing_status && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${lead.routing_status === 'OUTREACH_READY' ? 'bg-green-100 text-green-800' :
                                                    lead.routing_status === 'ENRICH' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-slate-100 text-slate-800'
                                                    }`}>
                                                    {lead.routing_status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.rating && (
                                                <div className="flex items-center gap-1">
                                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">{lead.rating}</span>
                                                    {lead.reviews_count && (
                                                        <span className="text-xs text-slate-500">({lead.reviews_count})</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedLead(lead)
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}
        </div>
    )
}

function LeadDetailModal({ lead, onClose }) {
    const [channels, setChannels] = useState([])
    const [loadingChannels, setLoadingChannels] = useState(false)

    useEffect(() => {
        if (lead && lead.id) {
            fetchChannels()
        }
    }, [lead])

    async function fetchChannels() {
        try {
            setLoadingChannels(true)
            const { data, error } = await supabase
                .from('lead_channels')
                .select('*')
                .eq('lead_id', lead.id)
                .order('is_primary', { ascending: false })

            if (error) throw error
            setChannels(data || [])
        } catch (err) {
            console.error('Error fetching channels:', err)
        } finally {
            setLoadingChannels(false)
        }
    }

    const renderScoreItem = (label, value) => {
        const isPositive = value.toString().startsWith('+')
        return (
            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 capitalize">{label.replace('_', ' ')}</span>
                <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-slate-700'}`}>
                    {value}
                </span>
            </div>
        )
    }

    const renderEnrichmentItem = (label, isMissing) => {
        return (
            <div key={label} className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm ${isMissing
                ? 'bg-red-50 border-red-100 text-red-700'
                : 'bg-green-50 border-green-100 text-green-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isMissing ? 'bg-red-400' : 'bg-green-400'}`}></div>
                <span className="capitalize">{label.replace('missing_', '').replace('_', ' ')}</span>
                <span className="ml-auto font-medium">{isMissing ? 'Missing' : 'Found'}</span>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">{lead.business_name}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Personalization & Icebreaker */}
                    {(lead.personalization_summary || lead.icebreaker) && (
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 shadow-sm">
                            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                                <Activity size={20} className="text-blue-500" />
                                AI Personalization
                            </h3>
                            {lead.personalization_summary && (
                                <div className="mb-4">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-tight mb-1">Business Summary</div>
                                    <p className="text-slate-700 text-sm italic leading-relaxed">"{lead.personalization_summary}"</p>
                                </div>
                            )}
                            {lead.icebreaker && (
                                <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-tight mb-2">Draft Icebreaker</div>
                                    <p className="text-slate-800 text-sm font-medium">"{lead.icebreaker}"</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lead Score</div>
                            <div className="text-3xl font-bold text-blue-600">{lead.lead_score || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Company Tier</div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-slate-400" size={18} />
                                <div className="text-3xl font-bold text-slate-900">Tier {lead.lead_tier || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Timeline */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Activity size={20} className="text-green-500" />
                                Unified Timeline
                            </h3>
                            <Timeline leadId={lead.id} />
                        </div>

                        {/* Contacts & Location */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Phone size={20} className="text-blue-500" />
                                    Channels
                                </h3>
                                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                                    {lead.email && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Mail size={16} className="text-blue-500" />
                                                <span className="text-sm font-medium text-slate-700">{lead.email}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">MAIN</span>
                                        </div>
                                    )}
                                    {lead.phone_number && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Phone size={16} className="text-blue-500" />
                                                <span className="text-sm font-medium text-slate-700">{lead.phone_number}</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">MAIN</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <MapPin size={20} className="text-red-500" />
                                    Location
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="text-slate-700 font-medium mb-1">{lead.address || 'No address provided'}</div>
                                    <div className="text-sm text-slate-500">{lead.city}{lead.city && lead.country ? ', ' : ''}{lead.country}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Score Breakdown</h3>
                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden p-2">
                                {lead.score_detail?.reasons ? (
                                    lead.score_detail.reasons.map(reason => {
                                        const [label, val] = reason.includes(':') ? reason.split(':') : [reason, '']
                                        return renderScoreItem(label, val)
                                    })
                                ) : <div className="p-4 text-sm text-slate-500 italic text-center">No details</div>}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Enrichment Status</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {lead.enrichment_needed ? (
                                    Object.entries(lead.enrichment_needed).map(([key, val]) => renderEnrichmentItem(key, val))
                                ) : <div className="p-4 text-sm text-slate-500 italic text-center">Unknown</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

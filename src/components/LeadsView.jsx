import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ExternalLink, Mail, Phone, MapPin, Star, TrendingUp } from 'lucide-react'

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

            {/* Lead Detail Modal */}
            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}
        </div>
    )
}

function LeadDetailModal({ lead, onClose }) {
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

                <div className="p-6 space-y-6">
                    {/* Score & Status */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Score</div>
                            <div className="text-2xl font-bold text-slate-900">{lead.lead_score || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Tier</div>
                            <div className="text-2xl font-bold text-slate-900">{lead.lead_tier || 'N/A'}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Status</div>
                            <div className="text-sm font-medium text-slate-900">{lead.routing_status || 'N/A'}</div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {lead.email && (
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-slate-400" />
                                    <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                                </div>
                            )}
                            {lead.phone_number && (
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-slate-400" />
                                    <span className="text-slate-700">{lead.phone_number}</span>
                                    {lead.phone_type && (
                                        <span className="text-xs text-slate-500">({lead.phone_type})</span>
                                    )}
                                </div>
                            )}
                            {lead.website && (
                                <div className="flex items-center gap-2">
                                    <ExternalLink size={16} className="text-slate-400" />
                                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                        {lead.domain || lead.website}
                                    </a>
                                </div>
                            )}
                            {lead.whatsapp_likely && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">WhatsApp Available</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {lead.address && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Location</h3>
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-slate-400 mt-1" />
                                <div>
                                    <div className="text-slate-700">{lead.address}</div>
                                    <div className="text-sm text-slate-500">{lead.city}, {lead.country}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rating & Reviews */}
                    {lead.rating && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Reviews</h3>
                            <div className="flex items-center gap-2">
                                <Star size={20} className="text-yellow-500 fill-yellow-500" />
                                <span className="text-xl font-bold">{lead.rating}</span>
                                <span className="text-slate-500">({lead.reviews_count || 0} reviews)</span>
                            </div>
                        </div>
                    )}

                    {/* Score Details */}
                    {lead.score_detail && Object.keys(lead.score_detail).length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Score Breakdown</h3>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap">{JSON.stringify(lead.score_detail, null, 2)}</pre>
                            </div>
                        </div>
                    )}

                    {/* Enrichment Needed */}
                    {lead.enrichment_needed && Object.keys(lead.enrichment_needed).length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">Enrichment Status</h3>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap">{JSON.stringify(lead.enrichment_needed, null, 2)}</pre>
                            </div>
                        </div>
                    )}

                    {/* Full Lead Data (Debug) */}
                    {lead.lead_clean && Object.keys(lead.lead_clean).length > 0 && (
                        <details className="border border-slate-200 rounded-lg">
                            <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50">
                                View Full Lead Data
                            </summary>
                            <div className="p-4 bg-slate-50">
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(lead.lead_clean, null, 2)}</pre>
                            </div>
                        </details>
                    )}
                </div>
            </div>
        </div>
    )
}

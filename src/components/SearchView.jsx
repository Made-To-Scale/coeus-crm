import { useState, useEffect } from 'react'
import { Search, History, Play, Trash2, Database, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function SearchView() {
    const [businessType, setBusinessType] = useState('')
    const [city, setCity] = useState('')
    const [count, setCount] = useState(20)

    const [loading, setLoading] = useState(false)
    const [runs, setRuns] = useState([])
    const [status, setStatus] = useState(null)

    useEffect(() => {
        fetchRuns()
        const interval = setInterval(fetchRuns, 5000) // Poll every 5s for updates
        return () => clearInterval(interval)
    }, [])

    async function fetchRuns() {
        const { data, error } = await supabase
            .from('scrape_runs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (!error && data) {
            setRuns(data)
        }
    }

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!businessType.trim() || !city.trim()) return

        setLoading(true)
        setStatus(null)

        try {
            // Call our own backend endpoint
            const response = await fetch(`${API_URL}/api/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_type: businessType,
                    city: city,
                    limit: parseInt(count, 10),
                    timestamp: Date.now()
                })
            })

            const resData = await response.json()

            if (!response.ok) throw new Error(resData.error || 'Failed to trigger search')

            setStatus({ type: 'success', message: 'Search launched successfully! The system is now scraping and enriching.' })
            setBusinessType('')
            setCity('')
            fetchRuns() // Refresh list immediately
        } catch (err) {
            console.error(err)
            setStatus({ type: 'error', message: 'Failed to launch: ' + err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto h-full flex flex-col">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                        <Search size={32} />
                    </div>
                    Search Dashboard
                </h1>
                <p className="mt-2 text-slate-600">Launch new targeted scraping campaigns and monitor their progress in real-time.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                {/* Search Form Panel */}
                <div className="lg:col-span-1 flex flex-col">
                    <div className="bg-white p-6 rounded-2xl shadow-lg shadow-blue-50 border border-slate-100 flex-1">
                        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Play size={20} className="text-blue-500" />
                            Launch New Search
                        </h2>

                        <form onSubmit={handleSearch} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Business Type / Keyword</label>
                                <input
                                    type="text"
                                    value={businessType}
                                    onChange={(e) => setBusinessType(e.target.value)}
                                    placeholder="e.g. Wellness Clinics"
                                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">City / Location</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="e.g. Madrid"
                                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Max Results</label>
                                <input
                                    type="number"
                                    value={count}
                                    onChange={(e) => setCount(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    min="1"
                                    max="500"
                                />
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl text-sm font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                    {status.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${loading
                                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                    }`}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                                {loading ? 'Initializing...' : 'Start Extraction'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History & Progress Panel */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <History size={20} className="text-slate-400" />
                                Active & Recent Searches
                            </h2>
                            <div className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
                                Live Updates
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {runs.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <Database size={48} className="mx-auto mb-4 text-slate-300" />
                                    <p className="font-medium text-slate-500">No search history found.</p>
                                </div>
                            ) : (
                                runs.map(run => {
                                    const status = run.config?.status || 'UNKNOWN'
                                    const totalLeads = run.config?.total_leads || 0
                                    const targetLimit = run.config?.limit || totalLeads || 20

                                    // State progression
                                    const isScraping = status === 'SCRAPING'
                                    const isEnriching = status === 'ENRICHING'
                                    const isAIProcessing = status === 'AI_ANALYSIS'
                                    const isCompleted = status === 'COMPLETED'
                                    const isRunning = isScraping || isEnriching || isAIProcessing

                                    // Progress calculation
                                    let progressPercent = 0
                                    let progressLabel = ''
                                    if (isScraping) {
                                        progressPercent = 20
                                        progressLabel = 'Scraping Google Maps...'
                                    } else if (isEnriching) {
                                        progressPercent = 50
                                        progressLabel = 'Enriching contacts...'
                                    } else if (isAIProcessing) {
                                        progressPercent = 80
                                        progressLabel = 'AI Intelligence...'
                                    } else if (isCompleted) {
                                        progressPercent = 100
                                        progressLabel = '100% Complete'
                                    }

                                    return (
                                        <div
                                            key={run.id}
                                            onClick={() => {
                                                // Navigate to Leads view filtered by this search
                                                window.location.hash = `#leads?search=${encodeURIComponent(run.query)}`
                                            }}
                                            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-blue-300"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{run.query || 'Unknown Query'}</h3>
                                                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                                                        <span className="uppercase">{run.geo || 'Global'}</span>
                                                        <span>•</span>
                                                        <span>{new Date(run.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isRunning ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                                    isCompleted ? 'bg-green-100 text-green-700' :
                                                        'bg-red-50 text-red-700'
                                                    }`}>
                                                    {isRunning && <Loader2 size={12} className="animate-spin" />}
                                                    {status}
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                                                <div
                                                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' :
                                                        isRunning ? 'bg-blue-500' :
                                                            'bg-red-400'
                                                        }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 text-xs font-bold text-slate-400 uppercase">
                                                <span>Target: {totalLeads > 0 ? `${totalLeads}` : targetLimit} Leads</span>
                                                <span>{progressLabel}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
